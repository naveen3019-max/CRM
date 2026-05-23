function normalizeBase(value) {
  return value.trim().replace(/\/+$/, "");
}

// Default to the user's provided backend if no env is set during build
const rawApiUrl = process.env.EXPO_PUBLIC_API_URL || "https://crm-i71p.onrender.com/api";

// Expose frontend URL as well for runtime checks (optional override via env)
export const FRONTEND_URL = process.env.EXPO_PUBLIC_FRONTEND_URL || "https://crm-frontend-beta-tan.vercel.app";

export const API_BASE_URL = normalizeBase(rawApiUrl);
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");
