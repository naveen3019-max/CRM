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

export function sortMessagesChronologically(messages = []) {
  return [...messages].sort((left, right) => {
    const leftTime = new Date(left?.createdAt || left?.created_at || 0).valueOf();
    const rightTime = new Date(right?.createdAt || right?.created_at || 0).valueOf();

    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }

    return Number(left?.id || 0) - Number(right?.id || 0);
  });
}

export function resolveTranslatedMessage(message) {
  if (!message) {
    return "";
  }

  const candidates = [message.originalMessage, message.messageBody, message.message, message.text];

  for (const candidate of candidates) {
    const sanitized = sanitizeMessageText(candidate);
    if (sanitized) {
      return sanitized;
    }
  }

  return "";
}

export function getMessageDisplayText(message) {
  return resolveTranslatedMessage(message);
}

export function normalizeTranslationText(value, originalText = "") {
  const sanitized = sanitizeMessageText(value);
  if (!sanitized) {
    return "";
  }

  const normalizedOriginal = sanitizeMessageText(originalText).toLowerCase();
  if (!normalizedOriginal) {
    return sanitized;
  }

  const lines = sanitized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 1) {
    return sanitized;
  }

  const filtered = lines.filter((line) => line.toLowerCase() !== normalizedOriginal);
  if (!filtered.length) {
    return sanitized;
  }

  return filtered.join("\n");
}

export function sanitizeMessageText(value) {
  const text = String(value ?? "").replace(/\r\n/g, "\n").trim();
  if (!text) {
    return "";
  }

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => {
      const normalized = line.toLowerCase();
      return !(
        normalized.startsWith("translated from") ||
        normalized.includes("translated from") ||
        normalized.includes("ಅನುವಾದ") ||
        normalized.includes("अनुवाद") ||
        normalized.includes("പരിഭാഷ") ||
        normalized.includes("மொழிபெயர்ப்பு") ||
        normalized.includes("అనువాద")
      );
    });

  if (!lines.length) {
    return text;
  }

  const normalizedLines = [];
  for (const line of lines) {
    if (!normalizedLines.includes(line)) {
      normalizedLines.push(line);
    }
  }

  return normalizedLines.join("\n");
}

export function classifyMessage(message) {
  const explicitType = String(message.type || message.messageType || "").toLowerCase();
  const body = String(getMessageDisplayText(message) || "").trim();

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

  if (
    explicitType === "assignment" ||
    body.toLowerCase().startsWith("work assignment notice") ||
    body.toLowerCase().startsWith("assignment status update")
  ) {
    return "assignment";
  }

  if (
    explicitType === "service_request" ||
    body.toLowerCase().startsWith("new service request") ||
    body.toLowerCase().includes("service requests panel to assign a worker")
  ) {
    return "service_request";
  }

  return "text";
}

export function parseAssignmentMessage(body) {
  const normalized = sanitizeMessageText(body);
  if (!normalized) {
    return null;
  }

  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return null;
  }

  const heading = lines[0].toLowerCase();
  const kind = heading.startsWith("assignment status update") ? "status" : "notice";

  const fields = {};
  for (const line of lines.slice(1)) {
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (!match) {
      continue;
    }

    const key = match[1].trim().toLowerCase();
    const value = match[2].trim();

    if (!value) {
      continue;
    }

    fields[key] = value;
  }

  return {
    kind,
    title: lines[0],
    fields,
    customer: fields.customer || "",
    service: fields.service || fields.assignment || "",
    location: fields.location || "",
    details: fields.details || fields.problem || fields.status || "",
    schedule: fields["preferred schedule"] || fields.schedule || "",
    priority: fields.priority || "",
    attachments: fields.attachments || "",
    instructions: fields.instructions || "",
    action: lines.find((line) => /accept or reject/i.test(line)) || "",
    statusLine: fields.status || ""
  };
}

export function parseServiceRequestMessage(body) {
  const normalized = sanitizeMessageText(body);
  if (!normalized) {
    return null;
  }

  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return null;
  }

  const fields = {};
  for (const line of lines.slice(1)) {
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (!match) {
      continue;
    }

    const key = match[1].trim().toLowerCase();
    const value = match[2].trim();

    if (!value) {
      continue;
    }

    fields[key] = value;
  }

  return {
    title: lines[0],
    requestId: fields["request id"] || "",
    customer: fields.customer || "",
    service: fields.service || "",
    location: fields.location || "",
    problem: fields.problem || "",
    expectedSolution: fields["expected solution"] || "",
    requirementDetails: fields["requirement details"] || "",
    budget: fields.budget || "",
    schedule: fields["preferred schedule"] || "",
    priority: fields.priority || "",
    attachments: fields.attachments || "",
    action: lines.find((line) => /service requests panel/i.test(line)) || "",
    fields
  };
}

export function parseLocationText(body) {
  const parsed = parseLocationPayload(body);
  if (parsed?.formattedAddress) {
    return parsed.formattedAddress;
  }

  if (parsed?.label) {
    return parsed.label;
  }

  const normalized = String(body || "")
    .replace(/^location:/i, "")
    .replace(/^address:/i, "")
    .replace(/^formattedaddress:/i, "")
    .replace(/^label:/i, "")
    .replace(/\|\s*coords\s*:\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*$/i, "")
    .trim();
  return normalized || "Shared project location";
}

function normalizeCoordinate(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function safeParseJson(value) {
  if (!value || typeof value !== "string") {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function extractStructuredFields(source) {
  const fields = {};
  const lines = String(source || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (!match) {
      continue;
    }

    const key = match[1].trim().toLowerCase();
    const value = match[2].trim();
    if (!value) {
      continue;
    }

    fields[key] = value;
  }

  return fields;
}

function buildLocationMapUrl(latitude, longitude, fallbackText = "") {
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${latitude},${longitude}`)}`;
  }

  const query = String(fallbackText || "").trim();
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : "";
}

export function buildLocationMessageBody(location = {}) {
  const latitude = normalizeCoordinate(location.latitude);
  const longitude = normalizeCoordinate(location.longitude);
  const label = String(location.label || location.address || location.formattedAddress || "Shared project location").trim() || "Shared project location";
  const formattedAddress = String(location.formattedAddress || location.address || "").trim();
  const mapUrl = String(location.mapUrl || buildLocationMapUrl(latitude, longitude, formattedAddress || label)).trim();

  return [
    `location: ${label}`,
    formattedAddress ? `formattedAddress: ${formattedAddress}` : null,
    String(location.address || "").trim() && String(location.address || "").trim() !== formattedAddress ? `address: ${String(location.address).trim()}` : null,
    Number.isFinite(latitude) && Number.isFinite(longitude) ? `coords: ${latitude}, ${longitude}` : null,
    mapUrl ? `mapUrl: ${mapUrl}` : null
  ]
    .filter(Boolean)
    .join("\n");
}

export function parseLocationPayload(body, metadata = null) {
  const sourceObject = body && typeof body === "object" && !Array.isArray(body) ? body : null;
  const source =
    typeof body === "string"
      ? body.trim()
      : String(sourceObject?.messageBody || sourceObject?.originalMessage || sourceObject?.message || sourceObject?.text || "").trim();
  const sourceText = source || "";
  const parsedMetadata = metadata && typeof metadata === "object" ? metadata : safeParseJson(metadata);
  const metadataSource = parsedMetadata && typeof parsedMetadata === "object" ? parsedMetadata : {};
  const parsedJson = source.startsWith("{") ? safeParseJson(source) : null;
  const sourcePayload = sourceObject || (parsedJson && typeof parsedJson === "object" ? parsedJson : null) || {};
  const fields = extractStructuredFields(source);

  const latitude = normalizeCoordinate(
    sourcePayload.latitude ?? sourcePayload.lat ?? metadataSource.latitude ?? metadataSource.lat ?? fields.latitude ?? fields.lat ?? fields.coords?.split?.(",")?.[0]
  );
  const longitude = normalizeCoordinate(
    sourcePayload.longitude ?? sourcePayload.lng ?? sourcePayload.lon ?? metadataSource.longitude ?? metadataSource.lng ?? metadataSource.lon ?? fields.longitude ?? fields.lng ?? fields.lon ?? fields.coords?.split?.(",")?.[1]
  );
  const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);

  const address = String(
    sourcePayload.address ?? sourcePayload.formattedAddress ?? metadataSource.address ?? fields.address ?? fields.formattedaddress ?? fields.formatted_address ?? (sourceText ? parseLocationText(sourceText) : "")
  ).trim();
  const formattedAddress = String(
    sourcePayload.formattedAddress ?? sourcePayload.formatted_address ?? metadataSource.formattedAddress ?? metadataSource.formatted_address ?? fields.formattedaddress ?? fields.formatted_address ?? address
  ).trim();
  const fallbackLabel = address || formattedAddress || (sourceText ? parseLocationText(sourceText) : "Shared project location");
  const label = String(sourcePayload.label ?? sourcePayload.name ?? metadataSource.label ?? fields.location ?? fields.label ?? fallbackLabel).trim();
  const mapUrl = String(
    sourcePayload.mapUrl ?? sourcePayload.map_url ?? metadataSource.mapUrl ?? metadataSource.map_url ?? fields.mapurl ?? fields.map_url ?? buildLocationMapUrl(latitude, longitude, formattedAddress || label)
  ).trim();
  const staticMapUrl = hasCoordinates
    ? `https://staticmap.openstreetmap.de/staticmap.php?center=${latitude},${longitude}&zoom=15&size=600x260&markers=${latitude},${longitude},red-pushpin`
    : "";

  return {
    label,
    address,
    formattedAddress,
    latitude: hasCoordinates ? latitude : null,
    longitude: hasCoordinates ? longitude : null,
    hasCoordinates,
    mapUrl,
    staticMapUrl,
    rawText: source || String(body || "").trim(),
    metadata: metadataSource
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
  if (type === "service_request") return "Service request received";
  if (type === "location") return "Location shared";
  if (type === "schedule") return "Visit scheduled";
  if (type === "requirement") return "Requirement updated";
  if (type === "image") return "Image attachment";
  if (type === "audio") return "Voice message";
  if (type === "system") return String(getMessageDisplayText(message) || "Workflow update").replace(/^system:/i, "").trim();

  return String(getMessageDisplayText(message) || "").trim() || "Message";
}