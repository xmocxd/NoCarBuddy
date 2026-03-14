import React from "react";
import ReactDOM from "react-dom/client";
import L from "leaflet";

import "leaflet/dist/leaflet.css";
import "./index.css";

import App from "./App.jsx";

// Fix default marker icon with Vite/bundlers (paths otherwise break)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

ReactDOM.createRoot(document.getElementById("root"))
.render(
	<React.StrictMode>
	<App />
	</React.StrictMode>
);