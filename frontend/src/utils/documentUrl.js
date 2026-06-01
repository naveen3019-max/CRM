import { API_ORIGIN } from "../services/runtimeConfig.js";

export function resolveDocumentUrl(fileUrl, baseUrl = API_ORIGIN) {
  if (!fileUrl) {
    return "";
  }

  if (/^(https?:)?\/\//i.test(fileUrl) || fileUrl.startsWith("data:") || fileUrl.startsWith("blob:")) {
    return fileUrl;
  }

  const origin = String(baseUrl || API_ORIGIN).replace(/\/+$/, "");
  const normalizedPath = fileUrl.startsWith("/") ? fileUrl : `/${fileUrl}`;
  return `${origin}${normalizedPath}`;
}