import { getDatabase, withTransaction } from "@/db";
import { runtimeEnv } from "@/lib/runtime";
import type { Role } from "@/lib/types";

const COOKIE = "service_set_session";
const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function digest(value: string) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

async function hmac(value: string) {
  const secret = runtimeEnv().SESSION_SECRET;
  if (!secret) throw new Error("Access has not been configured yet.");
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value))));
}

export async function safeEqual(left: string, right: string) {
  const [a, b] = await Promise.all([digest(left), digest(right)]);
  let difference = a.length ^ b.length;
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    difference |= (a[index] ?? 0) ^ (b[index] ?? 0);
  }
  return difference === 0;
}

export async function createSessionCookie(request: Request, role: Role) {
  const maxAge = role === "admin" ? 60 * 60 * 8 : 60 * 60 * 24 * 30;
  const payload = `${role}.${Math.floor(Date.now() / 1000) + maxAge}`;
  const signature = await hmac(payload);
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE}=${payload}.${signature}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function clearSessionCookie(request: Request) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export async function getSessionRole(request: Request): Promise<Role | null> {
  const header = request.headers.get("cookie") ?? "";
  const raw = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1);
  if (!raw) return null;

  const [role, expires, signature] = raw.split(".");
  if ((role !== "admin" && role !== "team") || !expires || !signature) return null;
  if (Number(expires) <= Math.floor(Date.now() / 1000)) return null;

  try {
    return (await safeEqual(signature, await hmac(`${role}.${expires}`))) ? role : null;
  } catch {
    return null;
  }
}

export async function requireRole(request: Request, required: Role) {
  const role = await getSessionRole(request);
  if (!role || (required === "admin" && role !== "admin")) {
    return Response.json({ error: "Please enter the correct passcode to continue." }, { status: 401 });
  }
  return null;
}

async function attemptKey(request: Request, role: Role) {
  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for") ?? "local";
  return toBase64Url(await digest(`${role}:${ip.split(",")[0].trim()}`));
}

export async function isRateLimited(request: Request, role: Role) {
  const keyHash = await attemptKey(request, role);
  const result = await getDatabase().query<{ count: number }>(
    `SELECT COUNT(*)::integer AS count
     FROM auth_attempts
     WHERE key_hash = $1 AND role = $2 AND succeeded = FALSE
       AND attempted_at >= NOW() - INTERVAL '15 minutes'`,
    [keyHash, role],
  );
  return Number(result.rows[0]?.count ?? 0) >= 5;
}

export async function recordAttempt(request: Request, role: Role, succeeded: boolean) {
  const keyHash = await attemptKey(request, role);
  await withTransaction(async (database) => {
    await database.query(
      "INSERT INTO auth_attempts (key_hash, role, succeeded) VALUES ($1, $2, $3)",
      [keyHash, role, succeeded],
    );
    await database.query("DELETE FROM auth_attempts WHERE attempted_at < NOW() - INTERVAL '1 day'");
  });
}
