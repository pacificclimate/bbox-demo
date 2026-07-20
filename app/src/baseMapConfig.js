import { BCBaseMap } from "pcic-react-leaflet-components";

const runtimeTileUrl =
  globalThis.__CHYP_CONFIG__?.REACT_APP_BC_BASE_MAP_TILES_URL?.trim();

export const baseMapTileUrl = runtimeTileUrl || BCBaseMap.tileset.url;

const upsertResourceHint = ({ id, rel, href, as, fetchPriority }) => {
  const link = document.getElementById(id) || document.createElement("link");

  link.id = id;
  link.rel = rel;
  link.href = href;
  if (as) {
    link.as = as;
  }
  if (fetchPriority) {
    link.fetchPriority = fetchPriority;
  }

  if (!link.isConnected) {
    document.head.appendChild(link);
  }
};

export const configureBaseMapResourceHints = () => {
  if (!baseMapTileUrl) {
    return;
  }

  try {
    upsertResourceHint({
      id: "base-map-preconnect",
      rel: "preconnect",
      href: new URL(baseMapTileUrl).origin,
    });
  } catch {
    // Leaflet will report an invalid tile URL when it tries to use it.
  }

  upsertResourceHint({
    id: "base-map-preload",
    rel: "preload",
    as: "image",
    fetchPriority: "high",
    href: baseMapTileUrl
      .replace("{z}", "6")
      .replace("{x}", "33")
      .replace("{y}", "29"),
  });
};

export { BCBaseMap };
