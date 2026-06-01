import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import i18n from "./i18n/index.js";
import { I18nextProvider } from "react-i18next";
import { AuthProvider } from "./context/AuthContext.jsx";
import { UnreadProvider } from "./context/UnreadContext.jsx";
import App from "./App.jsx";
import "./styles/tailwind.css";

// Ensure a global `start` exists to avoid accidental ReferenceError
if (typeof window !== "undefined" && typeof window.start !== "function") {
  // Some third-party or injected scripts may call `start()` unexpectedly.
  // Provide a harmless no-op to prevent uncaught ReferenceError in production.
  window.start = function () {};
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <HashRouter>
        <AuthProvider>
          <UnreadProvider>
            <App />
          </UnreadProvider>
        </AuthProvider>
      </HashRouter>
    </I18nextProvider>
  </React.StrictMode>
);
