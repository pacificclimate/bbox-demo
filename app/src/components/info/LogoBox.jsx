import PropTypes from "prop-types";
import logo from "../../assets/logo.png";
import "./LogoBox.css";

const LogoBox = ({ projectName }) => {
  return (
    <div className="logo-box">
      <img src={logo} alt="PCIC Logo" className="logo" />
      <h1 className="project-name">{projectName}</h1>
    </div>
  );
};

LogoBox.propTypes = {
  projectName: PropTypes.string.isRequired,
};

export default LogoBox;
