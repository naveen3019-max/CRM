import pg from "pg";
const { Pool } = pg;
import {
  env,
  getDatabaseStartupDiagnostics,
  getRawDatabaseEnvDiagnostics,
  getResolvedDatabaseConfig
} from "./env.js";

const poolConfig = {
  host: env.dbHost,
  port: env.dbPort,
  user: env.dbUser,
  password: env.dbPassword,
  database: env.dbName,
  ssl: env.dbSsl
    ? {
        rejectUnauthorized: env.dbSslRejectUnauthorized
      }
    : undefined,
  max: 15,
  connectionTimeoutMillis: env.dbConnectTimeoutMs,
  idleTimeoutMillis: 30000,
};

const rawDatabaseEnvDiagnostics = getRawDatabaseEnvDiagnostics();
console.log("DATABASE_URL:", rawDatabaseEnvDiagnostics.DATABASE_URL);
console.log("Resolved Database Config:", {
  host: env.dbHost,
  port: env.dbPort,
  database: env.dbName,
  user: env.dbUser
});
console.log("[Database] Resolved configuration before new Pool():", getDatabaseStartupDiagnostics());

export const pool = new Pool(poolConfig);

const transientConnectionErrorCodes = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EPIPE",
  "ENOTFOUND",
  "EAI_AGAIN",
  "28P01", // Invalid password
  "3D000", // Invalid catalog name
  "08001", // sqlclient_unable_to_establish_sqlconnection
  "08006", // connection_failure
]);

export function isTransientConnectionError(error) {
  return transientConnectionErrorCodes.has(error?.code);
}

export function serializeDatabaseError(error) {
  if (!error) {
    return null;
  }

  return {
    name: error.name,
    message: error.message,
    code: error.code,
    stack: error.stack
  };
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function verifyDatabaseConnection() {
  let attempt = 1;

  while (attempt <= env.dbConnectRetries) {
    let client;

    try {
      client = await pool.connect();
      await client.query("SELECT 1");
      console.log("[Database] Connection verified successfully");
      console.log(`Host: ${env.dbHost}`);
      console.log(`Port: ${env.dbPort}`);
      return;
    } catch (error) {
      console.error(`[Database] SELECT 1 failed on attempt ${attempt}/${env.dbConnectRetries}:`, serializeDatabaseError(error));
      const shouldRetry = isTransientConnectionError(error) && attempt < env.dbConnectRetries;

      if (!shouldRetry) {
        throw error;
      }

      console.warn(
        `Database connection attempt ${attempt}/${env.dbConnectRetries} failed with ${error.code}. Retrying in ${env.dbConnectRetryDelayMs}ms...`
      );
      await wait(env.dbConnectRetryDelayMs);
      attempt += 1;
    } finally {
      if (client) {
        client.release();
      }
    }
  }
}

export function getDatabaseDebugSummary() {
  return {
    ...getResolvedDatabaseConfig(),
    sslRejectUnauthorized: env.dbSslRejectUnauthorized,
    connectTimeoutMs: env.dbConnectTimeoutMs,
    connectRetries: env.dbConnectRetries,
    connectRetryDelayMs: env.dbConnectRetryDelayMs,
    databaseUrlDetected: env.databaseUrlDetected,
  };
}
