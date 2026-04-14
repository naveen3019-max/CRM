import axios from "axios";
import { API_BASE_URL } from "./runtimeConfig.js";

const apiClient = axios.create({
  baseURL: API_BASE_URL
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
