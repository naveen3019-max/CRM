import axios from "axios";

function normalizeApiBaseUrl(value) {
  return value.trim().replace(/\/+$/, "");
}

const rawApiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const apiClient = axios.create({
  baseURL: normalizeApiBaseUrl(rawApiUrl)
});

apiClient.interceptors.request.use((config) => {
  if (typeof config.url === "string") {
    config.url = config.url.trim();
  }
  return config;
});

export function withAuth(token) {
  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
}

export default apiClient;
