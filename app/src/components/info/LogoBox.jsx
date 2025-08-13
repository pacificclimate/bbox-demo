import PropTypes from "prop-types";
import logo from "../../assets/logo.png";
import "./LogoBox.css";

const LogoBox = ({ projectName }) => {
  const nameParts = projectName.split(" ");
  const midpoint = Math.ceil(nameParts.length / 2);
  const firstLine = nameParts.slice(0, midpoint).join(" ");
  const secondLine = nameParts.slice(midpoint).join(" ");

  return (
    <div className="logo-box">
      <img src={logo} alt="PCIC Logo" className="logo" />
      <div className="project-name-container">
        <h1 className="project-name">
          {firstLine}<br />{secondLine}
        </h1>
      </div>
    </div>
  );
};

LogoBox.propTypes = {
  projectName: PropTypes.string.isRequired,
};

export default LogoBox;