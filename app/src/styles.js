export const baseStyles = {
  rivers: {
    weight: 1,
    color: "#0077bb",
    opacity: 0.8,
  },
  lakes: {
    weight: 1,
    color: "#0077FF",
    fillColor: "#0077FF",
    fillOpacity: 0.3,
    fill: true,
  },
};

export const interactionStyles = {
  hover: {
    lakes: {
      weight: 6,
      fillOpacity: 0.7,
      fill: true,
    },
    rivers: {
      weight: 6,
      opacity: 1,
    },
  },
  highlight: {
    lakes: {
      weight: 4,
      color: "red",
      fillColor: "red",
      fillOpacity: 0.7,
      fill: true,
    },
    rivers: {
      weight: 4,
      color: "red",
      opacity: 1,
    },
  },
};

export const fwaStyles = {
  halo: {
    rivers: {
      color: "#6cdaff",
      opacity: 0.8,
      weight: 10,
      lineCap: "round",
      lineJoin: "round",
    },
    lakes: {
      color: "#6cdaff",
      opacity: 0.7,
      weight: 2,
      fill: true,
      fillColor: "#6cdaff",
      fillOpacity: 0.8,
    },
  },
};
