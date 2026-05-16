import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import i18n from "./i18n/index.js";
import { I18nextProvider } from "react-i18next";
import { AuthProvider } from "./context/AuthContext.jsx";
import { UnreadProvider } from "./context/UnreadContext.jsx";
import App from "./App.jsx";
import "./styles/tailwind.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <BrowserRouter>
        <AuthProvider>
          <UnreadProvider>
            <App />
          </UnreadProvider>
        </AuthProvider>
      </BrowserRouter>
    </I18nextProvider>
  </React.StrictMode>
);
