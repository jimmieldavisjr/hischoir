import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import cookieParser from "cookie-parser";
import { config as loadDotenv } from "dotenv";
import { AppModule } from "./app.module";
import { ErrorFilter } from "./common/error.filter";
import { APP_ENV, type AppEnv } from "./config/env";

// Local development reads .env.local; Railway injects real variables, where
// these files are absent and the calls are no-ops.
loadDotenv({ path: ".env.local", quiet: true });
loadDotenv({ quiet: true });

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  const env = app.get<AppEnv>(APP_ENV);
  const logger = new Logger("Bootstrap");

  // Railway terminates TLS ahead of the app; trust it so req.ip and secure
  // cookies reflect the original request rather than the proxy hop.
  app.set("trust proxy", 1);

  app.use(cookieParser());
  app.setGlobalPrefix("api");
  app.useGlobalFilters(new ErrorFilter());

  // Credentialed CORS cannot use a wildcard: the browser requires the response
  // to name the exact requesting origin.
  app.enableCors({
    origin: env.webOrigins,
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
    maxAge: 86_400,
  });

  await app.listen(env.port, "0.0.0.0");
  logger.log(`HisChoir API listening on :${env.port}`);
  logger.log(`Allowed web origins: ${env.webOrigins.join(", ")}`);
  logger.log(`Session cookie: SameSite=${env.cookieSameSite}; Secure=${env.cookieSecure}`);
}

void bootstrap();
