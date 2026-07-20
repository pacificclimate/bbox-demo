import { useState, useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import "./HelpGuide.css";

const OGL_URL =
  "https://www2.gov.bc.ca/gov/content/data/policy-standards/data-policies/open-data/open-government-licence-bc";
const CNRM_ESM2_1_URL =
  "https://www.wdc-climate.de/ui/cmip6?input=CMIP6.CMIP.CNRM-CERFACS.CNRM-ESM2-1";
const FGOALS_G3_URL =
  "https://www.wdc-climate.de/ui/cmip6?input=CMIP6.CMIP.CAS.FGOALS-g3";
const IPSL_CM6A_LR_URL =
  "https://www.wdc-climate.de/ui/cmip6?input=CMIP6.CMIP.IPSL.IPSL-CM6A-LR";
const MIROC_ES2L_URL =
  "https://www.wdc-climate.de/ui/cmip6?input=CMIP6.ScenarioMIP.MIROC.MIROC-ES2L";
const MPI_ESM1_2_HR_URL =
  "https://mpimet.mpg.de/en/communication/news/development-of-a-high-resolution-earth-system-model-and-its-application-in-cmip6";
const MRI_ESM2_0_URL =
  "https://www.wdc-climate.de/ui/cmip6?input=CMIP6.CMIP.MRI.MRI-ESM2-0";
const NORESM2_LM_URL = "https://noresm-docs.readthedocs.io/en/noresm2/";
const TAIESM1_URL = "https://github.com/rceclccr/TaiESM-docs";
const UKESM1_0_LL_URL =
  "https://ukesm.ac.uk/cmip-es-documentation/ukesm1-0-ll/";
const PNWNAMET_URL =
  "https://www.uvic.ca/pcic/data-analysis-tools/data-portal/daily-gridded-meteorology/index.php";
const SSP_URL =
  "https://climatedata.ca/resource/understanding-shared-socio-economic-pathways-ssps/";

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
            <div className="help-header">
              <h2>User Guide</h2>
              <button className="close-button" onClick={() => setIsOpen(false)}>
                ✕
              </button>
            </div>
            <div className="help-body">
              <section>
                <h3>Map Navigation</h3>
                <ul>
                  <li>Click and drag to pan the map</li>
                  <li>
                    Use scroll wheel or zoom control buttons to zoom in/out
                  </li>
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
                  <li>Click &quot;Plot Point&quot; to add marker</li>
                  <li>Use &quot;Clear Marker&quot; to remove point</li>
                </ul>
              </section>

              <section>
                <h3>Feature Name Search</h3>
                <ul>
                  <li>Use top-left panel to search for features by name</li>
                  <li>Enter the lake or river name</li>
                  <li>Select a name from the drop-down of filtered names</li>
                  <li>The selected feature will be highlighted in light blue</li>
                </ul>
              </section>

              <section>
                <h3>Downloading Data</h3>
                <ol>
                  <li>Click on a lake or river segment to select it</li>
                  <li>
                    Choose model, scenario, and variable from dropdown menus
                  </li>
                  <li>Click &quot;Download CSV&quot; to get timeseries data</li>
                </ol>
              </section>

              <section>
                <h3>Variables</h3>
                <ul>
                  <li>
                    <strong>Streamflow (m³/s)</strong>
                  </li>
                  <li>
                    <strong>Water Temperature or lake surface temperature (°C)</strong>
                  </li>
                  <li>
                    <strong>Saturated dissolved oxygen (mg/L)</strong>
                  </li>
                </ul>
              </section>

              <section>
                <h3>Models (Forcing)</h3>
                <p>
                  <strong>Downscaled Climate Projections</strong>
                </p>
                <ul>
                  <li>
                    <strong>CNRM-ESM2-1</strong>:{" "}
                    <a
                      href={CNRM_ESM2_1_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      CNRM-CERFACS, Earth Systems Model second generation
                    </a>
                  </li>
                  <li>
                    <strong>FGOALS-g3</strong>:{" "}
                    <a
                      href={FGOALS_G3_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Chinese Academy of Sciences, Flexible Global
                      Ocean-Atmosphere-Land System Model grid-point Version 3
                    </a>
                  </li>
                  <li>
                    <strong>IPSL-CM6A-LR</strong>:{" "}
                    <a
                      href={IPSL_CM6A_LR_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Institut Pierre Simon Laplace Climate Modelling Centre,
                      Climate Model Phase 6, low resolution
                    </a>
                  </li>
                  <li>
                    <strong>MIROC-ES2L</strong>:{" "}
                    <a
                      href={MIROC_ES2L_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Model for Interdisciplinary Research on Climate, Earth
                      System version 2 for Long-term simulations
                    </a>
                  </li>
                  <li>
                    <strong>MPI-ESM1-2-HR</strong>:{" "}
                    <a
                      href={MPI_ESM1_2_HR_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Max Planck Institute, Earth System Model version 1.2 high
                      resolution
                    </a>
                  </li>
                  <li>
                    <strong>MRI-ESM2-0</strong>:{" "}
                    <a
                      href={MRI_ESM2_0_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Meteorological Research Institute, Earth System Model
                      version 2.0
                    </a>
                  </li>
                  <li>
                    <strong>NorESM2-LM</strong>:{" "}
                    <a
                      href={NORESM2_LM_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Norwegian Earth System Model second version
                    </a>
                  </li>
                  <li>
                    <strong>TaiESM1</strong>:{" "}
                    <a
                      href={TAIESM1_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Taiwan Earth System Model version 1
                    </a>
                  </li>
                  <li>
                    <strong>UKESM1-0-LL</strong>:{" "}
                    <a
                      href={UKESM1_0_LL_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      The UK Meteorological Office, Earth System Model version
                      1
                    </a>
                  </li>
                </ul>
                <p>
                  <strong>Gridded Observations</strong>
                </p>
                <ul>
                  <li>
                    <strong>PNWNAmet</strong>:{" "}
                    <a
                      href={PNWNAMET_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Gridded observations of temperature and precipitation for
                      Northwest North America.
                    </a>
                  </li>
                </ul>
              </section>

              <section>
                <h3>Scenarios</h3>
                <p>
                  <strong>Climate Projections</strong>: Historical (1950-2014)
                  {" + "}
                  <a href={SSP_URL} target="_blank" rel="noopener noreferrer">
                    Socio-economic Pathways
                  </a>{" "}
                  (2015-2100)
                </p>
                <ul>
                  <li>Historical, SSP2-4.5</li>
                  <li>Historical, SSP5-8.5</li>
                </ul>
                <p>
                  <strong>Gridded Observations</strong>: Historical only
                  (1945-2012)
                </p>
                <ul>
                  <li>Historical (PNWNAmet only)</li>
                </ul>
              </section>
              <section>
                <h3>Credits & Licensing</h3>
                <p>
                  This application uses data and services from the BC Geographic
                  Warehouse (DataBC).
                </p>
                <p>
                  Contains information licensed under the{" "}
                  <a href={OGL_URL} target="_blank" rel="noopener noreferrer">
                    Open Government Licence – British Columbia
                  </a>
                  .
                </p>
              </section>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HelpGuide;
