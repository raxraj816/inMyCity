import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { authMiddleware } from "./middlewares/authMiddleware";
import {
  aiPerDayRateLimit,
  aiPerMinuteRateLimit,
  apiRateLimit,
} from "./middlewares/rateLimit";
import { CorsError, buildCorsOptions, securityHeaders } from "./lib/security";

const app: Express = express();

// Behind a load balancer, `req.ip` must reflect X-Forwarded-For for rate limiting to key on
// the real client rather than the proxy.
app.set("trust proxy", process.env.TRUST_PROXY === "true" ? 1 : false);

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

app.use(securityHeaders);
app.use(cors(buildCorsOptions()));
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(authMiddleware);

app.use("/api", apiRateLimit);

// The AI endpoint costs real money per call, so it gets tighter budgets of its own.
app.use("/api/ai", aiPerMinuteRateLimit, aiPerDayRateLimit);

app.use("/api", router);

// Blocked cross-origin requests are a client error, not a server fault: answer 403 rather
// than letting the CORS rejection surface as an unhandled 500.
app.use(
  (
    err: unknown,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    if (err instanceof CorsError) {
      req.log?.warn({ origin: req.headers.origin }, "Blocked cross-origin request");
      res.status(err.status).json({ error: "Origin not allowed" });
      return;
    }
    next(err);
  },
);

export default app;
