import { useMapEvents } from "react-leaflet";
import { useState, useRef, useCallback, useEffect, memo, lazy, Suspense } from "react";
import PropTypes from "prop-types";
import L from "leaflet";
import "leaflet.vectorgrid";
import {
  fetchDownstreamNetwork,
  fetchUpstreamNetwork,
} from "../../services/streamNetApi.js";
import { downloadNetworkGeoJson } from "../../services/geoJsonApi.js";
import { interactiveCanvasTile } from "./vectorGridCanvasRenderer.js";

const DataSelectionTable = lazy(() => import("../data/DataSelectionTable.jsx"));

const makePopupLink = (label) => {
  const link = document.createElement("a");
  link.href = "#";
  link.textContent = label;
  link.style.display = "block";
  link.style.color = "blue";
  link.style.textDecoration = "underline";
  link.style.marginTop = "4px";
  return link;
};

const setPopupLinkUnavailable = (link, label) => {
  link.textContent = label;
  link.setAttribute("aria-disabled", "true");
  link.style.color = "#666";
  link.style.pointerEvents = "none";
};

const enableNetworkGeoJsonLink = ({
  link,
  selectedSubid,
  direction,
  subids,
  controllers,
}) => {
  link.textContent = `Download ${direction} GeoJSON (${subids.length})`;
  link.removeAttribute("aria-disabled");
  link.style.color = "blue";
  link.style.pointerEvents = "auto";

  link.addEventListener("click", async (event) => {
    event.preventDefault();
    if (link.dataset.downloading === "true") return;

    link.dataset.downloading = "true";
    link.textContent = `Preparing ${direction} GeoJSON...`;
    link.style.pointerEvents = "none";
    const controller = new AbortController();
    controllers.add(controller);

    try {
      await downloadNetworkGeoJson({
        selectedSubid,
        direction,
        signal: controller.signal,
      });
      link.textContent = `Download ${direction} GeoJSON (${subids.length})`;
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error(`Failed to download ${direction} GeoJSON:`, error);
        link.textContent = `Failed — retry ${direction} GeoJSON`;
      }
    } finally {
      controllers.delete(controller);
      delete link.dataset.downloading;
      link.style.pointerEvents = "auto";
    }
  });
};

const InteractionLayer = ({ baseStyles, interactionStyles }) => {
  const stateRef = useRef({
    hoverHighlight: null,
    currentPopup: null,
    isPopupOpen: false,
    clickedFeature: null,
    isDragging: false,
	upstreamFeatures: [],
	downstreamFeatures: [],
  });
  const vectorTileLayerRef = useRef(null);
  const mapRef = useRef(null);
  const popup = useRef(L.popup({ className: "custom-popup", autoPan: false }));

  const [showDataTable, setShowDataTable] = useState(false);
  const [selectedSubId, setSelectedSubId] = useState(null);
  const [networkSubids, setNetworkSubids] = useState({
    upstream: null,
    downstream: null,
  });

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
      if (stateRef.current.downstreamFeatures.includes(stateRef.current.hoverHighlight)) {
        vectorTileLayerRef.current.setFeatureStyle(
          stateRef.current.hoverHighlight, interactionStyles.highlight["downstream"]
        );
      }
      if (stateRef.current.upstreamFeatures.includes(stateRef.current.hoverHighlight)) {
        vectorTileLayerRef.current.setFeatureStyle(
          stateRef.current.hoverHighlight, interactionStyles.highlight["upstream"]
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
      stateRef.current.isDragging = true;
      clearHoverHighlight();
      updateCursor("grabbing");
    },
    dragend: () => {
      stateRef.current.isDragging = false;
      updateCursor("grab");
    },
  });

  useEffect(() => {
    mapRef.current = map;
  }, [map]);

  useEffect(() => {
    if (!mapRef.current) return;
    // Ensure a dedicated pane for interactive vector tiles, above base layers and FWA highlighting but below controls
    if (!mapRef.current.getPane("interactive")) {
      mapRef.current.createPane("interactive");
      const p = mapRef.current.getPane("interactive");
      p.style.zIndex = 600;
      p.style.pointerEvents = "auto";
    }
    const vectorTileLayer = L.vectorGrid.protobuf(
      `${window.location.origin}/bbox-server/xyz/water_tiles/{z}/{x}/{y}.mvt`,
      {
        rendererFactory: interactiveCanvasTile,
        vectorTileLayerStyles: baseStyles,
        maxNativeZoom: 13,
        interactive: true,
        // Increase the Canvas hit area without making stream lines thicker.
        tolerance: 5,
        getFeatureId: (feature) => feature.properties.uid,
        updateWhenIdle: true,
        updateWhenZooming: false,
        keepBuffer: 2,
        pane: "interactive", // Use the dedicated pane
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
      setNetworkSubids({ upstream: null, downstream: null });
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

      let networkGeoJsonLinks = null;
      const geoJsonDownloadControllers = new Set();
      try {
        const collection = layerType === "lakes" ? "lakes" : "rivers";
        const response = await fetch(
          `${window.location.origin}/bbox-server/collections/${collection}/items/${properties.subid}.json`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch GeoJSON: ${response.statusText}`);
        }

        const geoJson = await response.json();
        const blob = new Blob([JSON.stringify(geoJson, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);

        const popupContent = document.createElement("div");
        popupContent.style.maxWidth = "280px";
        popupContent.style.wordWrap = "break-word";

        const subidLabel = document.createElement("strong");
        subidLabel.textContent = "SubId:";
        popupContent.append(subidLabel, ` ${properties.subid}`);

        const selectedLink = makePopupLink("Download selected GeoJSON");
        selectedLink.href = url;
        selectedLink.download = `${properties.subid}.geojson`;
        popupContent.appendChild(selectedLink);

        const upstreamLink = makePopupLink("Loading upstream network...");
        const downstreamLink = makePopupLink("Loading downstream network...");
        setPopupLinkUnavailable(upstreamLink, "Loading upstream network...");
        setPopupLinkUnavailable(downstreamLink, "Loading downstream network...");
        popupContent.append(upstreamLink, downstreamLink);
        networkGeoJsonLinks = {
          upstream: upstreamLink,
          downstream: downstreamLink,
        };

        popup.current
          .setLatLng(event.latlng)
          .setContent(popupContent)
          .openOn(mapRef.current);
        stateRef.current.currentPopup = popup.current;

        popup.current.once("remove", () => {
          URL.revokeObjectURL(url);
          for (const controller of geoJsonDownloadControllers) {
            controller.abort();
          }
          geoJsonDownloadControllers.clear();
          if (stateRef.current.currentPopup === popup.current) {
            stateRef.current.currentPopup = null;
          }
        });
      } catch (error) {
        console.error("Error fetching GeoJSON:", error);
        popup.current
          .setLatLng(event.latlng)
          .setContent("<div style='color: red;'>Failed to fetch GeoJSON</div>")
          .openOn(mapRef.current);
      }

      // timing on highlighting upstream and downstream features is a little
      // tricky if the user selects a segment that is included in the 
      // previously-displayed upstream highlights. In this case,
      // clearing the "old" upstream highlights can accidentally clear some 
      // of the "new" downstream highlights if they have already been highlighted. 
      // Accordingly, both sets of features are cleared and highlighted in tandem.
      try {
        // fetch upstream and downstream features
        const [downstreamNetwork, upstreamNetwork] = await Promise.all([
          fetchDownstreamNetwork(properties.subid, properties.uid),
          fetchUpstreamNetwork(properties.subid, properties.uid),
        ]);

        // A second feature may have been clicked while these requests ran.
        if (stateRef.current.clickedFeature !== uid) return;

        // clear old highlighted upstream and downstream features
        if (stateRef.current.downstreamFeatures.length > 0 && vectorTileLayerRef.current) {
          for (const id of stateRef.current.downstreamFeatures) {
            if (id !== properties.uid) {
              vectorTileLayerRef.current.resetFeatureStyle(id);
            }
          }
        }
        if (stateRef.current.upstreamFeatures.length > 0 && vectorTileLayerRef.current) {
          for (const id of stateRef.current.upstreamFeatures) {
            if (id !== properties.uid) {
              vectorTileLayerRef.current.resetFeatureStyle(id);
            }
          }
        }

        // highlight new upstream and downstream features
        stateRef.current.downstreamFeatures = downstreamNetwork.uids;
        for (const uid of stateRef.current.downstreamFeatures) {
          vectorTileLayer.setFeatureStyle(uid, interactionStyles.highlight["downstream"]);
        }
        stateRef.current.upstreamFeatures = upstreamNetwork.uids;
        for (const uid of stateRef.current.upstreamFeatures) {
          vectorTileLayer.setFeatureStyle(uid, interactionStyles.highlight["upstream"]);
        }
        setNetworkSubids({
          upstream: upstreamNetwork.subids,
          downstream: downstreamNetwork.subids,
        });
        if (networkGeoJsonLinks) {
          enableNetworkGeoJsonLink({
            link: networkGeoJsonLinks.upstream,
            selectedSubid: properties.subid,
            direction: "upstream",
            subids: upstreamNetwork.subids,
            controllers: geoJsonDownloadControllers,
          });
          enableNetworkGeoJsonLink({
            link: networkGeoJsonLinks.downstream,
            selectedSubid: properties.subid,
            direction: "downstream",
            subids: downstreamNetwork.subids,
            controllers: geoJsonDownloadControllers,
          });
        }
      } catch (error) {
        console.error("Error fetching upstream and downstream features:", error);
        if (stateRef.current.clickedFeature === uid) {
          setNetworkSubids({ upstream: [], downstream: [] });
          if (networkGeoJsonLinks) {
            setPopupLinkUnavailable(
              networkGeoJsonLinks.upstream,
              "Upstream GeoJSON unavailable"
            );
            setPopupLinkUnavailable(
              networkGeoJsonLinks.downstream,
              "Downstream GeoJSON unavailable"
            );
          }
        }
      }
    };

    vectorTileLayer.on("mouseover", handleMouseOver);
    vectorTileLayer.on("mouseout", handleMouseOut);
    vectorTileLayer.on("click", handleClick);

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
        <Suspense fallback={null}>
          <DataSelectionTable
            featureId={selectedSubId}
            upstreamSubids={networkSubids.upstream}
            downstreamSubids={networkSubids.downstream}
            onClose={handleCloseDataTable}
          />
        </Suspense>
      )}
    </>
  );
};

InteractionLayer.propTypes = {
  baseStyles: PropTypes.object.isRequired,
  interactionStyles: PropTypes.object.isRequired,
};

export default memo(InteractionLayer);
