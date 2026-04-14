function normalizeBase(value) {
  return value.trim().replace(/\/+$/, "");
}

const rawApiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const API_BASE_URL = normalizeBase(rawApiUrl);
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");
