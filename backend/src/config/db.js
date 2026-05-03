import mysql from "mysql2/promise";
import { env } from "./env.js";

export const pool = mysql.createPool({
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
});

const transientConnectionErrorCodes = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EPIPE",
  "ENOTFOUND",
  "PROTOCOL_CONNECTION_LOST"
]);

function isTransientConnectionError(error) {
  return transientConnectionErrorCodes.has(error?.code);
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
      return;
    } catch (error) {
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
