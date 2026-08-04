const BASE_URL = `${window.location.origin}/hydromosaic`;

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
    ([, info]) => displayName === getDisplayName(info.name, info.units)
  )?.[0];
};

export const getTimeseriesDownload = async (outletId, selections) => {
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

  return {
    url: `${BASE_URL}/outlets/${outletId}/timeseries/${timeseriesId}/data`,
    filename: `${outletId}_${selections.model}_${selections.scenario}_${apiVariable}.csv`,
  };
};

export const fetchBulkTimeseries = async (
  outletId,
  direction,
  subids,
  selections
) => {
  if (subids.length <= 1) throw new Error(`No ${direction} outlets found`);

  const apiVariable = await getApiVariable(selections.variable);
  if (!apiVariable) throw new Error("No matching variable found");

  const response = await fetch(`${BASE_URL}/bulk-downloads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subids,
      model: selections.model,
      scenario: selections.scenario,
      variable: apiVariable,
      format: "netcdf",
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || `Bulk download failed (${response.status})`);
  }

  const filename = `${outletId}_${direction}_${selections.model}_${selections.scenario}_${apiVariable}.nc`
    .replace(/[^A-Za-z0-9_.-]+/g, "_");

  return { blob: await response.blob(), filename };
};
