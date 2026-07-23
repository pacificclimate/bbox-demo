// services that fetch non-map data from the BBox API, specifically lists of upstream
// and downstream stream segments.


const fetchStreamNetwork = async (subid, selectedUid, direction) => {
    const response = await fetch(
        `${window.location.origin}/bbox-server/collections/${direction}/items/${subid}.json`
    );
    if (!response.ok) {
        throw new Error(`Failed to fetch ${direction}: ${response.statusText}`);
    }
    const json = await response.json();
    const propertyPrefix = direction.substring(0, direction.length - 1);
    const uids = json.properties[`${propertyPrefix}_uids`] ?? [];
    const subids = json.properties[`${propertyPrefix}_subids`] ?? [];

    return {
        // The selected feature has its own style, so it is not highlighted as
        // part of the surrounding network. It remains in subids for downloads.
        uids: uids.filter(uid => uid != selectedUid),
        subids: [...new Set(subids.map(String))],
    };
};

export const fetchUpstreams = async (subid, uid) => {
    return (await fetchStreamNetwork(subid, uid, "upstreams")).uids;
}

export const fetchDownstreams = async (subid, uid) => {
    return (await fetchStreamNetwork(subid, uid, "downstreams")).uids;
}

export const fetchUpstreamNetwork = async (subid, uid) => {
    return fetchStreamNetwork(subid, uid, "upstreams");
};

export const fetchDownstreamNetwork = async (subid, uid) => {
    return fetchStreamNetwork(subid, uid, "downstreams");
};
