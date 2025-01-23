import { BCBaseMap } from "pcic-react-leaflet-components";
import { useRef } from "react";
import InteractionLayer from "./InteractionLayer.jsx";
import PointPlotter from "./PointPlotter.jsx";
import { baseStyles, interactionStyles } from "./styles.js";

const MapComponent = () => {
  const mapRef = useRef(null);

  return (
    <BCBaseMap
      style={{ height: "100vh", width: "100%" }}
      center={[55, -126]}
      zoom={6}
      ref={mapRef}
      zoomSnap={0.1}
      zoomDelta={0.1}
      wheelPxPerZoomLevel={60}
    >
      <InteractionLayer
        baseStyles={baseStyles}
        interactionStyles={interactionStyles}
      />
      <PointPlotter map={mapRef} />
    </BCBaseMap>
  );
};

export default MapComponent;
