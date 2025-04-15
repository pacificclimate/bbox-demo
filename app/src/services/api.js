// TODO: Update this URL with the live api
const BASE_URL = "https://beehive.pacificclimate.org/hydromosaic/api";

const formatUnit = (unit) => {
  return unit
    .replace("**3", "³")
    .replace("**-1", "⁻¹")
    .replace("**2", "²")
    .replace(" ", "·")
    .replace("*", "");
};

const getDisplayName = (variable, units) => {
  const displayUnits = formatUnit(units);
  return `${variable} (${displayUnits})`;
};

let variableInfoCache = null;

const fetchVariableInfo = async () => {
  if (variableInfoCache) return variableInfoCache;

  const response = await fetch(`${BASE_URL}/variables`);
  if (!response.ok) throw new Error("Failed to fetch variables");
  const variables = await response.json();

  variableInfoCache = variables.reduce((acc, v) => {
    acc[v.id] = {
      name: v.long_name || v.id,
      units: v.units,
    };
    return acc;
  }, {});

  return variableInfoCache;
};

export const fetchTimeseriesForOutlet = async (outletId) => {
  const response = await fetch(`${BASE_URL}/outlets/${outletId}/timeseries`);
  if (!response.ok) throw new Error("Failed to fetch timeseries");
  return response.json();
};

export const getAvailableOptions = async (outletId) => {
  const [timeseries, variableInfo] = await Promise.all([
    fetchTimeseriesForOutlet(outletId),
    fetchVariableInfo(),
  ]);

  const options = timeseries.reduce(
    (acc, ts) => {
      acc.models.add(ts.model);
      acc.scenarios.add(ts.scenario);
      if (variableInfo[ts.variable]) {
        acc.variables.add(
          getDisplayName(
            variableInfo[ts.variable].name,
            variableInfo[ts.variable].units
          )
        );
      }
      return acc;
    },
    {
      models: new Set(),
      scenarios: new Set(),
      variables: new Set(),
    }
  );

  return {
    models: Array.from(options.models),
    scenarios: Array.from(options.scenarios),
    variables: Array.from(options.variables),
  };
};

export const getApiVariable = async (displayName) => {
  const variableInfo = await fetchVariableInfo();
  return Object.entries(variableInfo).find(
    ([key, info]) => displayName === getDisplayName(info.name, info.units)
  )?.[0];
};

export const downloadTimeseries = async (outletId, selections) => {
  const [allTimeseries, apiVariable] = await Promise.all([
    fetchTimeseriesForOutlet(outletId),
    getApiVariable(selections.variable),
  ]);

  const timeseriesId = allTimeseries.find(
    (ts) =>
      ts.model === selections.model &&
      ts.scenario === selections.scenario &&
      ts.variable === apiVariable
  )?.id;

  if (!timeseriesId) throw new Error("No matching timeseries found");

  const response = await fetch(
    `${BASE_URL}/outlets/${outletId}/timeseries/${timeseriesId}/data`
  );
  if (!response.ok) throw new Error("Failed to fetch data");

  const data = await response.text();
  const blob = new Blob([data], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${outletId}_${selections.model}_${selections.scenario}_${apiVariable}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};
