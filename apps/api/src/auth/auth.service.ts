import { Inject, Injectable } from "@nestjs/common";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { CookieOptions, Request } from "express";
import type { Role } from "../common/types";
import { APP_ENV, type AppEnv } from "../config/env";
import { DatabaseService } from "../database/database.service";

export const SESSION_COOKIE = "service_set_session";

const MAX_AGE: Record<Role, number> = {
  admin: 60 * 60 * 8,
  team: 60 * 60 * 24 * 30,
};

@Injectable()
export class AuthService {
  constructor(
    private readonly database: DatabaseService,
    @Inject(APP_ENV) private readonly env: AppEnv,
  ) {}

  private sign(payload: string) {
    return createHmac("sha256", this.env.sessionSecret).update(payload).digest("base64url");
  }

  /** Constant-time comparison over digests, so length never leaks. */
  async safeEqual(left: string, right: string) {
    const a = createHash("sha256").update(left).digest();
    const b = createHash("sha256").update(right).digest();
    return timingSafeEqual(a, b);
  }

  passcodeFor(role: Role) {
    return role === "admin" ? this.env.adminPasscode : this.env.teamPasscode;
  }

  /**
   * The web app lives on another origin, so the cookie policy is configuration
   * rather than a constant. See cookiePolicy() in config/env.ts.
   */
  cookieOptions(maxAgeSeconds?: number): CookieOptions {
    return {
      httpOnly: true,
      sameSite: this.env.cookieSameSite,
      secure: this.env.cookieSecure,
      domain: this.env.cookieDomain,
      path: "/",
      ...(maxAgeSeconds === undefined ? {} : { maxAge: maxAgeSeconds * 1000 }),
    };
  }

  createSession(role: Role) {
    const maxAge = MAX_AGE[role];
    const payload = `${role}.${Math.floor(Date.now() / 1000) + maxAge}`;
    return { value: `${payload}.${this.sign(payload)}`, maxAge };
  }

  roleFromRequest(request: Request): Role | null {
    const raw = (request.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE];
    if (!raw) return null;

    const [role, expires, signature] = raw.split(".");
    if ((role !== "admin" && role !== "team") || !expires || !signature) return null;
    if (Number(expires) <= Math.floor(Date.now() / 1000)) return null;

    const expected = this.sign(`${role}.${expires}`);
    if (signature.length !== expected.length) return null;
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected)) ? role : null;
  }

  private attemptKey(request: Request, role: Role) {
    const forwarded = request.headers["x-forwarded-for"];
    const ip =
      (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0].trim() ??
      request.ip ??
      "local";
    return createHash("sha256").update(`${role}:${ip}`).digest("base64url");
  }

  async isRateLimited(request: Request, role: Role) {
    const result = await this.database.query<{ count: number }>(
      `SELECT COUNT(*)::integer AS count
       FROM auth_attempts
       WHERE key_hash = $1 AND role = $2 AND succeeded = FALSE
         AND attempted_at >= NOW() - INTERVAL '15 minutes'`,
      [this.attemptKey(request, role), role],
    );
    return Number(result.rows[0]?.count ?? 0) >= 5;
  }

  async recordAttempt(request: Request, role: Role, succeeded: boolean) {
    const keyHash = this.attemptKey(request, role);
    await this.database.transaction(async (client) => {
      await client.query("INSERT INTO auth_attempts (key_hash, role, succeeded) VALUES ($1, $2, $3)", [
        keyHash,
        role,
        succeeded,
      ]);
      await client.query("DELETE FROM auth_attempts WHERE attempted_at < NOW() - INTERVAL '1 day'");
    });
  }
}
