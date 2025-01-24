import { useState, useEffect, useRef, memo } from "react";
import L from "leaflet";
import proj4 from "proj4";
import { useMap } from "react-leaflet";

const PointPlotter = () => {
  const [coords, setCoords] = useState({ x: "", y: "" });
  const [projType, setProjType] = useState("albers");
  const markersRef = useRef([]);
  const map = useMap();

  const albersProj =
    "+proj=aea +lat_1=50 +lat_2=58.5 +lat_0=45 +lon_0=-126 +x_0=1000000 +y_0=0 +ellps=GRS80 +datum=NAD83 +units=m +no_defs";
  const mercatorProj = "EPSG:3857";
  const wgs84Proj = "EPSG:4326";

  const BC_BOUNDS = {
    latMin: 48,
    latMax: 60,
    lonMin: -140,
    lonMax: -114,
  };

  const convertToLatLng = (x, y) => {
    if (projType === "wgs84") {
      return [parseFloat(y), parseFloat(x)]; // WGS84 uses [latitude, longitude]
    }
    const fromProj = projType === "albers" ? albersProj : mercatorProj;
    const [lon, lat] = proj4(fromProj, wgs84Proj, [
      parseFloat(x),
      parseFloat(y),
    ]);
    return [lat, lon];
  };

  const isWithinBounds = ([lat, lon]) => {
    return (
      lat >= BC_BOUNDS.latMin &&
      lat <= BC_BOUNDS.latMax &&
      lon >= BC_BOUNDS.lonMin &&
      lon <= BC_BOUNDS.lonMax
    );
  };

  const markerGroup = useRef(L.layerGroup().addTo(map));

  const clearMarkers = () => {
    markerGroup.current.clearLayers();
  };

  const plotPoint = (e) => {
    e.preventDefault();
    try {
      const [lat, lng] = convertToLatLng(coords.x, coords.y);

      if (!isWithinBounds([lat, lng])) {
        alert("Coordinates are outside the bounds of BC.");
        return;
      }
      // clearMarkers(); May want to include this to remove previous markers

      const marker = L.marker([lat, lng]);
      markerGroup.current.addLayer(marker);
      map.setView([lat, lng], map.getZoom());
      setCoords({ x: "", y: "" });
    } catch (error) {
      console.error("Invalid coordinates:", error);
    }
  };

  return (
    <div className="point-plotter">
      <form onSubmit={plotPoint}>
        <input
          type="number"
          placeholder={projType === "wgs84" ? "Longitude" : "X Coordinate"}
          value={coords.x}
          onChange={(e) =>
            setCoords((prev) => ({ ...prev, x: e.target.value }))
          }
        />
        <input
          type="number"
          placeholder={projType === "wgs84" ? "Latitude" : "Y Coordinate"}
          value={coords.y}
          onChange={(e) =>
            setCoords((prev) => ({ ...prev, y: e.target.value }))
          }
        />
        <select value={projType} onChange={(e) => setProjType(e.target.value)}>
          <option value="albers">BC Albers</option>
          <option value="mercator">Web Mercator</option>
          <option value="wgs84">WGS84 (Latitude/Longitude)</option>
        </select>
        <button type="submit">Plot Point</button>
        <button
          type="button"
          onClick={clearMarkers}
          style={{ marginLeft: "10px" }}
        >
          Clear All Markers
        </button>
      </form>
    </div>
  );
};

export default memo(PointPlotter);
