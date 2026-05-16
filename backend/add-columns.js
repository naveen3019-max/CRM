import mysql from "mysql2/promise";
import { env } from "./src/config/env.js";

async function addColumns() {
  const pool = mysql.createPool({
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
    connectionLimit: 2,
    multipleStatements: true
  });

  try {
    const columns = [
      "ALTER TABLE users ADD COLUMN phone VARCHAR(30) NULL AFTER mobile",
      "ALTER TABLE users ADD COLUMN state VARCHAR(100) NULL",
      "ALTER TABLE users ADD COLUMN city VARCHAR(100) NULL",
      "ALTER TABLE users ADD COLUMN pincode VARCHAR(10) NULL",
      "ALTER TABLE users ADD COLUMN experience INT NULL",
      "ALTER TABLE users ADD COLUMN about TEXT NULL",
      "ALTER TABLE users ADD COLUMN skills TEXT NULL",
      "ALTER TABLE users ADD COLUMN work_type VARCHAR(255) NULL",
      "ALTER TABLE users ADD COLUMN profile_completed TINYINT(1) NOT NULL DEFAULT 0"
    ];

    for (const col of columns) {
      try {
        console.log(`Executing: ${col}`);
        await pool.query(col);
        console.log("✓ Success");
      } catch (err) {
        if (err.code === "ER_DUP_FIELDNAME") {
          console.log("✓ Column already exists, skipping");
        } else {
          console.error(`✗ Error: ${err.message}`);
        }
      }
    }

    console.log("\n✓ All columns processed");
    await pool.end();
  } catch (err) {
    console.error("Failed:", err);
    process.exit(1);
  }
}

addColumns();
