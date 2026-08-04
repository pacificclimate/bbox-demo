import { useState } from "react";
import PropTypes from "prop-types";
import "./NetworkLegend.css";

const NetworkLegend = ({ highlightStyles }) => {
  const [isOpen, setIsOpen] = useState(false);
  const items = [
    { label: "Selected segment", color: highlightStyles.rivers.color },
    { label: "Upstream", color: highlightStyles.upstream.color },
    { label: "Downstream", color: highlightStyles.downstream.color },
  ];

  if (!isOpen) {
    return (
      <button
        type="button"
        className="network-legend network-legend-toggle"
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen(true);
        }}
        title="Legend"
        aria-label="Show legend"
        aria-expanded="false"
      >
        <svg
          className="network-legend-icon"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          {items.map(({ color }, index) => {
            const y = 6 + index * 6;
            return (
              <g key={color}>
                <line
                  x1="4"
                  y1={y}
                  x2="10"
                  y2={y}
                  stroke={color}
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <line
                  x1="13"
                  y1={y}
                  x2="20"
                  y2={y}
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </g>
            );
          })}
        </svg>
      </button>
    );
  }

  return (
    <aside className="network-legend" aria-label="Map highlight legend">
      <div className="network-legend-header">
        <div className="network-legend-title">Flow relationship</div>
        <button
          type="button"
          className="network-legend-close"
          onClick={(event) => {
            event.stopPropagation();
            setIsOpen(false);
          }}
          title="Collapse legend"
          aria-label="Collapse legend"
        >
          ×
        </button>
      </div>
      {items.map(({ label, color }) => (
        <div className="network-legend-item" key={label}>
          <span
            className="network-legend-swatch"
            style={{ backgroundColor: color }}
            aria-hidden="true"
          />
          <span>{label}</span>
        </div>
      ))}
    </aside>
  );
};

NetworkLegend.propTypes = {
  highlightStyles: PropTypes.shape({
    rivers: PropTypes.shape({ color: PropTypes.string.isRequired }).isRequired,
    upstream: PropTypes.shape({ color: PropTypes.string.isRequired }).isRequired,
    downstream: PropTypes.shape({ color: PropTypes.string.isRequired }).isRequired,
  }).isRequired,
};

export default NetworkLegend;
