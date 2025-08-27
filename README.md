# Demo App for BCSRIF-P2

This project provides an interactive web portal for visualizing and downloading hydrological model data, including water temperature, streamflow, and oxygen concentration timeseries.

## Developing

Commands should be run from within the `app` folder.

- `npm install`: install packages from `/app/package.json`
- `npm run dev`: Start development server (runs on port 3000).
- `npm run build`: Generate production build.
- `npm run lint`: Format and lint code.
- `npm run preview`: Preview the production build locally.

> **Note:** WIP, currently need to reset the vite base path to `""` for local use.

- `npm run docker-build`: Build the Docker container for the app.
- `npm run docker-run`: Run the built Docker container (runs on port 3001).

## Key Features

### Interactive Map:

- Vector tiles used to display over 100k lakes and river segments across British Columbia
- Lakes and rivers shown in blue, highlighted in red when selected.
- Hover to dynamically highlight features.
- Selecting a feature open the **Data Download Panel** and provides a link to download the GeoJSON for the feature.

### BC Freshwater Atlas Lake & River Search

- Search for rivers and lakes by name (supports partial matches).
- Suggestions appear as you type; selecting one zooms the map to the feature and highlights it.

### Point Plotter:

- Input coordinates (BC Albers, WGS 84, Web Mercator) to plot reference points.
- Helps users orient themselves.

### Data Download Panel:

- Select Climate Model, Emissions Scenario, and Variables.
- Download timeseries data as CSV for analysis.

## Project Structure

app/\
├── src/\
│ ├── assets/ PCIC Logo\
│ ├── components/\
│ │ ├── data/ # # Data selection and download component\
│ │ ├── info/ # Help guide and logo components\
│ │ └── map/ # Map-related components (FwaNameSearch, InteractionLayer, PointPlotter, MapComponent)\
│ ├── services/ # API services and utilities\
│ ├── styles.js # Map styling configurations\
│ ├── App.jsx # Main application entry point\
│ └── main.jsx # React DOM rendering\
├── public/ # Static assets (Leaflet PNG files)\
└── vite.config.js # Vite configuration\
config\
  ├── bbox.template.toml\
  ├── BCAlbersCustomGrid.json\
  └── BCAlbersGrid.json\
docker\
  ├── app/ # Dockerfile for the app\
  ├── BBOX/ # Dockerfile and scripts for BBOX server\
  ├── data-import/ # Dockerfile and scripts for data import\
  └── PostGIS/ # Dockerfile and script for PostGIS database\

- **Local server:** Runs on [http://localhost:3000](http://localhost:3000)
- **Docker Container:** Runs on [http://localhost:3001](http://localhost:3001)

## Configuration

- **BBOX Server**: Configured via `bbox.template.toml`.
- **Environment Variables**: Managed using `vite-plugin-environment` in `vite.config.js`.

## Deployment

The project includes GitHub Actions workflows for Docker image publishing. Docker images for the app, data import, and BBOX server are automatically built and published upon branch pushes and tagged releases.

## API Integration

The app connects to the PCIC Hydromosaic API for:

- Listing available climate models, emissions scenarios, and variables
- Timeseries data downloads

BC Geographic Warehouse (BCGW) [Public Map Server](https://delivery.maps.gov.bc.ca/arcgis/rest/services/mpcm/bcgwpub/MapServer):

- Used for the Freshwater Atlas (FWA) lake and river search.
- Water feature names are locally indexed for fast autocomplete.
- On selection, the app queries the BCGW service for the feature’s geometry and attributes.

## Environment Variables

- `REACT_APP_BC_BASE_MAP_TILES_URL`: Base map tile URL (defaults to PCIC swarm server)

## Docker Images

The following images are published to Docker Hub:

- `pcic/bbox-demo-app`: Frontend application
- `pcic/bbox-demo-data-import`: Data import utilities
- `pcic/bbox-demo-postgis`: PostGIS database
- `pcic/bbox-demo-server`: BBOX tile server

## Requirements

- Modern web browser with WebGL support
- Node.js 22+ for development
- Docker for containerized deployment

## License

This project is licensed under the GNU General Public License v3.0.
