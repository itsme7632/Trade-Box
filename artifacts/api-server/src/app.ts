import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

const isDev = process.env.NODE_ENV !== "production";

function buildCorsOrigins(): string[] | boolean {
  const raw = process.env.ALLOWED_ORIGINS;
  if (raw) {
    return raw.split(",").map((o) => o.trim()).filter(Boolean);
  }
  if (isDev) {
    return true;
  }
  logger.warn("ALLOWED_ORIGINS is not set — defaulting to same-origin only. Set ALLOWED_ORIGINS in production.");
  return false;
}

const allowedOrigins = buildCorsOrigins();

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
