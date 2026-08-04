import { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import {
  fetchBulkTimeseries,
  getAvailableOptions,
  getTimeseriesDownload,
} from "../../services/timeseriesApi.js";
import { downloadBlob, downloadUrl } from "../../utils/downloadFile.js";
import "./DataSelection.css";

const HISTORICAL_SCENARIO = "historical";
const HISTORICAL_MODEL = "PNWNAmet";

const getModelLabel = (model) =>
  model === HISTORICAL_MODEL ? `${model} (historical)` : model;

const getScenarioLabel = (scenario) =>
  scenario === HISTORICAL_SCENARIO ? `${scenario} (PNWNAmet only)` : scenario;

const getVariableLabel = (variable) =>
  variable.startsWith(
    "mass concentration of maximum amount of oxygen that will dissolve"
  )
    ? variable.replace(
        /^mass concentration of maximum amount of oxygen that will dissolve in water at given temperature and pressure/,
        "Dissolved oxygen saturation"
      )
    : variable;

const DataSelectionTable = ({
  featureId,
  upstreamSubids,
  downstreamSubids,
  onClose,
}) => {
  const outletId = `${featureId}`;
  const [options, setOptions] = useState({
    models: [],
    scenarios: [],
    variables: [],
  });
  const [selections, setSelections] = useState({
    model: "",
    scenario: "",
    variable: "",
  });
  const [isFetching, setIsFetching] = useState(true);
  const [activeDownload, setActiveDownload] = useState(null);
  const [showValidation, setShowValidation] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const availableOptions = await getAvailableOptions(outletId);
        setOptions(availableOptions);
      } catch (error) {
        console.error("Failed to fetch options:", error);
        alert("Failed to load available options");
      } finally {
        setIsFetching(false);
      }
    };

    fetchOptions();
  }, [outletId]);

  const handleChange = (field, value) => {
    setSelections((prev) => {
      const isNowInvalid =
        field === "model" &&
        prev.scenario !== "" &&
        (value === HISTORICAL_MODEL) !==
          (prev.scenario === HISTORICAL_SCENARIO);

      return {
        ...prev,
        [field]: value,
        ...(isNowInvalid ? { scenario: "" } : {}),
      };
    });
  };

  const getValidationClass = (field) =>
    showValidation && !selections[field] ? "invalid" : "";

  const handleDownload = useCallback(async () => {
    if (Object.values(selections).some((v) => !v)) {
      setShowValidation(true);
      setShake(true);
      setTimeout(() => setShake(false), 650);
      return;
    }

    setActiveDownload("selected");
    try {
      const { url, filename } = await getTimeseriesDownload(
        outletId,
        selections
      );
      downloadUrl(url, filename);
    } catch (error) {
      console.error("Download error:", error);
      alert("Failed to download data");
    } finally {
      setActiveDownload(null);
    }
  }, [outletId, selections]);

  const handleBulkDownload = useCallback(
    async (direction) => {
      if (Object.values(selections).some((v) => !v)) {
        setShowValidation(true);
        setShake(true);
        setTimeout(() => setShake(false), 650);
        return;
      }

      const subids =
        direction === "upstream" ? upstreamSubids : downstreamSubids;
      if (!subids || subids.length <= 1) return;

      setActiveDownload(direction);
      try {
        const { blob, filename } = await fetchBulkTimeseries(
          outletId,
          direction,
          subids,
          selections
        );
        downloadBlob(blob, filename);
      } catch (error) {
        console.error("Bulk download error:", error);
        alert(`Failed to download ${direction} data`);
      } finally {
        setActiveDownload(null);
      }
    },
    [downstreamSubids, outletId, selections, upstreamSubids]
  );

  return (
    <div className={`data-selection ${shake ? "shake" : ""}`}>
      <form onSubmit={(e) => e.preventDefault()}>
        <div className="header">
          <h2>Download Timeseries Data</h2>
          <button type="button" onClick={onClose} className="close-button">
            ✕
          </button>
        </div>

        <select
          value={selections.model}
          onChange={(e) => handleChange("model", e.target.value)}
          className={getValidationClass("model")}
          disabled={isFetching}
        >
          <option value="">{isFetching ? "Loading..." : "Select Model"}</option>
          {options.models.map((model) => (
            <option key={model} value={model}>
              {getModelLabel(model)}
            </option>
          ))}
        </select>

        <select
          value={selections.scenario}
          onChange={(e) => handleChange("scenario", e.target.value)}
          className={getValidationClass("scenario")}
          disabled={isFetching}
        >
          <option value="">
            {isFetching ? "Loading..." : "Select Scenario"}
          </option>
          {options.scenarios.map((scenario) => (
            <option
              key={scenario}
              value={scenario}
              disabled={
                (scenario === HISTORICAL_SCENARIO &&
                  selections.model !== "" &&
                  selections.model !== HISTORICAL_MODEL) ||
                (scenario !== HISTORICAL_SCENARIO &&
                  selections.model === HISTORICAL_MODEL)
              }
            >
              {getScenarioLabel(scenario)}
            </option>
          ))}
        </select>

        <select
          value={selections.variable}
          onChange={(e) => handleChange("variable", e.target.value)}
          className={getValidationClass("variable")}
          disabled={isFetching}
        >
          <option value="">
            {isFetching ? "Loading..." : "Select Variable"}
          </option>
          {options.variables.map((variable) => (
            <option key={variable} value={variable}>
              {getVariableLabel(variable)}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={handleDownload}
          disabled={activeDownload !== null}
        >
          {activeDownload === "selected"
            ? "Downloading..."
            : "Download selected CSV"}
        </button>

        <div className="network-downloads">
          <button
            type="button"
            onClick={() => handleBulkDownload("upstream")}
            disabled={
              activeDownload !== null || (upstreamSubids?.length ?? 0) <= 1
            }
          >
            {activeDownload === "upstream"
              ? "Downloading upstream..."
              : upstreamSubids == null
                ? "Loading upstream network..."
                : upstreamSubids.length <= 1
                  ? "No upstream outlets"
                  : `Download upstream NetCDF (${upstreamSubids.length})`}
          </button>
          <button
            type="button"
            onClick={() => handleBulkDownload("downstream")}
            disabled={
              activeDownload !== null || (downstreamSubids?.length ?? 0) <= 1
            }
          >
            {activeDownload === "downstream"
              ? "Downloading downstream..."
              : downstreamSubids == null
                ? "Loading downstream network..."
                : downstreamSubids.length <= 1
                  ? "No downstream outlets"
                  : `Download downstream NetCDF (${downstreamSubids.length})`}
          </button>
        </div>
        <small className="network-download-note">
          Network downloads include the selected segment.
        </small>
      </form>
    </div>
  );
};

DataSelectionTable.propTypes = {
  featureId: PropTypes.string.isRequired,
  upstreamSubids: PropTypes.arrayOf(PropTypes.string),
  downstreamSubids: PropTypes.arrayOf(PropTypes.string),
  onClose: PropTypes.func.isRequired,
};

export default DataSelectionTable;
