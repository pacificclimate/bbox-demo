import { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { getAvailableOptions, downloadTimeseries } from "../../services/api.js";
import "./DataSelection.css";

const DataSelectionTable = ({ featureId, onClose }) => {
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
  const [isLoading, setIsLoading] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const outletId = `sub${featureId}`;
        const availableOptions = await getAvailableOptions(outletId);
        setOptions(availableOptions);
      } catch (error) {
        console.error("Failed to fetch options:", error);
        alert("Failed to load available options");
      }
    };

    fetchOptions();
  }, [featureId]);

  const handleChange = (field, value) => {
    setSelections((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const getValidationClass = (field) => {
    return showValidation && !selections[field] ? "invalid" : "";
  };

  const handleDownload = useCallback(async () => {
    if (Object.values(selections).some((v) => !v)) {
      setShowValidation(true);
      setShake(true);
      setTimeout(() => setShake(false), 650);
      return;
    }

    setIsLoading(true);
    try {
      await downloadTimeseries(featureId, selections);
    } catch (error) {
      console.error("Download error:", error);
      alert("Failed to download data");
    } finally {
      setIsLoading(false);
    }
  }, [featureId, selections]);

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
        >
          <option value="">Select Model</option>
          {options.models.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>

        <select
          value={selections.scenario}
          onChange={(e) => handleChange("scenario", e.target.value)}
          className={getValidationClass("scenario")}
        >
          <option value="">Select Scenario</option>
          {options.scenarios.map((scenario) => (
            <option key={scenario} value={scenario}>
              {scenario}
            </option>
          ))}
        </select>

        <select
          value={selections.variable}
          onChange={(e) => handleChange("variable", e.target.value)}
          className={getValidationClass("variable")}
        >
          <option value="">Select Variable</option>
          {options.variables.map((variable) => (
            <option key={variable} value={variable}>
              {variable}
            </option>
          ))}
        </select>

        <button type="button" onClick={handleDownload} disabled={isLoading}>
          {isLoading ? "Downloading..." : "Download CSV"}
        </button>
      </form>
    </div>
  );
};

DataSelectionTable.propTypes = {
  featureId: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default DataSelectionTable;
