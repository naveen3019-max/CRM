import { API_ORIGIN } from "../services/runtimeConfig.js";

export function resolveMessageImageUrl(rawUrl) {
  if (!rawUrl) {
    return "";
  }

  const normalizedRawUrl = String(rawUrl).trim().replace(/\\/g, "/");

  if (/^https?:\/\//i.test(normalizedRawUrl)) {
    try {
      const parsed = new URL(normalizedRawUrl);
      const host = window.location.hostname;
      const isLocalHostUrl = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
      const isLocalHostPage = host === "localhost" || host === "127.0.0.1";

      if (isLocalHostUrl && !isLocalHostPage) {
        parsed.hostname = host;
      }

      return parsed.toString();
    } catch {
      return normalizedRawUrl;
    }
  }

  if (normalizedRawUrl.startsWith("/")) {
    return `${API_ORIGIN}${normalizedRawUrl}`;
  }

  return `${API_ORIGIN}/${normalizedRawUrl.replace(/^\/+/, "")}`;
}

export function isAudioUrl(rawUrl) {
  if (!rawUrl) {
    return false;
  }

  const normalized = String(rawUrl).trim().toLowerCase();
  if (normalized.startsWith("data:audio/")) {
    return true;
  }

  return /\.(mp3|wav|ogg|oga|webm|m4a|aac|flac)(\?|#|$)/i.test(normalized);
}

export function formatRoleLabel(rawRole) {
  if (!rawRole) {
    return "Contact";
  }

  const source = String(rawRole).replace(/_/g, " ").trim();
  return source
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatTime(value) {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    return "";
  }

  return parsed.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function formatContactTimestamp(value) {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    return "";
  }

  const now = new Date();
  const isSameDay =
    parsed.getDate() === now.getDate() &&
    parsed.getMonth() === now.getMonth() &&
    parsed.getFullYear() === now.getFullYear();

  if (isSameDay) {
    return formatTime(parsed);
  }

  return parsed.toLocaleDateString([], {
    month: "short",
    day: "numeric"
  });
}

export function classifyMessage(message) {
  const explicitType = String(message.type || message.messageType || "").toLowerCase();
  const body = String(message.messageBody || "").trim();

  if (message.isSystem || explicitType === "system" || body.toLowerCase().startsWith("system:")) {
    return "system";
  }

  if (explicitType === "audio" || explicitType === "voice") {
    return "audio";
  }

  if (message.audioDataUrl || message.audioUrl || isAudioUrl(message.imageUrl)) {
    return "audio";
  }

  if (message.imageDataUrl || message.imageUrl) {
    return "image";
  }

  if (explicitType === "location" || body.toLowerCase().startsWith("location:")) {
    return "location";
  }

  if (explicitType === "schedule" || body.toLowerCase().startsWith("schedule:") || body.toLowerCase().startsWith("visit scheduled:")) {
    return "schedule";
  }

  if (explicitType === "requirement" || body.toLowerCase().startsWith("requirement:")) {
    return "requirement";
  }

  return "text";
}

export function parseLocationText(body) {
  const normalized = String(body || "")
    .replace(/^location:/i, "")
    .replace(/\|\s*coords\s*:\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*$/i, "")
    .trim();
  return normalized || "Shared project location";
}

export function parseLocationPayload(body) {
  const source = String(body || "").trim();
  const coordsMatch = source.match(/coords\s*:\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/i);

  const latitude = coordsMatch ? Number(coordsMatch[1]) : null;
  const longitude = coordsMatch ? Number(coordsMatch[2]) : null;
  const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);

  const label = parseLocationText(source);
  const queryText = hasCoordinates ? `${latitude},${longitude}` : label;
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(queryText)}`;
  const staticMapUrl = hasCoordinates
    ? `https://staticmap.openstreetmap.de/staticmap.php?center=${latitude},${longitude}&zoom=15&size=600x260&markers=${latitude},${longitude},red-pushpin`
    : "";

  return {
    label,
    latitude: hasCoordinates ? latitude : null,
    longitude: hasCoordinates ? longitude : null,
    hasCoordinates,
    mapUrl,
    staticMapUrl
  };
}

export function parseScheduleText(body) {
  const normalized = String(body || "")
    .replace(/^visit scheduled:/i, "")
    .replace(/^schedule:/i, "")
    .trim();

  return normalized || "Date and time to be confirmed";
}

export function parseRequirementItems(body) {
  const normalized = String(body || "").replace(/^requirement:/i, "").trim();

  if (!normalized) {
    return ["Scope details pending"];
  }

  const parts = normalized
    .split(/\n|;|\|/)
    .map((entry) => entry.trim().replace(/^[-*]\s*/, ""))
    .filter(Boolean);

  return parts.length ? parts : [normalized];
}

export function summarizeMessage(message) {
  const type = classifyMessage(message);

  if (type === "location") {
    return "Location shared";
  }

  if (type === "schedule") {
    return "Visit scheduled";
  }

  if (type === "requirement") {
    return "Requirement updated";
  }

  if (type === "image") {
    return "Image attachment";
  }

  if (type === "audio") {
    return "Voice message";
  }

  if (type === "system") {
    return String(message.messageBody || "Workflow update").replace(/^system:/i, "").trim();
  }

  return String(message.messageBody || "").trim() || "Message";
}