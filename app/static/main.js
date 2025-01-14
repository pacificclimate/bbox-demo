// Compatibility fix for newer Leaflet versions
L.DomEvent.fakeStop = L.DomEvent.fakeStop || function (e) {
    if (e.preventDefault) { e.preventDefault(); }
    if (e.stopPropagation) { e.stopPropagation(); }
    if (e.stop) { e.stop(); }
    return this;
};

const map = L.map('map', {

    //     crs: new L.Proj.CRS(
    //         'EPSG:3005',
    //         '+proj=aea +lat_1=50 +lat_2=58.5 +lat_0=45 +lon_0=-126 +x_0=1000000 +y_0=0 +datum=NAD83 +units=m +no_defs',
    //         {
    //             resolutions: [
    //                 21262.44140625, 10631.220703125, 5315.6103515625, 2657.80517578125,
    //                 1328.902587890625, 664.4512939453125, 332.22564697265625,
    //                 166.11282348632812, 83.05641174316406, 41.52820587158203,
    //                 20.764102935791016, 10.382051467895508, 5.191025733947754,
    //                 2.595512866973877, 1.2977564334869385, 0.6488782167434692,
    //                 0.3244391083717346, 0.1622195541858673, 0.08110977709293365,
    //                 0.04055488854646683, 0.020277444273233417, 0.010138722136616709,
    //                 0.005069361068308353, 0.0025346805341541767, 0.0012673402670770884
    //             ],
    //             origin: [217522.0, 4543560.0]
    //         }
    //     ),
    //     center: [53, -123],
    //     zoom: 6
    // });
    crs: new L.Proj.CRS(
        'EPSG:3005',
        '+proj=aea +lat_1=50 +lat_2=58.5 +lat_0=45 +lon_0=-126 +x_0=1000000 +y_0=0 +ellps=GRS80 +datum=NAD83 +units=m +no_defs',
        {
            resolutions: [
                78271.51696402048, // Level 0
                39135.75848201024, // Level 1
                19567.87924100512, // Level 2
                9783.93962050256,  // Level 3
                4891.96981025128,  // Level 4
                2445.98490512564,  // Level 5
                1222.99245256282,  // Level 6
                611.49622628141,   // Level 7
                305.748113140705,  // Level 8
                152.8740565703525, // Level 9
                76.43702828517625, // Level 10
                38.21851414258813, // Level 11
                19.10925707129406, // Level 12
                9.55462853564703   // Level 13
            ],
            origin: [-20037508, 20037508]
        }
    ),
    minZoom: 0,
    maxZoom: 13,
    center: [-17, 92],
    zoom: 6,
    updateWhenZooming: true,
    zoomSnap: .1,
    zoomDelta: .1,
    Attribution: '&copy; <a href="http://openstreetmap.org/copyright">OpenStreetMap</a> contributors',
});

// Layer Styles
const baseStyles = {
    rivers: {
        weight: 1,
        color: '#0077bb',
        opacity: 0.8
    },
    lakes: {
        weight: 1,
        color: '#0077FF',
        fillColor: '#0077FF',
        fillOpacity: 0.3,
        fill: true
    }
};

const interactionStyles = {
    hover: {
        lakes: {
            weight: 6,
            fillOpacity: 0.7,
            fill: true
        },
        rivers: {
            weight: 6,
            opacity: 1
        }
    },
    highlight: {
        lakes: {
            weight: 4,
            color: 'red',
            fillColor: 'red',
            fillOpacity: 0.7,
            fill: true
        },
        rivers: {
            weight: 4,
            color: 'red',
            opacity: 1
        }
    }
};

const state = {
    hoverHighlight: null,
    highlight: null,
    highlightProperties: null,
    highlightCleanupTimeout: null,
    currentPopup: null,
    isPopupOpen: false
};

const tileLayer = L.tileLayer('https://services.pacificclimate.org/tiles/bc-albers-lite/{z}/{x}/{y}.png', {
    Attribution: '&copy; <a href="http://openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

const vectorTileLayer = L.vectorGrid.protobuf(
    'https://beehive.pacificclimate.org/bbox-server/xyz/water_tiles/{z}/{x}/{y}.mvt',
    {
        vectorTileLayerStyles: baseStyles,
        maxNativeZoom: 20,
        interactive: true,
        getFeatureId: (feature) => feature.properties.uid,
    }
).addTo(map);

// Helpers
const getFeatureInfo = (event) => {
    const { properties } = event.layer;
    return {
        properties,
        uid: properties.uid,
        layerType: properties.islake ? 'lakes' : 'rivers'
    };
};

const clearHoverHighlight = () => {
    if (state.hoverHighlight) {
        vectorTileLayer.resetFeatureStyle(state.hoverHighlight);
        state.hoverHighlight = null;
    }
};

const clearHighlight = () => {
    if (state.highlight) {
        vectorTileLayer.resetFeatureStyle(state.highlight);
        state.highlight = null;
        state.highlightProperties = null;
    }
};

const resetCursor = () => {
    map.getContainer().style.cursor = '';
};

// Event handlers
vectorTileLayer.on('mouseover', (event) => {
    if (state.isPopupOpen) return;

    const { uid, layerType } = getFeatureInfo(event);

    if (state.highlight === uid) {
        map.getContainer().style.cursor = 'pointer';
        return;
    }

    if (state.hoverHighlight === uid) return;

    state.hoverHighlight = uid;
    vectorTileLayer.setFeatureStyle(uid, interactionStyles.hover[layerType]);
    map.getContainer().style.cursor = 'pointer';
});

vectorTileLayer.on('mouseout', (event) => {
    if (state.isPopupOpen) return;

    const { uid } = getFeatureInfo(event);

    if (state.hoverHighlight === uid && state.highlight !== uid) {
        clearHoverHighlight();
        resetCursor();
    }
});

vectorTileLayer.on('click', (event) => {
    const { uid, properties, layerType } = getFeatureInfo(event);
    map.setView(event.latlng, map.getZoom());

    clearHoverHighlight();
    clearHighlight();

    if (state.currentPopup) {
        map.closePopup(state.currentPopup);
    }

    state.highlight = uid;
    state.highlightProperties = properties;
    vectorTileLayer.setFeatureStyle(uid, interactionStyles.highlight[layerType]);

    state.currentPopup = L.popup()
        .setLatLng(event.latlng)
        .setContent(`<strong>SubId:</strong> ${properties.subid}`)
        .openOn(map);

    // Popup-specific event handlers
    state.currentPopup.on('add', () => {
        state.isPopupOpen = true;
        resetCursor();
    });

    state.currentPopup.on('remove', () => {
        state.isPopupOpen = false;
        resetCursor();
    });
});

map.on('zoomstart movestart', () => {
    clearHoverHighlight();
    resetCursor();
    if (state.highlightCleanupTimeout) {
        clearTimeout(state.highlightCleanupTimeout);
    }
});

map.on('zoomend moveend', () => {
    if (state.highlight && state.highlightProperties) {
        state.highlightCleanupTimeout = setTimeout(() => {
            const layerType = state.highlightProperties.islake ? 'lakes' : 'rivers';
            vectorTileLayer.setFeatureStyle(state.highlight, interactionStyles.highlight[layerType]);
        }, 100);
    }
});

map.on('popupclose', () => {
    state.isPopupOpen = false;
    resetCursor();
});