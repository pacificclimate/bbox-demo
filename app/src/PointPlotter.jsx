import { useState, useEffect, useRef, memo } from "react";
import L from "leaflet";
import proj4 from "proj4";
import { useMap } from "react-leaflet";

// TODO: 
// - Add guard rails to ensure coordinates are within bounds of BC. 
// - Add a button to clear all markers.
// - Remove previous marker when a new one is added.
const PointPlotter = () => {
    const [coords, setCoords] = useState({ x: "", y: "" });
    const [projType, setProjType] = useState("albers");
    const markersRef = useRef([]);
    const map = useMap();

    const albersProj =
        "+proj=aea +lat_1=50 +lat_2=58.5 +lat_0=45 +lon_0=-126 +x_0=1000000 +y_0=0 +ellps=GRS80 +datum=NAD83 +units=m +no_defs";
    const mercatorProj = "EPSG:3857";
    const wgs84 = "EPSG:4326";

    const convertToLatLng = (x, y) => {
        const fromProj = projType === "albers" ? albersProj : mercatorProj;
        const [lon, lat] = proj4(fromProj, wgs84, [parseFloat(x), parseFloat(y)]);
        return [lat, lon];
    };

    const markerGroup = useRef(L.layerGroup().addTo(map));

    const plotPoint = (e) => {
        e.preventDefault();
        try {
            const [lat, lng] = convertToLatLng(coords.x, coords.y);
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
                    placeholder="X Coordinate"
                    value={coords.x}
                    onChange={(e) =>
                        setCoords((prev) => ({ ...prev, x: e.target.value }))
                    }
                />
                <input
                    type="number"
                    placeholder="Y Coordinate"
                    value={coords.y}
                    onChange={(e) =>
                        setCoords((prev) => ({ ...prev, y: e.target.value }))
                    }
                />
                <select
                    value={projType}
                    onChange={(e) => setProjType(e.target.value)}
                >
                    <option value="albers">BC Albers</option>
                    <option value="mercator">Web Mercator</option>
                </select>
                <button type="submit">Plot Point</button>
            </form>
        </div>
    );
};

export default memo(PointPlotter);
