import { useState, useEffect, useRef, memo } from "react";
import { circleMarker } from "leaflet";
import L from "leaflet";
import proj4 from "proj4";
import { useMap } from "react-leaflet";
import "./PointPlotter.css";

const PointPlotter = () => {
  const [coords, setCoords] = useState({ x: "", y: "" });
  const [projType, setProjType] = useState("albers");
  const map = useMap();
  const currentMarkerRef = useRef(null);

  useEffect(() => {
    if (!map.getPane("markers")) {
      map.createPane("markers");
      map.getPane("markers").style.zIndex = 650;
      map.getPane("markers").style.pointerEvents = "none";
    }
  }, [map]);

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

  useEffect(() => {
    return () => {
      if (currentMarkerRef.current) {
        currentMarkerRef.current.remove();
      }
    };
  }, [map]);

  const convertToLatLng = (x, y) => {
    if (!x || !y) return null;
    try {
      if (projType === "wgs84") {
        return [parseFloat(y), parseFloat(x)];
      }
      const fromProj = projType === "albers" ? albersProj : mercatorProj;
      const [lon, lat] = proj4(fromProj, wgs84Proj, [
        parseFloat(x),
        parseFloat(y),
      ]);
      return [lat, lon];
    } catch (error) {
      console.error("Conversion error:", error);
      return null;
    }
  };

  const isWithinBounds = ([lat, lon]) => {
    return (
      lat >= BC_BOUNDS.latMin &&
      lat <= BC_BOUNDS.latMax &&
      lon >= BC_BOUNDS.lonMin &&
      lon <= BC_BOUNDS.lonMax
    );
  };

  const clearMarker = () => {
    if (currentMarkerRef.current) {
      currentMarkerRef.current.remove();
      currentMarkerRef.current = null;
    }
  };

  const plotPoint = (e) => {
    e.preventDefault();
    const coordinates = convertToLatLng(coords.x, coords.y);

    if (!coordinates) {
      alert("Invalid coordinates");
      return;
    }

    if (!isWithinBounds(coordinates)) {
      alert("Coordinates are outside the bounds of BC.");
      return;
    }

    requestAnimationFrame(() => {
      // Remove existing marker if any
      if (currentMarkerRef.current) {
        currentMarkerRef.current.remove();
      }

      // Create and add new marker
      currentMarkerRef.current = circleMarker(coordinates, {
        pane: "markers",
        radius: 8,
        fillColor: "#1b9e77",
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8,
        interactive: false,
      }).addTo(map);

      map.flyTo(coordinates, map.getZoom(), {
        duration: 1,
        noMoveStart: true,
      });
    });

    setCoords({ x: "", y: "" });
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
          onClick={clearMarker}
          style={{ marginLeft: "10px" }}
        >
          Clear Marker
        </button>
      </form>
    </div>
  );
};

export default memo(PointPlotter);
