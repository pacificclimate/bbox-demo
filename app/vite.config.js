import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import EnvironmentPlugin from "vite-plugin-environment";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),

    EnvironmentPlugin({
      REACT_APP_BC_BASE_MAP_TILES_URL:
        "https://swarm.pacificclimate.org/tiles/bc-albers-lite/{z}/{x}/{y}.png",
    }),
  ],
  base: "/vec-hydro-portal/",
  // Local Dev only
  server: {
    warmup: {
      clientFiles: [
        "src/styles.js",
        "src/MapComponent.jsx",
        "src/InteractionLayer.jsx",
        "src/PointPlotter.jsx",
      ],
    },
    port: 3000,
    host: true,
  },
});
