import { createContext, useContext, useEffect, useMemo, useState } from "react";
import i18n, { normalizeLanguageCode } from "../i18n/index.js";

const AuthContext = createContext(null);
const STORAGE_KEY = "verbena_auth";

function clearStoredAuth() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Silently fail
  }
}

function isJwtExpired(token) {
  if (!token || typeof token !== "string") {
    return true;
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return true;
  }

  try {
    const payloadJson = window.atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(payloadJson);
    if (typeof payload.exp !== "number") {
      return false;
    }

    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
}

function readStoredAuth() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (isJwtExpired(parsed?.token)) {
      clearStoredAuth();
      return null;
    }

    return parsed;
  } catch {
    clearStoredAuth();
    return null;
  }
}

function persistLanguage(languageCode) {
  try {
    window.localStorage.setItem("verbena_language", normalizeLanguageCode(languageCode));
  } catch {
    // Silently fail
  }
}

export function AuthProvider({ children }) {
  const initialState = readStoredAuth();
  const [token, setToken] = useState(initialState?.token || "");
  const [user, setUser] = useState(initialState?.user || null);

  useEffect(() => {
    // Keep the app in English regardless of any saved preference.
    const nextLanguage = "en";
    if (i18n.language !== nextLanguage) {
      i18n.changeLanguage(nextLanguage).catch(() => {
        // Silently fail
      });
    }
    persistLanguage(nextLanguage);
  }, [user?.preferredLanguage]);

  const login = ({ token: nextToken, user: nextUser }) => {
    if (isJwtExpired(nextToken)) {
      clearStoredAuth();
      setToken("");
      setUser(null);
      return;
    }

    // Normalize service category / workType for backward compatibility
    const normalizedUser = {
      ...nextUser,
      workType: nextUser.workType || nextUser.serviceCategory || null,
      serviceCategory: nextUser.serviceCategory || nextUser.workType || null,
      preferredLanguage: "en"
    };

    setToken(nextToken);
    setUser(normalizedUser);
    // Clear stale unread count on login
    try {
      window.localStorage.removeItem("verbena_unread_count");
    } catch {
      // Silently fail
    }
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        token: nextToken,
        user: normalizedUser
      })
    );
  };

  const logout = () => {
    setToken("");
    setUser(null);
    clearStoredAuth();
    // Clear unread count on logout
    try {
      window.localStorage.removeItem("verbena_unread_count");
    } catch {
      // Silently fail
    }
  };

  const updateUser = (nextUser) => {
    const normalizedUser = {
      ...nextUser,
      workType: nextUser.workType || nextUser.serviceCategory || null,
      serviceCategory: nextUser.serviceCategory || nextUser.workType || null,
      preferredLanguage: "en"
    };
    setUser(normalizedUser);

    const raw = window.localStorage.getItem(STORAGE_KEY);
    const previous = raw ? JSON.parse(raw) : {};
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...previous,
        token,
        user: normalizedUser
      })
    );
  };

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token && user),
      login,
      logout,
      updateUser
    }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
