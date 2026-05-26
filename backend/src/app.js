import compression from "compression";
import cors from "cors";
import express from "express";
import fs from "fs";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import { env } from "./config/env.js";
import { errorMiddleware, notFoundMiddleware } from "./middleware/error.middleware.js";
import { apiRouter } from "./routes/index.js";
import { createCorsOriginChecker } from "./utils/cors.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const isAllowedOrigin = createCorsOriginChecker(env.clientUrls);

app.set("trust proxy", 1);

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    credentials: true
  })
);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);
app.use(compression());
app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: env.nodeEnv === "production" ? 250 : 5000,
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.use("/api", apiRouter);
app.use("/uploads", express.static(path.resolve(env.uploadDir)));
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Verbena Tech API is healthy"
  });
});

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Verbena Tech API is running"
  });
});

// Serve frontend static assets when built (single-app deployment)
try {
  const frontendDist = path.resolve(__dirname, "../../frontend/dist");
  if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));

    // SPA fallback: serve index.html for non-API routes
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api") || req.path.startsWith("/uploads") || req.path.startsWith("/socket.io")) {
        return next();
      }

      res.sendFile(path.join(frontendDist, "index.html"));
    });
  }
} catch (err) {
  // ignore if frontend not present
}

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
