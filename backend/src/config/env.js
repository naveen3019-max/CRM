import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "../..");
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const clientUrlSetting = process.env.CLIENT_URL || "http://localhost:5173";
const clientUrls = clientUrlSetting
  .split(/[\n,]/)
  .map((origin) => origin.trim())
  .filter(Boolean);

function parseBoolean(value, fallback = false) {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "true") {
    return true;
  }
  if (normalized === "false") {
    return false;
  }

  return fallback;
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

function parseDatabaseUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") {
    return null;
  }

  try {
    const parsed = new URL(rawUrl);
    if (!parsed.protocol.startsWith("mysql")) {
      return null;
    }

    return {
      host: parsed.hostname,
      port: Number(parsed.port || 3306),
      user: decodeURIComponent(parsed.username || "root"),
      password: decodeURIComponent(parsed.password || ""),
      database: parsed.pathname ? parsed.pathname.replace(/^\//, "") : ""
    };
  } catch {
    return null;
  }
}

function redactDatabaseUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") {
    return rawUrl || "";
  }

  try {
    const parsed = new URL(rawUrl);
    if (parsed.password) {
      parsed.password = "***REDACTED***";
    }
    return parsed.toString();
  } catch {
    return rawUrl.replace(/(:\/\/[^:]+:)[^@]+@/, "$1***REDACTED***@");
  }
}

function findDatabaseUrlConfig() {
  const candidates = [{ source: "MYSQL_PUBLIC_URL", rawUrl: process.env.MYSQL_PUBLIC_URL }];

  for (const candidate of candidates) {
    const parsed = parseDatabaseUrl(candidate.rawUrl);
    if (parsed) {
      return { ...candidate, parsed };
    }
  }

  return null;
}

function hasAnyEnvValue(keys) {
  return keys.some((key) => process.env[key]);
}

const uploadDirSetting = process.env.UPLOAD_DIR || "uploads";
const resolvedUploadDir = path.isAbsolute(uploadDirSetting)
  ? uploadDirSetting
  : path.resolve(backendRoot, uploadDirSetting);

const databaseUrlConfig = findDatabaseUrlConfig();
const parsedDatabaseUrl = databaseUrlConfig?.parsed || null;
const inferredDbSsl = Boolean(
  parsedDatabaseUrl?.host?.endsWith(".proxy.rlwy.net") ||
  databaseUrlConfig?.source === "MYSQL_PUBLIC_URL"
);
const hasLocalDbOverride = Boolean(
  process.env.LOCAL_DB_HOST ||
  process.env.LOCAL_DB_PORT ||
  process.env.LOCAL_DB_NAME ||
  process.env.LOCAL_DB_USER ||
  process.env.LOCAL_DB_PASSWORD
);
const shouldUseLocalDbFallback = process.env.NODE_ENV !== "production" && hasLocalDbOverride;

const fallbackDbHost = process.env.LOCAL_DB_HOST || "localhost";
const fallbackDbPort = Number(process.env.LOCAL_DB_PORT || 3306);
const fallbackDbName = process.env.LOCAL_DB_NAME || "verbena_crm";
const fallbackDbUser = process.env.LOCAL_DB_USER || "root";
const fallbackDbPassword = process.env.LOCAL_DB_PASSWORD || "";
const dbStarKeys = ["DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD"];
const databaseConfigSource = shouldUseLocalDbFallback
  ? "LOCAL_DB_*"
  : databaseUrlConfig?.source || (hasAnyEnvValue(dbStarKeys) ? "DB_*" : "unset");
const mysqlPublicUrlParsed = parseDatabaseUrl(process.env.MYSQL_PUBLIC_URL);
const expectedRailwayPublicHost = "metro.proxy.rlwy.net";
const expectedRailwayPublicPort = 22437;
const resolvedDbHostCandidate = parsedDatabaseUrl?.host || process.env.DB_HOST || "";
const resolvedDbPortCandidate = Number(parsedDatabaseUrl?.port || process.env.DB_PORT || 3306);
const isRailwayEndpoint = Boolean(
  resolvedDbHostCandidate?.endsWith(".proxy.rlwy.net") || resolvedDbHostCandidate?.includes("railway")
);
const isExpectedRailwayPublicHost = resolvedDbHostCandidate === expectedRailwayPublicHost;
const isExpectedRailwayPublicPort = resolvedDbPortCandidate === expectedRailwayPublicPort;
const staleRailwayEndpointDetected = Boolean(
  isRailwayEndpoint && (!isExpectedRailwayPublicHost || !isExpectedRailwayPublicPort)
);

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 5000),
  clientUrl: clientUrlSetting,
  clientUrls,
  jwtSecret: process.env.JWT_SECRET || "dev_secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
  googleTranslateApiKey: process.env.GOOGLE_TRANSLATE_API_KEY || process.env.GOOGLE_API_KEY || "",
  dbHost: shouldUseLocalDbFallback
    ? fallbackDbHost
    : parsedDatabaseUrl?.host || process.env.DB_HOST || "",
  dbPort: shouldUseLocalDbFallback
    ? fallbackDbPort
    : Number(parsedDatabaseUrl?.port || process.env.DB_PORT || 3306),
  dbName: shouldUseLocalDbFallback
    ? fallbackDbName
    : parsedDatabaseUrl?.database || process.env.DB_NAME || "",
  dbUser: shouldUseLocalDbFallback
    ? fallbackDbUser
    : parsedDatabaseUrl?.user || process.env.DB_USER || "",
  dbPassword: shouldUseLocalDbFallback
    ? fallbackDbPassword
    : parsedDatabaseUrl?.password || process.env.DB_PASSWORD || "",
  dbSsl: shouldUseLocalDbFallback ? false : parseBoolean(process.env.DB_SSL, inferredDbSsl),
  dbSslRejectUnauthorized: parseBoolean(process.env.DB_SSL_REJECT_UNAUTHORIZED, inferredDbSsl ? false : true),
  dbConnectTimeoutMs: parsePositiveInteger(process.env.DB_CONNECT_TIMEOUT_MS, 10000),
  dbConnectRetries: parsePositiveInteger(process.env.DB_CONNECT_RETRIES, 5),
  dbConnectRetryDelayMs: parsePositiveInteger(process.env.DB_CONNECT_RETRY_DELAY_MS, 1500),
  dbConfigSource: databaseConfigSource,
  mysqlPublicUrlDetected: Boolean(process.env.MYSQL_PUBLIC_URL),
  mysqlPublicUrlParsed: Boolean(mysqlPublicUrlParsed),
  mysqlPublicUrlHost: mysqlPublicUrlParsed?.host || "",
  mysqlPublicUrlPort: mysqlPublicUrlParsed?.port || null,
  rawDatabaseEnv: {
    MYSQL_PUBLIC_URL: redactDatabaseUrl(process.env.MYSQL_PUBLIC_URL),
    MYSQL_URL: redactDatabaseUrl(process.env.MYSQL_URL),
    DATABASE_URL: redactDatabaseUrl(process.env.DATABASE_URL)
  },
  isExpectedRailwayPublicHost,
  isExpectedRailwayPublicPort,
  usesStaleRailwayEndpoint: staleRailwayEndpointDetected,
  allowStartWithoutDb: parseBoolean(process.env.ALLOW_START_WITHOUT_DB, false),
  uploadDir: resolvedUploadDir,
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || "",
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || "",
  cloudinaryFolder: process.env.CLOUDINARY_FOLDER || "verbena/company-documents"
};

export function validateEnv() {
  const isProd = env.nodeEnv === "production";
  if (isProd && (env.jwtSecret === "dev_secret" || !process.env.JWT_SECRET)) {
    throw new Error("PRODUCTION ERROR: JWT_SECRET is missing or using insecure default.");
  }
  
  if (!env.dbHost || !env.dbName || !env.dbUser) {
    console.error("[Config] Database configuration is incomplete:", {
      host: !!env.dbHost, name: !!env.dbName, user: !!env.dbUser
    });
    throw new Error("Database configuration environment variables are missing.");
  }
}

export function getResolvedDatabaseConfig() {
  return {
    host: env.dbHost,
    port: env.dbPort,
    database: env.dbName,
    user: env.dbUser,
    ssl: env.dbSsl,
    source: env.dbConfigSource
  };
}

export function getDatabaseStartupDiagnostics() {
  return {
    ...getResolvedDatabaseConfig(),
    sslRejectUnauthorized: env.dbSslRejectUnauthorized,
    MYSQL_PUBLIC_URL_detected: env.mysqlPublicUrlDetected,
    MYSQL_PUBLIC_URL_parsed: env.mysqlPublicUrlParsed,
    MYSQL_PUBLIC_URL_host: env.mysqlPublicUrlHost || null,
    MYSQL_PUBLIC_URL_port: env.mysqlPublicUrlPort,
    expectedRailwayPublicHost,
    expectedRailwayPublicPort,
    usingExpectedRailwayPublicHost: env.isExpectedRailwayPublicHost,
    usingExpectedRailwayPublicPort: env.isExpectedRailwayPublicPort,
    staleRailwayEndpointDetected: env.usesStaleRailwayEndpoint
  };
}

export function getRawDatabaseEnvDiagnostics() {
  return env.rawDatabaseEnv;
}
