import { useEffect, useMemo, useRef, useState } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "./FwaNameSearch.css";

const RIVERS_URL =
  "https://delivery.maps.gov.bc.ca/arcgis/rest/services/mpcm/bcgwpub/MapServer/56/query";
const LAKES_URL =
  "https://delivery.maps.gov.bc.ca/arcgis/rest/services/mpcm/bcgwpub/MapServer/226/query";
const MAX_SUGGESTIONS = 15;
const PAGE = 1000;

const normalize = (str) =>
  str
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // accent-insensitive https://www.unicode.org/charts/PDF/U0300.pdf
    .toUpperCase()
    .trim() || "";
const scaledWeight = (base, z, baseZoom = 6, factor = 1.12) =>
  Math.max(1, Math.round(base * Math.pow(factor, (z ?? baseZoom) - baseZoom)));
const numlist = (keys) =>
  keys
    .map((k) => Number(k))
    .filter(Number.isFinite)
    .join(",");

const buildParams = (where, fields, geometry = true, count = 200, offset = 0) =>
  new URLSearchParams({
    f: geometry ? "geojson" : "json",
    where,
    returnGeometry: String(geometry),
    outFields: fields || "*",
    outSR: "4326",
    geometryPrecision: "5",
    cacheHint: "true",
    resultRecordCount: String(count),
    ...(offset && { resultOffset: String(offset) }),
  });

const fetchData = async (url, params, signal) => {
  const resp = await fetch(`${url}?${params}`, { signal });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
};

const fetchWithPaging = async (url, where, fields, signal) => {
  let offset = 0,
    all = [];
  while (true) {
    const fc = await fetchData(
      url,
      buildParams(where, fields, true, PAGE, offset),
      signal
    );
    const batch = fc.features || [];
    all.push(...batch);
    if (batch.length < PAGE) break;
    offset += PAGE;
  }
  return { type: "FeatureCollection", features: all };
};

const fetchRiversByKeys = (keys, signal) =>
  fetchWithPaging(
    RIVERS_URL,
    `BLUE_LINE_KEY IN (${numlist(keys)})`,
    "GNIS_NAME,BLUE_LINE_KEY,WATERSHED_GROUP_CODE",
    signal
  );

const fetchLakesByKeys = (keys, signal) =>
  fetchData(
    LAKES_URL,
    buildParams(
      `WATERBODY_KEY IN (${numlist(keys)})`,
      "GNIS_NAME_1,WATERBODY_KEY,WATERSHED_GROUP_CODE",
      true,
      keys.length
    ),
    signal
  );

const fetchMeta = async (url, keys, keyField, fields, signal) => {
  if (!keys?.length) return [];
  const data = await fetchData(
    url,
    buildParams(
      `${keyField} IN (${numlist(keys)})`,
      fields,
      false,
      keys.length
    ),
    signal
  );
  return (data.features || []).map((f) => f.attributes || {});
};

const fetchRiverMeta = (keys, signal) =>
  fetchMeta(
    RIVERS_URL,
    keys,
    "BLUE_LINE_KEY",
    "BLUE_LINE_KEY,WATERSHED_GROUP_CODE,GNIS_NAME",
    signal
  );
const fetchLakeMeta = (keys, signal) =>
  fetchMeta(
    LAKES_URL,
    keys,
    "WATERBODY_KEY",
    "WATERBODY_KEY,WATERSHED_GROUP_CODE,AREA_HA,GNIS_NAME_1",
    signal
  );

const loadIndex = async () => {
  const resp = await fetch(`/vec-hydro-portal/fwa_index.json`);
  if (!resp.ok) throw new Error("Index load failed");
  return resp.json();
};

const ensureUnderlayPane = (map) => {
  if (!map.getPane("fwa-underlay")) {
    const pane = map.createPane("fwa-underlay");
    pane.style.zIndex = 300;
    pane.style.pointerEvents = "none";
  }
};

export default function FwaNameSearch({ onPickedFeature, fwaStyles }) {
  const map = useMap();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState([]);
  const [index, setIndex] = useState(null);
  const [openGroup, setOpenGroup] = useState(null);
  const [keyMeta, setKeyMeta] = useState({});

  const underlayRef = useRef(null);
  const underlayRendererRef = useRef(null);
  const abortRef = useRef(null);
  const activeKindRef = useRef(null);

  useEffect(() => {
    loadIndex().then(setIndex).catch(console.error);
  }, []);

  useEffect(() => {
    ensureUnderlayPane(map);
    if (!underlayRendererRef.current) {
      underlayRendererRef.current = L.canvas({ pane: "fwa-underlay" }).addTo(
        map
      );
    }
  }, [map]);

  // Cleanup on unmount
  useEffect(
    () => () => {
      abortRef.current?.abort();
      underlayRef.current?.remove();
      if (underlayRendererRef.current) {
        map.removeLayer(underlayRendererRef.current);
        underlayRendererRef.current = null;
      }
    },
    [map]
  );

  const clearUnderlay = () => {
    underlayRef.current?.remove();
    underlayRef.current = null;
  };

  const fitTo = () => {
    if (!underlayRef.current) return;
    const bounds = underlayRef.current.getBounds();
    if (bounds.isValid()) map.fitBounds(bounds, { maxZoom: 12 });
  };

  const drawUnderlay = (geojson, style) => {
    clearUnderlay();
    underlayRef.current = L.geoJSON(geojson, {
      pane: "fwa-underlay",
      renderer: underlayRendererRef.current,
      style,
      interactive: false,
      bubblingMouseEvents: false,
    }).addTo(map);
    fitTo();
  };

  useEffect(() => {
    const onZoom = () => {
      if (!underlayRef.current) return;
      const kind = activeKindRef.current || "rivers";
      const baseStyle = fwaStyles?.halo?.[kind];
      if (baseStyle?.weight) {
        underlayRef.current.setStyle({
          weight: scaledWeight(baseStyle.weight, map.getZoom?.() ?? 6),
        });
      }
    };
    map.on("zoomend", onZoom);
    return () => map.off("zoomend", onZoom);
  }, [map, fwaStyles]);

  // Client-side prefix search
  const search = useMemo(() => {
    let timeout;
    return (val) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const term = normalize(val);
        if (!term || term.length < 2 || !index) {
          setResults([]);
          setOpenGroup(null);
          return;
        }
        const matches = [];
        const seen = new Set();
        const pushUnique = (arr, item) => {
          const k = item.layer + ":" + item.name;
          if (!seen.has(k)) {
            seen.add(k);
            arr.push(item);
          }
        };

        // maps names → BLUE_LINE_KEY[]
        for (const [name, keys] of index.streams) {
          if (name.startsWith(term))
            pushUnique(matches, { layer: "rivers", name, keys });
        }
        for (const [name, keys] of index.lakes) {
          if (name.startsWith(term))
            pushUnique(matches, { layer: "lakes", name, keys });
        }
        setResults(matches.slice(0, MAX_SUGGESTIONS));
        setOpenGroup(null);
      }, 120); //120ms debounce
    };
  }, [index]);

  const onToggleGroup = async (row) => {
    const nameKey = `${row.layer}:${row.name}`;
    if (openGroup === nameKey) {
      setOpenGroup(null);
      return;
    }
    setOpenGroup(nameKey);

    if (!keyMeta[nameKey]) {
      abortRef.current?.abort(); // abort any in-flight requests
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const meta =
          row.layer === "rivers"
            ? await fetchRiverMeta(row.keys, controller.signal)
            : await fetchLakeMeta(row.keys, controller.signal);
        setKeyMeta((m) => ({ ...m, [nameKey]: meta }));
      } catch (e) {
        if (e.name !== "AbortError") console.error(e);
        setKeyMeta((m) => ({ ...m, [nameKey]: [] }));
      }
    }
  };

  const onPickKey = async (layerKind, key) => {
    setBusy(true);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      activeKindRef.current = layerKind;
      const baseStyle =
        fwaStyles?.halo?.[layerKind === "rivers" ? "rivers" : "lakes"];
      const z = map.getZoom?.() ?? 6;
      const weight = baseStyle?.weight ? scaledWeight(baseStyle.weight, z) : 6;

      const fc =
        layerKind === "rivers"
          ? await fetchRiversByKeys([key], controller.signal)
          : await fetchLakesByKeys([key], controller.signal);

      if (!fc?.features?.length) return;

      const style = {
        ...baseStyle,
        weight,
      };

      drawUnderlay(fc, style);
      onPickedFeature?.({ layer: layerKind, key, feature: fc });
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  const onQuickPickRow = (row) => {
    row.keys.length === 1
      ? onPickKey(row.layer, row.keys[0])
      : onToggleGroup(row);
  };

  return (
    <div className="fwa-search">
      <div className="fwa-input-wrap">
        <input
          placeholder="Search river/lake name…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            search(e.target.value);
          }}
          aria-autocomplete="list"
          aria-expanded={!!results.length}
          aria-controls="fwa-results"
        />
        {busy && <span className="fwa-spinner" aria-label="Loading" />}

        {!!results.length && (
          <ul id="fwa-results" className="results">
            {results.map((r) => {
              const nameKey = `${r.layer}:${r.name}`;
              const metas = keyMeta[nameKey] || [];
              const hasMany = r.keys.length > 1;
              const singleKeyLabel =
                r.layer === "rivers" ? `BLK ${r.keys[0]}` : `WBK ${r.keys[0]}`;

              return (
                <li key={nameKey}>
                  <div className="result-row" onClick={() => onQuickPickRow(r)}>
                    <span className="result-name">{r.name}</span>
                    <small className="result-meta">
                      {hasMany ? `${r.keys.length} matches` : singleKeyLabel}
                    </small>
                  </div>

                  {hasMany && openGroup === nameKey && (
                    <ul className="result-sublist">
                      {(metas.length
                        ? metas
                        : r.keys.map((k) =>
                            r.layer === "rivers"
                              ? { BLUE_LINE_KEY: k }
                              : { WATERBODY_KEY: k }
                          )
                      ).map((m) => {
                        const id =
                          r.layer === "rivers"
                            ? m.BLUE_LINE_KEY
                            : m.WATERBODY_KEY;
                        const areaHa =
                          typeof m.AREA_HA === "number"
                            ? m.AREA_HA.toFixed(1)
                            : typeof m.FEATURE_AREA_SQM === "number"
                            ? (m.FEATURE_AREA_SQM / 10000).toFixed(1)
                            : null;

                        return (
                          <li
                            key={`${r.layer}-${id}`}
                            className="result-subitem"
                            onClick={() => onPickKey(r.layer, id)}
                          >
                            <strong>
                              {r.layer === "rivers" ? `BLK ${id}` : `WBK ${id}`}
                            </strong>
                            <small className="result-submeta">
                              {m.WATERSHED_GROUP_CODE
                                ? ` · WG ${m.WATERSHED_GROUP_CODE}`
                                : ""}
                              {areaHa ? ` · ${areaHa} ha` : ""}
                            </small>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
