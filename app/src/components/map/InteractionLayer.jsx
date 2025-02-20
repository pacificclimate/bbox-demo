import { useMapEvents } from "react-leaflet";
import { useState, useRef, useCallback, useEffect, memo } from "react";
import PropTypes from "prop-types";
import L from "leaflet";
import "leaflet.vectorgrid";
import DataSelectionTable from "../data/DataSelectionTable.jsx";

const InteractionLayer = ({ baseStyles, interactionStyles }) => {
  const stateRef = useRef({
    hoverHighlight: null,
    currentPopup: null,
    isPopupOpen: false,
    clickedFeature: null,
    isDragging: false,
  });
  const vectorTileLayerRef = useRef(null);
  const mapRef = useRef(null);
  const popup = useRef(L.popup({ className: "custom-popup", autoPan: false }));

  const [showDataTable, setShowDataTable] = useState(false);
  const [selectedSubId, setSelectedSubId] = useState(null);

  const updateCursor = (() => {
    let lastCursor = null;
    return (cursor) => {
      if (cursor === lastCursor) return;
      lastCursor = cursor;
      const mapContainer = mapRef.current?.getContainer();
      if (mapContainer) {
        requestAnimationFrame(() => {
          mapContainer.style.cursor = cursor;
        });
      }
    };
  })();

  const clearHoverHighlight = useCallback(() => {
    if (stateRef.current.hoverHighlight && vectorTileLayerRef.current) {
      if (stateRef.current.hoverHighlight !== stateRef.current.clickedFeature) {
        vectorTileLayerRef.current.resetFeatureStyle(
          stateRef.current.hoverHighlight
        );
      }
      stateRef.current.hoverHighlight = null;
    }
  }, []);

  const getFeatureInfo = useCallback((event) => {
    const { properties } = event.layer;
    return {
      properties,
      uid: properties.uid,
      layerType: properties.islake ? "lakes" : "rivers",
    };
  }, []);

  // Map event handlers
  const map = useMapEvents({
    zoomstart: () => {
      clearHoverHighlight();
      updateCursor("grab");
    },
    movestart: () => {
      clearHoverHighlight();
      updateCursor("grab");
    },
    dragstart: () => {
      updateCursor("grabbing");
    },
    dragend: () => {
      updateCursor("grab");
    },
  });

  useEffect(() => {
    mapRef.current = map;
  }, [map]);

  useEffect(() => {
    if (!mapRef.current) return;

    const vectorTileLayer = L.vectorGrid.protobuf(
      "https://beehive.pacificclimate.org/bbox-server/xyz/water_tiles/{z}/{x}/{y}.mvt",
      {
        vectorTileLayerStyles: baseStyles,
        maxNativeZoom: 13,
        interactive: true,
        getFeatureId: (feature) => feature.properties.uid,
        updateWhenIdle: true,
        updateWhenZooming: true,
        keepBuffer: 1,
        preferCanvas: true,
        zIndex: 1,
      }
    );

    vectorTileLayerRef.current = vectorTileLayer;

    const handleMouseOver = (() => {
      let animationFrame = null;
      return (event) => {
        if (stateRef.current.isDragging) return;
        if (animationFrame) cancelAnimationFrame(animationFrame);

        animationFrame = requestAnimationFrame(() => {
          const { uid, layerType } = getFeatureInfo(event);

          if (stateRef.current.hoverHighlight === uid) {
            updateCursor("pointer");
            return;
          }

          clearHoverHighlight();
          stateRef.current.hoverHighlight = uid;

          if (uid !== stateRef.current.clickedFeature) {
            vectorTileLayer.setFeatureStyle(
              uid,
              interactionStyles.hover[layerType]
            );
          }
          updateCursor("pointer");
        });
      };
    })();

    const handleMouseOut = () => {
      if (stateRef.current.isDragging) return;
      clearHoverHighlight();
      updateCursor("grab");
    };

    const handleClick = async (event) => {
      if (stateRef.current.isDragging) return;

      const { uid, properties, layerType } = getFeatureInfo(event);
      setSelectedSubId(properties.subid);
      setShowDataTable(true);
      // Reset previous clicked feature if exists
      if (stateRef.current.clickedFeature && vectorTileLayerRef.current) {
        vectorTileLayerRef.current.resetFeatureStyle(
          stateRef.current.clickedFeature
        );
      }

      // Set new clicked feature
      stateRef.current.clickedFeature = uid;
      vectorTileLayer.setFeatureStyle(
        uid,
        interactionStyles.highlight[layerType]
      );

      if (stateRef.current.currentPopup) {
        mapRef.current.closePopup(stateRef.current.currentPopup);
      }

      try {
        const collection = layerType === "lakes" ? "lakes" : "rivers";
        const response = await fetch(
          `https://beehive.pacificclimate.org/bbox-server/collections/${collection}/items/${properties.subid}.json`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch GeoJSON: ${response.statusText}`);
        }

        const geoJson = await response.json();
        const blob = new Blob([JSON.stringify(geoJson, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);

        popup.current
          .setLatLng(event.latlng)
          .setContent(
            `
            <div style="max-width: 250px; word-wrap: break-word;">
              <strong>SubId:</strong> ${properties.subid} <br />
              <a href="${url}" download="${properties.subid}.geojson" style="color: blue; text-decoration: underline;">Download GeoJSON</a>
            </div>
          `
          )
          .openOn(mapRef.current);

        popup.current.on("remove", () => {
          URL.revokeObjectURL(url);
        });
      } catch (error) {
        console.error("Error fetching GeoJSON:", error);
        popup.current
          .setLatLng(event.latlng)
          .setContent("<div style='color: red;'>Failed to fetch GeoJSON</div>")
          .openOn(mapRef.current);
      }
    };

    const handleMouseDown = () => {
      stateRef.current.isDragging = true;
      updateCursor("grabbing");
    };

    const handleMouseUp = () => {
      stateRef.current.isDragging = false;
      updateCursor(stateRef.current.hoverHighlight ? "pointer" : "grab");
    };

    vectorTileLayer.on("mouseover", handleMouseOver);
    vectorTileLayer.on("mouseout", handleMouseOut);
    vectorTileLayer.on("click", handleClick);
    vectorTileLayer.on("mousedown", handleMouseDown);
    vectorTileLayer.on("mouseup", handleMouseUp);

    vectorTileLayer.addTo(mapRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.removeLayer(vectorTileLayer);
      }
    };
  }, [baseStyles, interactionStyles, getFeatureInfo, clearHoverHighlight]);

  const handleCloseDataTable = useCallback(() => {
    setShowDataTable(false);
    setSelectedSubId(null);

    // Reset clicked feature styling
    if (stateRef.current.clickedFeature && vectorTileLayerRef.current) {
      vectorTileLayerRef.current.resetFeatureStyle(
        stateRef.current.clickedFeature
      );
      stateRef.current.clickedFeature = null;
    }

    if (stateRef.current.currentPopup) {
      mapRef.current.closePopup(stateRef.current.currentPopup);
    }
  }, []);

  return (
    <>
      {null}
      {showDataTable && selectedSubId && (
        <DataSelectionTable
          featureId={selectedSubId}
          onClose={handleCloseDataTable}
        />
      )}
    </>
  );
};

InteractionLayer.propTypes = {
  baseStyles: PropTypes.object.isRequired,
  interactionStyles: PropTypes.object.isRequired,
};

export default memo(InteractionLayer);
