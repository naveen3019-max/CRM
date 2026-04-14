import fs from "fs";
import http from "http";
import path from "path";
import app from "./app.js";
import { env } from "./config/env.js";
import { verifyDatabaseConnection } from "./config/db.js";
import { initSocketServer } from "./sockets/index.js";

async function bootstrap() {
  const uploadPath = path.resolve(env.uploadDir);
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }

  await verifyDatabaseConnection();

  const server = http.createServer(app);
  initSocketServer(server);

  server.listen(env.port, () => {
    console.log(`Server listening on port ${env.port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start backend", error);
  process.exit(1);
});
