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

const uploadDirSetting = process.env.UPLOAD_DIR || "uploads";
const resolvedUploadDir = path.isAbsolute(uploadDirSetting)
  ? uploadDirSetting
  : path.resolve(backendRoot, uploadDirSetting);

const parsedDatabaseUrl = parseDatabaseUrl(process.env.DATABASE_URL || process.env.MYSQL_URL);
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
    : process.env.DB_HOST || process.env.MYSQLHOST || parsedDatabaseUrl?.host || "localhost",
  dbPort: shouldUseLocalDbFallback
    ? fallbackDbPort
    : Number(process.env.DB_PORT || process.env.MYSQLPORT || parsedDatabaseUrl?.port || 3306),
  dbName: shouldUseLocalDbFallback
    ? fallbackDbName
    : process.env.DB_NAME || process.env.MYSQLDATABASE || parsedDatabaseUrl?.database || "verbena_crm",
  dbUser: shouldUseLocalDbFallback
    ? fallbackDbUser
    : process.env.DB_USER || process.env.MYSQLUSER || parsedDatabaseUrl?.user || "root",
  dbPassword: shouldUseLocalDbFallback
    ? fallbackDbPassword
    : process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || parsedDatabaseUrl?.password || "",
  dbSsl: shouldUseLocalDbFallback ? false : parseBoolean(process.env.DB_SSL, false),
  dbSslRejectUnauthorized: parseBoolean(process.env.DB_SSL_REJECT_UNAUTHORIZED, true),
  dbConnectTimeoutMs: parsePositiveInteger(process.env.DB_CONNECT_TIMEOUT_MS, 10000),
  dbConnectRetries: parsePositiveInteger(process.env.DB_CONNECT_RETRIES, 5),
  dbConnectRetryDelayMs: parsePositiveInteger(process.env.DB_CONNECT_RETRY_DELAY_MS, 1500),
  allowStartWithoutDb: parseBoolean(process.env.ALLOW_START_WITHOUT_DB, false),
  uploadDir: resolvedUploadDir
};
