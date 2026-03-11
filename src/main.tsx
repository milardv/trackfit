import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./firebase.ts";
import "./index.css";
import App from "./App.tsx";
import { registerServiceWorker } from "./pwa/registerServiceWorker.ts";

registerServiceWorker();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
