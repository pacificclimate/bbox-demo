import { useState, useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import "./HelpGuide.css";

const HelpGuide = () => {
  const [isOpen, setIsOpen] = useState(false);
  const map = useMap();
  const contentRef = useRef(null);

  // Toggle map scroll-zoom while the guide is open
  useEffect(() => {
    if (!map) return;
    if (isOpen) {
      map.scrollWheelZoom.disable();
    } else {
      map.scrollWheelZoom.enable();
    }
  }, [isOpen, map]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);
  const stopScroll = (e) => e.stopPropagation();

  return (
    <>
      <button
        className="help-trigger"
        onClick={() => setIsOpen(true)}
        aria-label="Open Help Guide"
      >
        <span className="question-mark">?</span>
      </button>

      {isOpen && (
        <div
          className="help-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false); // Outside click: close
          }}
        >
          <div
            className="help-content"
            ref={contentRef}
            onWheel={stopScroll}
            onTouchMove={stopScroll}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="close-button" onClick={() => setIsOpen(false)}>
              ✕
            </button>

            <h2>User Guide</h2>

            <section>
              <h3>Map Navigation</h3>
              <ul>
                <li>Click and drag to pan the map</li>
                <li>Use scroll wheel or zoom control buttons to zoom in/out</li>
                <li>Hover over water features to highlight them</li>
                <li>Click on a lake or river segment to select it</li>
              </ul>
            </section>

            <section>
              <h3>Point Plotting</h3>
              <ul>
                <li>Use the bottom-left panel to plot reference points</li>
                <li>
                  Choose coordinate system:
                  <ul>
                    <li>BC Albers (meters)</li>
                    <li>Web Mercator (meters)</li>
                    <li>WGS84 (latitude/longitude)</li>
                  </ul>
                </li>
                <li>Enter X/Y or Longitude/Latitude coordinates</li>
                <li>Click "Plot Point" to add marker</li>
                <li>Use "Clear Marker" to remove point</li>
              </ul>
            </section>

            <section>
              <h3>Downloading Data</h3>
              <ol>
                <li>Click on a lake or river segment to select it</li>
                <li>
                  Choose model, scenario, and variable from dropdown menus
                </li>
                <li>Click "Download CSV" to get timeseries data</li>
              </ol>
            </section>

            <section>
              <h3>Variables</h3>
              <ul>
                <li>
                  <strong>Simulated outflows (m³/s)</strong>
                </li>
                <li>
                  <strong>Observed outflows (m³/s)</strong>
                </li>
                <li>
                  <strong>Simulated reservoir inflows (m³/s)</strong>
                </li>
              </ul>
            </section>
            <section>
              <h3>Models</h3>
              <ul>
                <li>
                  <strong>CanESM2</strong>:{" "}
                  <a
                    href="https://climate-modelling.canada.ca/climatemodeldata/cgcm4/CanESM2/index.shtml"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Canadian Centre for Climate Modelling and Analysis ESM2
                    (Earth System Model ver. 2)
                  </a>
                </li>
                <li>
                  <strong>PCIC-HYDRO</strong>: An ensemble mean of the six GCM
                  runs ACCESS1-0_r1i1p1, CanESM2_r1i1pi, CCSM_r2i1p1,
                  CNRM-CM5_r1i1p1, HadGEM2-ES_r1i1p1 and MPI-ESM-LR_r3i1p1
                </li>
              </ul>
            </section>
          </div>
        </div>
      )}
    </>
  );
};

export default HelpGuide;
