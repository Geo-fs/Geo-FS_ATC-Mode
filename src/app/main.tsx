import ReactDOM from "react-dom/client";
import "maplibre-gl/dist/maplibre-gl.css";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import "./styles/index.css";
import { App } from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
