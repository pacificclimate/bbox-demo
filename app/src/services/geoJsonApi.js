const NETWORK_PAGE_SIZE = 500;

const fetchNetworkPage = async ({
  collection,
  selectedSubid,
  offset,
  signal,
}) => {
  const url = new URL(
    `${window.location.origin}/bbox-server/collections/${collection}/items.json`
  );
  url.searchParams.set("network_subid", selectedSubid);
  url.searchParams.set("limit", NETWORK_PAGE_SIZE);
  url.searchParams.set("offset", offset);

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Failed to fetch network GeoJSON (${response.status})`);
  }

  const page = await response.json();
  if (page.type !== "FeatureCollection" || !Array.isArray(page.features)) {
    throw new Error("Invalid network FeatureCollection response");
  }
  return page;
};

export const fetchNetworkGeoJson = async ({
  selectedSubid,
  direction,
  signal,
}) => {
  const collection = `${direction}_feature_collections`;
  const blobParts = ['{"type":"FeatureCollection","features":['];
  let offset = 0;
  let numberMatched = null;
  let hasFeatures = false;
  let featureCount = 0;

  while (numberMatched === null || offset < numberMatched) {
    const page = await fetchNetworkPage({
      collection,
      selectedSubid,
      offset,
      signal,
    });
    const serializedFeatures = page.features.map(JSON.stringify).join(",");
    if (serializedFeatures) {
      if (hasFeatures) blobParts.push(",");
      blobParts.push(serializedFeatures);
      hasFeatures = true;
    }

    featureCount += page.features.length;
    offset += page.features.length;
    const reportedTotal = Number(page.numberMatched);
    numberMatched = Number.isFinite(reportedTotal)
      ? reportedTotal
      : page.features.length < NETWORK_PAGE_SIZE
        ? offset
        : Number.POSITIVE_INFINITY;

    if (page.features.length === 0 || page.features.length < NETWORK_PAGE_SIZE) {
      break;
    }
  }

  if (featureCount <= 1) {
    throw new Error(`No ${direction} outlets found`);
  }

  blobParts.push("]}");
  const blob = new Blob(blobParts, {
    type: "application/geo+json",
  });
  const filename = `${selectedSubid}_${direction}.geojson`.replace(
    /[^A-Za-z0-9_.-]+/g,
    "_"
  );

  return { blob, filename };
};
