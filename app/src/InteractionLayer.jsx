import { useMapEvents } from "react-leaflet";
import { useRef, useCallback, useEffect, memo } from "react";
import PropTypes from "prop-types";
import L from "leaflet";
import "leaflet.vectorgrid";

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

    const resetCursor = useCallback(() => {
        if (mapRef.current) mapRef.current.getContainer().style.cursor = "";
    }, []);

    const clearHoverHighlight = useCallback(() => {
        if (stateRef.current.hoverHighlight && vectorTileLayerRef.current) {
            if (stateRef.current.hoverHighlight !== stateRef.current.clickedFeature) {
                vectorTileLayerRef.current.resetFeatureStyle(stateRef.current.hoverHighlight);
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

    const map = useMapEvents({
        zoomstart: () => {
            clearHoverHighlight();
            resetCursor();
        },
        movestart: () => {
            clearHoverHighlight();
            resetCursor();
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
            }
        );

        vectorTileLayerRef.current = vectorTileLayer;

        const handleMouseOver = (event) => {
            if (stateRef.current.isDragging) return;
            const { uid, layerType } = getFeatureInfo(event);

            if (stateRef.current.hoverHighlight === uid) {
                mapRef.current.getContainer().style.cursor = "pointer";
                return;
            }

            clearHoverHighlight();
            stateRef.current.hoverHighlight = uid;

            if (uid !== stateRef.current.clickedFeature) {
                vectorTileLayer.setFeatureStyle(uid, interactionStyles.hover[layerType]);
            }
            mapRef.current.getContainer().style.cursor = "pointer";
        };

        const handleMouseOut = () => {
            if (stateRef.current.isDragging) return;
            clearHoverHighlight();
            resetCursor();
        };

        const handleClick = (event) => {
            if (stateRef.current.isDragging) return;
            const { uid, properties, layerType } = getFeatureInfo(event);

            // Reset previous clicked feature if exists
            if (stateRef.current.clickedFeature && vectorTileLayerRef.current) {
                vectorTileLayerRef.current.resetFeatureStyle(stateRef.current.clickedFeature);
            }

            // Set new clicked feature
            stateRef.current.clickedFeature = uid;
            vectorTileLayer.setFeatureStyle(uid, interactionStyles.highlight[layerType]);

            if (stateRef.current.currentPopup) {
                mapRef.current.closePopup(stateRef.current.currentPopup);
            }

            const popup = L.popup()
                .setLatLng(event.latlng)
                .setContent(`<strong>SubId:</strong> ${properties.subid}`)
                .openOn(mapRef.current);

            popup.on("add", () => {
                stateRef.current.isPopupOpen = true;
                resetCursor();
            });

            popup.on("remove", () => {
                stateRef.current.isPopupOpen = false;
                resetCursor();
            });

            stateRef.current.currentPopup = popup;
        };

        // Handle drag start and end
        const handleMouseDown = () => {
            stateRef.current.isDragging = true;
        };

        const handleMouseUp = () => {
            stateRef.current.isDragging = false;
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

    return null;
};

InteractionLayer.propTypes = {
    baseStyles: PropTypes.object.isRequired,
    interactionStyles: PropTypes.object.isRequired,
};

export default memo(InteractionLayer);
