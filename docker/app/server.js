const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const PORT = Number(process.env.PORT || 8080);
const DIST_DIR = path.join(__dirname, "dist");
const BASE_PATH = "/chyp";
const RUNTIME_CONFIG_PLACEHOLDER = "window.__CHYP_CONFIG__ = {};";
const COMPRESSIBLE_EXTENSIONS = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".map",
  ".svg",
  ".txt",
]);
const compressedResponseCache = new Map();

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
};

const IMMUTABLE_ASSET_RE =
  /\/assets\/.+-[A-Za-z0-9_-]{8,}(?:\.[^.]+)+$/;

const getContentType = (filepath) =>
  MIME_TYPES[path.extname(filepath).toLowerCase()] ||
  "application/octet-stream";

const getCacheControl = (requestPath) => {
  if (IMMUTABLE_ASSET_RE.test(requestPath)) {
    return "public, max-age=31536000, immutable";
  }

  if (requestPath.endsWith(".html") || requestPath === "/" || requestPath === "") {
    return "no-cache";
  }

  return "public, max-age=3600";
};

const getContentEncoding = (acceptEncoding = "") => {
  const accepted = new Map(
    acceptEncoding.split(",").map((entry) => {
      const [encoding, ...parameters] = entry.trim().toLowerCase().split(";");
      const qualityParameter = parameters.find((value) =>
        value.trim().startsWith("q=")
      );
      const quality = qualityParameter
        ? Number(qualityParameter.trim().slice(2))
        : 1;
      return [encoding, Number.isFinite(quality) ? quality : 0];
    })
  );
  const qualityFor = (encoding) =>
    accepted.has(encoding)
      ? accepted.get(encoding)
      : accepted.get("*") || 0;
  const brotliQuality = qualityFor("br");
  const gzipQuality = qualityFor("gzip");

  if (brotliQuality > 0 && brotliQuality >= gzipQuality) {
    return "br";
  }
  if (gzipQuality > 0) {
    return "gzip";
  }
  return null;
};

const compressResponse = (body, encoding, cacheKey, callback) => {
  const cached = compressedResponseCache.get(cacheKey);
  if (cached) {
    callback(null, cached);
    return;
  }

  const done = (err, compressedBody) => {
    if (!err) {
      compressedResponseCache.set(cacheKey, compressedBody);
    }
    callback(err, compressedBody);
  };

  if (encoding === "br") {
    zlib.brotliCompress(
      body,
      {
        params: {
          [zlib.constants.BROTLI_PARAM_QUALITY]: 5,
          [zlib.constants.BROTLI_PARAM_SIZE_HINT]: body.length,
        },
      },
      done
    );
    return;
  }

  zlib.gzip(body, { level: 6 }, done);
};

const normalizePath = (requestPath) => {
  if (requestPath === BASE_PATH || requestPath === `${BASE_PATH}/`) {
    return "/";
  }

  if (requestPath.startsWith(`${BASE_PATH}/`)) {
    return requestPath.slice(BASE_PATH.length);
  }

  return requestPath;
};

const getRuntimeConfigAssignment = () => {
  const tileUrl = (
    process.env.REACT_APP_BC_BASE_MAP_TILES_URL || ""
  ).trim();
  const config = tileUrl
    ? { REACT_APP_BC_BASE_MAP_TILES_URL: tileUrl }
    : {};

  const serializedConfig = JSON.stringify(config).replaceAll("<", "\\u003c");
  return `window.__CHYP_CONFIG__ = ${serializedConfig};`;
};

const sendFile = (req, res, filepath, requestPath) => {
  fs.readFile(filepath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not Found");
      return;
    }

    const responseBody = filepath.endsWith(".html")
      ? data
          .toString()
          .replace(RUNTIME_CONFIG_PLACEHOLDER, getRuntimeConfigAssignment())
      : data;

    const headers = {
      "Content-Type": getContentType(filepath),
      "Cache-Control": getCacheControl(requestPath),
    };
    const body = Buffer.isBuffer(responseBody)
      ? responseBody
      : Buffer.from(responseBody);
    const canCompress =
      body.length >= 1024 &&
      COMPRESSIBLE_EXTENSIONS.has(path.extname(filepath).toLowerCase());
    const encoding = canCompress
      ? getContentEncoding(req.headers["accept-encoding"])
      : null;

    if (canCompress) {
      headers.Vary = "Accept-Encoding";
    }

    if (!encoding) {
      res.writeHead(200, headers);
      res.end(body);
      return;
    }

    compressResponse(body, encoding, `${filepath}:${encoding}`, (error, compressedBody) => {
      if (error) {
        res.writeHead(200, headers);
        res.end(body);
        return;
      }

      res.writeHead(200, {
        ...headers,
        "Content-Encoding": encoding,
      });
      res.end(compressedBody);
    });
  });
};

http
  .createServer((req, res) => {
    if (!req.url) {
      res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Bad Request");
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const requestPath = normalizePath(decodeURIComponent(url.pathname));

    const safePath = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, "");

    let filepath = path.join(DIST_DIR, safePath);
    if (requestPath === "/" || requestPath === "") {
      filepath = path.join(DIST_DIR, "index.html");
    }

    fs.stat(filepath, (err, stat) => {
      if (!err && stat.isFile()) {
        sendFile(req, res, filepath, requestPath);
        return;
      }

      sendFile(req, res, path.join(DIST_DIR, "index.html"), "/");
    });
  })
  .listen(PORT, () => {
    console.log(`Serving dist on port ${PORT}`);
  });
