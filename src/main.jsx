import PanelExperience from "../../shared/PanelExperience.jsx";
import {api} from "./api.js";
import ImpersonationFrame from "../../shared/ImpersonationFrame.jsx";
import {getAuth,acceptSession,endImpersonation} from "./api.js";
import Boundary from "../../shared/Boundary.jsx";
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./style.css";
import "./design.css";

import "./refresh.css";

import "../../shared/panel-theme.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Boundary><PanelExperience api={api} panel="revenda"><ImpersonationFrame getAuth={getAuth} acceptSession={acceptSession} endImpersonation={endImpersonation} adminUrl={import.meta.env.VITE_ADMIN_URL || (import.meta.env.DEV?"http://localhost:5174":"")}><App /></ImpersonationFrame></PanelExperience></Boundary>
  </React.StrictMode>,
);
