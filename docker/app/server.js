const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const PORT = Number(process.env.PORT || 8080);
const DIST_DIR = path.join(__dirname, "dist");
const BASE_PATH = "/chyp";
const RUNTIME_CONFIG_PATH = "/runtime-config.js";

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

const IMMUTABLE_ASSET_RE = /\/assets\/.+-[A-Za-z0-9_-]{8,}\.[^.]+$/;

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

const normalizePath = (requestPath) => {
  if (requestPath === BASE_PATH || requestPath === `${BASE_PATH}/`) {
    return "/";
  }

  if (requestPath.startsWith(`${BASE_PATH}/`)) {
    return requestPath.slice(BASE_PATH.length);
  }

  return requestPath;
};

const sendRuntimeConfig = (res) => {
  const tileUrl = (
    process.env.REACT_APP_BC_BASE_MAP_TILES_URL || ""
  ).trim();
  const config = tileUrl
    ? { REACT_APP_BC_BASE_MAP_TILES_URL: tileUrl }
    : {};

  res.writeHead(200, {
    "Content-Type": "text/javascript; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(`window.__CHYP_CONFIG__ = ${JSON.stringify(config)};\n`);
};

const sendFile = (res, filepath, requestPath) => {
  fs.readFile(filepath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not Found");
      return;
    }

    res.writeHead(200, {
      "Content-Type": getContentType(filepath),
      "Cache-Control": getCacheControl(requestPath),
    });
    res.end(data);
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

    if (requestPath === RUNTIME_CONFIG_PATH) {
      sendRuntimeConfig(res);
      return;
    }

    const safePath = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, "");

    let filepath = path.join(DIST_DIR, safePath);
    if (requestPath === "/" || requestPath === "") {
      filepath = path.join(DIST_DIR, "index.html");
    }

    fs.stat(filepath, (err, stat) => {
      if (!err && stat.isFile()) {
        sendFile(res, filepath, requestPath);
        return;
      }

      sendFile(res, path.join(DIST_DIR, "index.html"), "/");
    });
  })
  .listen(PORT, () => {
    console.log(`Serving dist on port ${PORT}`);
  });
