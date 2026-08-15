import { Controller, Get, Header, HttpStatus, Res } from "@nestjs/common";
import type { Response } from "express";
import { DatabaseService } from "../database/database.service";

/**
 * Railway gates each release on this endpoint (healthcheckPath in railway.json),
 * so it reports the database connection rather than just process liveness.
 */
@Controller("health")
export class HealthController {
  constructor(private readonly database: DatabaseService) {}

  @Get()
  @Header("Cache-Control", "no-store")
  async check(@Res({ passthrough: true }) response: Response) {
    try {
      await this.database.query("SELECT 1");
      return { status: "ok" };
    } catch {
      response.status(HttpStatus.SERVICE_UNAVAILABLE);
      return { status: "unavailable" };
    }
  }
}
