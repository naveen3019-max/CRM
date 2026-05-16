import fs from "fs";
import http from "http";
import path from "path";
import app from "./app.js";
import { env } from "./config/env.js";
import { getDatabaseDebugSummary, verifyDatabaseConnection } from "./config/db.js";
import { ensureGroupChatSchema } from "./database/groupChatSchema.js";
import { initSocketServer } from "./sockets/index.js";

async function bootstrap() {
  const uploadPath = path.resolve(env.uploadDir);
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }

  try {
    await verifyDatabaseConnection();
    await ensureGroupChatSchema();
  } catch (error) {
    if (!env.allowStartWithoutDb) {
      throw error;
    }

    console.warn("Database unavailable at startup. Continuing because ALLOW_START_WITHOUT_DB=true.");
  }

  const server = http.createServer(app);
  initSocketServer(server);

  return new Promise((resolve) => {
    server.listen(env.port, () => {
      console.log(`Server listening on port ${env.port}`);
      resolve(server);
    });
  });
}

// Global error handlers
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

bootstrap().catch((error) => {
  const dbSummary = getDatabaseDebugSummary();
  console.error("Database config summary:", dbSummary);

  if (error?.code === "PROTOCOL_CONNECTION_LOST") {
    console.error(
      "Database handshake failed. Verify DB endpoint points to a MySQL service (not Postgres) and credentials/port match Railway MYSQLHOST/MYSQLPORT/MYSQLDATABASE/MYSQLUSER/MYSQLPASSWORD."
    );
  }

  console.error("Failed to start backend", error);
  process.exit(1);
});
