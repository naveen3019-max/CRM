import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "backend", ".env") });

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "verbena_crm"
});

try {
  const connection = await pool.getConnection();
  
  // Check conversations table
  const [convResult] = await connection.query("SHOW FULL COLUMNS FROM conversations WHERE Field = 'scope'");
  console.log("Conversations scope column:");
  console.log(convResult[0]);
  
  // Check groups table
  const [groupResult] = await connection.query("SHOW FULL COLUMNS FROM `groups` WHERE Field = 'scope'");
  console.log("\nGroups scope column:");
  console.log(groupResult[0]);
  
  connection.release();
  await pool.end();
} catch (error) {
  console.error("✗ Error:", error.message);
  await pool.end();
  process.exit(1);
}
