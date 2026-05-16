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
  
  // Fix conversations table
  await connection.query(
    "ALTER TABLE conversations MODIFY COLUMN scope ENUM('sales_customer','admin_sales','admin_vendor','admin_electrician','admin_field_work','admin_customer','sales_vendor','vendor_electrician','vendor_customer','vendor_field_work','customer_electrician','sales_electrician') NOT NULL"
  );
  console.log("✓ ALTER TABLE conversations completed");
  
  // Fix groups table (groups is a reserved keyword, must use backticks)
  await connection.query(
    "ALTER TABLE `groups` MODIFY COLUMN scope ENUM('custom','admin_sales','admin_vendor','admin_electrician','admin_field_work','admin_customer','sales_customer','sales_vendor','vendor_electrician','vendor_customer','vendor_field_work','customer_electrician','sales_electrician') NOT NULL"
  );
  console.log("✓ ALTER TABLE groups completed");
  
  connection.release();
  await pool.end();
} catch (error) {
  console.error("✗ Error:", error.message);
  await pool.end();
  process.exit(1);
}
