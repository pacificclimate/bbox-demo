export const downloadNetworkGeoJson = async ({
  selectedSubid,
  direction,
  signal,
}) => {
  const collection = `${direction}_feature_collections`;
  const response = await fetch(
    `${window.location.origin}/bbox-server/collections/${collection}/items/${selectedSubid}.json`,
    { signal }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${direction} GeoJSON (${response.status})`
    );
  }

  const item = await response.json();
  const featureCollection = item.properties?.feature_collection;
  if (featureCollection?.type !== "FeatureCollection") {
    throw new Error(`Invalid ${direction} FeatureCollection response`);
  }

  const blob = new Blob([JSON.stringify(featureCollection)], {
    type: "application/geo+json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${selectedSubid}_${direction}.geojson`.replace(
    /[^A-Za-z0-9_.-]+/g,
    "_"
  );
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 0);
};
