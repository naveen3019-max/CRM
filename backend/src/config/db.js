import mysql from "mysql2/promise";
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
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  timezone: "Z",
  connectTimeout: env.dbConnectTimeoutMs,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
};

const rawDatabaseEnvDiagnostics = getRawDatabaseEnvDiagnostics();
console.log("MYSQL_PUBLIC_URL:", rawDatabaseEnvDiagnostics.MYSQL_PUBLIC_URL);
console.log("MYSQL_URL:", rawDatabaseEnvDiagnostics.MYSQL_URL);
console.log("DATABASE_URL:", rawDatabaseEnvDiagnostics.DATABASE_URL);
console.log("Resolved Database Config:", {
  host: env.dbHost,
  port: env.dbPort,
  database: env.dbName,
  user: env.dbUser
});
console.log("[Database] Resolved configuration before mysql.createPool():", getDatabaseStartupDiagnostics());

if (!env.isExpectedRailwayPublicHost || !env.isExpectedRailwayPublicPort || env.usesStaleRailwayEndpoint) {
  console.warn("[Database] Railway endpoint check:", {
    expectedHost: "metro.proxy.rlwy.net",
    expectedPort: 22437,
    actualHost: env.dbHost,
    actualPort: env.dbPort,
    staleRailwayEndpointDetected: env.usesStaleRailwayEndpoint
  });
}

export const pool = mysql.createPool(poolConfig);

const transientConnectionErrorCodes = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EPIPE",
  "ENOTFOUND",
  "EAI_AGAIN",
  "PROTOCOL_CONNECTION_LOST",
  "HANDSHAKE_SSL_ERROR"
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
    errno: error.errno,
    sqlState: error.sqlState,
    sqlMessage: error.sqlMessage,
    fatal: error.fatal,
    stack: error.stack
  };
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function verifyDatabaseConnection() {
  let attempt = 1;

  while (attempt <= env.dbConnectRetries) {
    let connection;

    try {
      connection = await pool.getConnection();
      await connection.query("SELECT 1");
      console.log("[Database] Connection verified successfully");
      console.log(`Host: ${env.dbHost}`);
      console.log(`Port: ${env.dbPort}`);
      console.log(`staleRailwayEndpointDetected: ${env.usesStaleRailwayEndpoint}`);
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
      if (connection) {
        connection.release();
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
    MYSQL_PUBLIC_URL_detected: env.mysqlPublicUrlDetected,
    MYSQL_PUBLIC_URL_parsed: env.mysqlPublicUrlParsed,
    MYSQL_PUBLIC_URL_host: env.mysqlPublicUrlHost || null,
    MYSQL_PUBLIC_URL_port: env.mysqlPublicUrlPort,
    expectedRailwayPublicHost: "metro.proxy.rlwy.net",
    expectedRailwayPublicPort: 22437,
    usingExpectedRailwayPublicHost: env.isExpectedRailwayPublicHost,
    usingExpectedRailwayPublicPort: env.isExpectedRailwayPublicPort,
    staleRailwayEndpointDetected: env.usesStaleRailwayEndpoint
  };
}
