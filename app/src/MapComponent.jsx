import { BCBaseMap } from "pcic-react-leaflet-components";
import { useRef, useEffect } from "react";
import InteractionLayer from "./InteractionLayer.jsx";
import PointPlotter from "./PointPlotter.jsx";
import { baseStyles, interactionStyles } from "./styles.js";

const MapComponent = () => {
  const mapRef = useRef(null);

  // Center point for British Columbia
  const center = [55, -126];

  const maxBounds = [
    [20, -170],
    [75, -50],
  ];
  const maxZoomLevel = 13;
  const minZoomLevel = 5;

  useEffect(() => {
    if (mapRef.current) {
      const map = mapRef.current.leafletElement;
      if (map) {
        // Apply hardware acceleration
        const container = map.getContainer();
        container.style.willChange = "transform";
      }
    }
  }, []);

  return (
    <BCBaseMap
      style={{
        height: "100vh",
        width: "100%",
        transform: "translate3d(0, 0, 0)",
      }}
      center={center}
      zoom={6}
      minZoom={minZoomLevel}
      maxZoom={maxZoomLevel}
      maxNativeZoom={maxZoomLevel}
      ref={mapRef}
      noWrap={true}
      // Smoother zoom
      detectRetina={true}
      zoomSnap={0.5}
      zoomDelta={0.5}
      wheelPxPerZoomLevel={150}
      // Performance
      preferCanvas={true}
      keepBuffer={8}
      updateWhenZooming={false}
      updateWhenIdle={true}
      // Bounds
      maxBounds={maxBounds}
      maxBoundsViscosity={0.01}
      // Animation
      fadeAnimation={true}
      zoomAnimation={true}
      zoomAnimationThreshold={4}
      markerZoomAnimation={true}
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
