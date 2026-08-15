import { Global, Module } from "@nestjs/common";
import { APP_ENV, loadEnv } from "./env";

/**
 * Global so every module resolves APP_ENV without importing this one.
 * loadEnv() throws on a missing or contradictory configuration, which fails
 * the deploy at boot rather than on the first request.
 */
@Global()
@Module({
  providers: [{ provide: APP_ENV, useFactory: loadEnv }],
  exports: [APP_ENV],
})
export class AppConfigModule {}
