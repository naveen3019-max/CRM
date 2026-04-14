import compression from "compression";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { env } from "./config/env.js";
import { errorMiddleware, notFoundMiddleware } from "./middleware/error.middleware.js";
import { apiRouter } from "./routes/index.js";
import { createCorsOriginChecker } from "./utils/cors.js";

const app = express();
const isAllowedOrigin = createCorsOriginChecker(env.clientUrls);

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked origin: ${origin || "unknown"}`));
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
    limit: 250,
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.use("/uploads", express.static(path.resolve(env.uploadDir)));
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Verbena Tech API is healthy"
  });
});

app.use("/api", apiRouter);
app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
