import axios from "axios";
import { API_BASE_URL } from "./runtimeConfig.js";

const apiClient = axios.create({
  baseURL: API_BASE_URL
});

apiClient.interceptors.request.use((config) => {
  if (typeof config.url === "string") {
    config.url = config.url.trim();
  }

  // Ensure headers object exists
  if (!config.headers) {
    config.headers = {};
  }

  // Automatically inject token from localStorage if Authorization header not already set
  const hasAuthHeader =
    (typeof config.headers.get === "function" && Boolean(config.headers.get("Authorization"))) ||
    Boolean(config.headers.Authorization) ||
    Boolean(config.headers.authorization);

  if (!hasAuthHeader) {
    try {
      const authData = window.localStorage.getItem("verbena_auth");
      if (authData) {
        const parsed = JSON.parse(authData);
        const token = parsed?.token;
        if (token && typeof token === "string" && token.trim().length > 0) {
          const bearerToken = `Bearer ${token.trim()}`;

          if (typeof config.headers.set === "function") {
            config.headers.set("Authorization", bearerToken);
          } else {
            config.headers.Authorization = bearerToken;
            config.headers.authorization = bearerToken;
          }
        }
      }
    } catch (error) {
      console.error("Error reading auth token from localStorage", error);
    }
  }

  return config;
});

export function withAuth(token) {
  const trimmedToken = typeof token === "string" ? token.trim() : "";
  
  if (!trimmedToken || trimmedToken.length === 0) {
    return {};
  }
  
  return {
    headers: {
      Authorization: `Bearer ${trimmedToken}`
    }
  };
}

export default apiClient;
