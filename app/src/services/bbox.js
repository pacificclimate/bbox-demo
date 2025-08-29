// services that fetch non-map data from the BBox API, specifically lists of upstream
// and downstream stream segments.


const fetchStreamNetwork = async (subId, direction) => {
    const response = await fetch(
        `${window.location.origin}/upstream-bbox-server/collections/${direction}/items/${subId}.json`
    );
    if (!response.ok) {
        throw new Error(`Failed to fetch ${direction}: ${response.statusText}`);
    }
    const json = await response.json();
    const network = json.properties[`${direction.substring(0, direction.length - 1)}_uids`];
    return network.filter(uid => uid != subId);
};

export const fetchUpstreams = async (subId) => {
    return fetchStreamNetwork(subId, "upstreams");
}

export const fetchDownstreams = async (subId) => {
    return fetchStreamNetwork(subId, "downstreams");
}