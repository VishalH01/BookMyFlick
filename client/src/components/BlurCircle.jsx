import React from "react";
import PropTypes from "prop-types";

const BlurCircle = ({
  top = "auto",
  left = "auto",
  right = "auto",
  bottom = "auto",
}) => {
  return (
    <div
      className="absolute -z-50 h-58 w-58 aspect-square rounded-full bg-primary/30 blur-3xl"
      style={{ top: top, left: left, right: right, bottom: bottom }}
    ></div>
  );
};

BlurCircle.propTypes = {
  top: PropTypes.string,
  left: PropTypes.string,
  right: PropTypes.string,
  bottom: PropTypes.string, // Add this line
};

export default BlurCircle;