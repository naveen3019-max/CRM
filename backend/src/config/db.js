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
  timezone: "Z"
});

export async function verifyDatabaseConnection() {
  const connection = await pool.getConnection();
  try {
    await connection.query("SELECT 1");
  } finally {
    connection.release();
  }
}
