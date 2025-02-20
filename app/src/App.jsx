import React from 'react';
import MapComponent from "./components/map/MapComponent.jsx";

console.log("Rendering App...");
const App = () => {
  console.log("Rendering MapComponent from App...");
  return <MapComponent />;
};

console.log("Rendering MapComponent...");

export default App;
