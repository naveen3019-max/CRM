import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "../..");
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const clientUrlSetting = process.env.CLIENT_URL || "http://localhost:5173";
const clientUrls = clientUrlSetting
  .split(",")
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

const uploadDirSetting = process.env.UPLOAD_DIR || "uploads";
const resolvedUploadDir = path.isAbsolute(uploadDirSetting)
  ? uploadDirSetting
  : path.resolve(backendRoot, uploadDirSetting);

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 5000),
  clientUrl: clientUrlSetting,
  clientUrls,
  jwtSecret: process.env.JWT_SECRET || "dev_secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
  dbHost: process.env.DB_HOST || "localhost",
  dbPort: Number(process.env.DB_PORT || 3306),
  dbName: process.env.DB_NAME || "verbena_crm",
  dbUser: process.env.DB_USER || "root",
  dbPassword: process.env.DB_PASSWORD || "",
  dbSsl: parseBoolean(process.env.DB_SSL, false),
  dbSslRejectUnauthorized: parseBoolean(process.env.DB_SSL_REJECT_UNAUTHORIZED, true),
  uploadDir: resolvedUploadDir
};
