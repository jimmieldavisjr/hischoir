export const APP_ENV = "APP_ENV";

export type CookieSameSite = "lax" | "none";

export interface AppEnv {
  port: number;
  databaseUrl: string;
  databasePoolSize: number;
  sessionSecret: string;
  adminPasscode?: string;
  teamPasscode?: string;
  youtubeApiKey?: string;
  /** Browser origins allowed to send credentialed requests. */
  webOrigins: string[];
  cookieSameSite: CookieSameSite;
  cookieSecure: boolean;
  /** Set to a shared parent domain (".hischoir.org") to keep the session same-site. */
  cookieDomain?: string;
}

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required. Set it on the Railway service.`);
  return value;
}

function optional(name: string) {
  return process.env[name]?.trim() || undefined;
}

function boolish(name: string, fallback: boolean) {
  const value = optional(name)?.toLowerCase();
  if (value === undefined) return fallback;
  return value === "true" || value === "1" || value === "yes";
}

/**
 * The web app is served from a different origin than this API, so the session
 * cookie has to be readable across that boundary. Two supported shapes:
 *
 *   - Different registrable domains (hischoir.vercel.app + api.up.railway.app):
 *     SameSite=None; Secure. Requires third-party cookies in the browser.
 *   - A shared parent domain (hischoir.org + api.hischoir.org):
 *     SameSite=Lax with COOKIE_DOMAIN=.hischoir.org. Same-site, so no
 *     third-party cookie restrictions apply. This is the durable setup.
 */
function cookiePolicy(production: boolean) {
  const configured = optional("COOKIE_SAMESITE")?.toLowerCase();
  if (configured && configured !== "lax" && configured !== "none") {
    throw new Error('COOKIE_SAMESITE must be "lax" or "none".');
  }
  const sameSite: CookieSameSite = (configured as CookieSameSite) ?? (production ? "none" : "lax");
  const secure = boolish("COOKIE_SECURE", production || sameSite === "none");

  if (sameSite === "none" && !secure) {
    throw new Error("COOKIE_SAMESITE=none requires COOKIE_SECURE=true; browsers reject it otherwise.");
  }
  return { sameSite, secure, domain: optional("COOKIE_DOMAIN") };
}

function origins(production: boolean) {
  const raw = optional("WEB_ORIGIN");
  if (!raw) {
    if (production) throw new Error("WEB_ORIGIN is required. Set it to the Vercel URL of the web app.");
    return ["http://localhost:3000"];
  }
  const list = raw
    .split(",")
    .map((value) => value.trim().replace(/\/$/, ""))
    .filter(Boolean);
  if (list.includes("*")) {
    throw new Error("WEB_ORIGIN cannot be '*'; credentialed CORS requires explicit origins.");
  }
  if (list.length === 0) throw new Error("WEB_ORIGIN did not contain a usable origin.");
  return list;
}

export function loadEnv(): AppEnv {
  const production = process.env.NODE_ENV === "production";
  const cookie = cookiePolicy(production);
  const sessionSecret = required("SESSION_SECRET");

  if (sessionSecret.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters.");
  }

  return Object.freeze({
    port: Number(process.env.PORT ?? 8080),
    databaseUrl: required("DATABASE_URL"),
    databasePoolSize: Number(process.env.DATABASE_POOL_SIZE ?? 10),
    sessionSecret,
    adminPasscode: optional("ADMIN_PASSCODE"),
    teamPasscode: optional("TEAM_PASSCODE"),
    youtubeApiKey: optional("YOUTUBE_API_KEY"),
    webOrigins: origins(production),
    cookieSameSite: cookie.sameSite,
    cookieSecure: cookie.secure,
    cookieDomain: cookie.domain,
  });
}
