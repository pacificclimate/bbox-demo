import { BCBaseMap, baseMapTileUrl } from "../../baseMapConfig.js";
import { useRef, useEffect, lazy, Suspense } from "react";
import InteractionLayer from "./InteractionLayer.jsx";
import LogoBox from "../info/LogoBox.jsx";
import FwaNameSearch from "./FwaNameSearch.jsx";
import { baseStyles, interactionStyles, fwaStyles } from "../../styles.js";

const PointPlotter = lazy(() => import("./PointPlotter.jsx"));
const HelpGuide = lazy(() => import("../info/HelpGuide.jsx"));

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
      baseMapTilesUrl={baseMapTileUrl}
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
      maxBoundsViscosity={0}
      // Animation
      fadeAnimation={true}
      zoomAnimation={true}
      zoomAnimationThreshold={4}
      markerZoomAnimation={true}
    >
      <LogoBox projectName="Channel-Scale Hydrologic Model Output Portal" />
      <Suspense fallback={null}>
        <HelpGuide />
      </Suspense>
      <InteractionLayer
        baseStyles={baseStyles}
        interactionStyles={interactionStyles}
      />
      <Suspense fallback={null}>
        <PointPlotter map={mapRef} />
      </Suspense>
      <FwaNameSearch fwaStyles={fwaStyles} />
    </BCBaseMap>
  );
};

export default MapComponent;
