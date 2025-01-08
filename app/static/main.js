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
    center: [953827.1575, 1103631.1543],
    zoom: 6,
});
const tileLayer = L.tileLayer('https://services.pacificclimate.org/tiles/bc-albers-lite/{z}/{x}/{y}.png', {
    attribution: '&copy; Your Attribution',
});
tileLayer.addTo(map);

const vectorTileLayer = L.vectorGrid.protobuf(
    'http://localhost:6767/xyz/water_tiles/{z}/{x}/{y}.mvt',
    {
        vectorTileLayerStyles: {
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
        },
        maxNativeZoom: 20,
        interactive: true,
        getFeatureId: (feature) => {
            const layerName = feature.properties.hasOwnProperty('hylak_id') ? 'lakes' : 'rivers';

            return feature.properties.unique_fid;
        }
    }
);

let highlight = null;

const clearHighlight = function () {
    if (highlight) {
        console.log(`Clearing highlight for: ${highlight}`);
        vectorTileLayer.resetFeatureStyle(highlight);
    }
    highlight = null;
};

const getHighlightStyle = function (layerName) {
    if (layerName === 'lakes') {
        console.log("Styling lakes...");
        return {
            weight: 2,
            color: 'red',
            fillColor: 'red',
            fillOpacity: 0.7,
            fill: true
        };
    }
    return {
        weight: 2,
        color: 'red',
        opacity: 1
    };
};

vectorTileLayer.on('mouseover', (event) => {
    const layerId = event.layer.properties.id;
    vectorTileLayer.setFeatureStyle(layerId, {
        weight: 5, // Temporarily increase the width
        color: 'red'
    });
});

// Revert to default on mouseout
vectorTileLayer.on('mouseout', (event) => {
    const layerId = event.layer.properties.id;
    vectorTileLayer.resetFeatureStyle(layerId);
});

vectorTileLayer.on('click', (event) => {
    const properties = event.layer.properties;
    console.log('Clicked Feature Properties:', properties);
    L.popup()
        .setLatLng(event.latlng)
        .setContent(`<strong>SubId:</strong> ${properties.subid}`)
        .openOn(map);
    // Clear previous highlight
    clearHighlight();

    // Use `unique_fid` for the highlight
    highlight = properties.unique_fid;
    console.log(`Setting highlight for: ${highlight}`);

    // Apply the style
    vectorTileLayer.setFeatureStyle(highlight, getHighlightStyle(properties.unique_fid.split('_')[0]));
});



vectorTileLayer.addTo(map);

// map.on('click', clearHighlight);