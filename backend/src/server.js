import fs from "fs";
import http from "http";
import path from "path";
import app from "./app.js";
import { env, validateEnv } from "./config/env.js";
import { getDatabaseDebugSummary, verifyDatabaseConnection } from "./config/db.js";
import { ensureGroupChatSchema } from "./database/groupChatSchema.js";
import { ensureTranslationColumnsExist } from "./repositories/chat.repository.js";
import { ensureCancelReasonColumnExists } from "./repositories/serviceRequest.repository.js";
import { ensureWorkAssignmentsTableExists } from "./repositories/workAssignment.repository.js";
import { initSocketServer } from "./sockets/index.js";

async function runDatabaseStartupTasks() {
  try {
    await verifyDatabaseConnection();
    await ensureGroupChatSchema();
    await ensureTranslationColumnsExist();
    await ensureCancelReasonColumnExists();
    await ensureWorkAssignmentsTableExists();
  } catch (error) {
    const dbSummary = getDatabaseDebugSummary();
    console.error("Database startup task failed. Config summary:", dbSummary);

    if (error?.code === "PROTOCOL_CONNECTION_LOST") {
      console.error(
        "Database handshake failed. Verify DB endpoint points to a MySQL service and credentials/port match the Railway public MySQL endpoint."
      );
    }

    console.error("Database startup task error:", error);
  }
}

async function bootstrap() {
  validateEnv();

  const uploadPath = path.resolve(env.uploadDir);
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }

  const server = http.createServer(app);
  initSocketServer(server);

  return new Promise((resolve) => {
    server.listen(env.port, "0.0.0.0", () => {
      console.log(`Server listening on port ${env.port} and binding to 0.0.0.0`);
      runDatabaseStartupTasks();
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
  console.error("Failed to start backend", error);
  process.exit(1);
});
