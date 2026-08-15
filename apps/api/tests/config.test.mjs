import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { loadEnv } from "../dist/config/env.js";

const BASE = {
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/hischoir",
  SESSION_SECRET: "a".repeat(32),
};

function withEnv(overrides) {
  Object.assign(process.env, BASE, overrides);
  return loadEnv();
}

beforeEach(() => {
  for (const key of [
    "NODE_ENV",
    "WEB_ORIGIN",
    "COOKIE_SAMESITE",
    "COOKIE_SECURE",
    "COOKIE_DOMAIN",
    "DATABASE_URL",
    "SESSION_SECRET",
  ]) {
    delete process.env[key];
  }
});

test("defaults to a same-site cookie for local development", () => {
  const env = withEnv({});
  assert.equal(env.cookieSameSite, "lax");
  assert.equal(env.cookieSecure, false);
  assert.deepEqual(env.webOrigins, ["http://localhost:3000"]);
});

test("defaults to a cross-site cookie in production", () => {
  const env = withEnv({ NODE_ENV: "production", WEB_ORIGIN: "https://hischoir.vercel.app" });
  assert.equal(env.cookieSameSite, "none");
  assert.equal(env.cookieSecure, true);
});

test("supports a shared parent domain so the session stays same-site", () => {
  const env = withEnv({
    NODE_ENV: "production",
    WEB_ORIGIN: "https://hischoir.org",
    COOKIE_SAMESITE: "lax",
    COOKIE_DOMAIN: ".hischoir.org",
  });
  assert.equal(env.cookieSameSite, "lax");
  assert.equal(env.cookieDomain, ".hischoir.org");
});

test("rejects SameSite=None without Secure, which browsers discard", () => {
  assert.throws(
    () => withEnv({ COOKIE_SAMESITE: "none", COOKIE_SECURE: "false" }),
    /requires COOKIE_SECURE=true/,
  );
});

test("parses several allowed origins and trims trailing slashes", () => {
  const env = withEnv({
    NODE_ENV: "production",
    WEB_ORIGIN: "https://hischoir.org/, https://hischoir.vercel.app",
  });
  assert.deepEqual(env.webOrigins, ["https://hischoir.org", "https://hischoir.vercel.app"]);
});

test("refuses a wildcard origin, which cannot carry credentials", () => {
  assert.throws(() => withEnv({ NODE_ENV: "production", WEB_ORIGIN: "*" }), /cannot be '\*'/);
});

test("requires WEB_ORIGIN in production", () => {
  assert.throws(() => withEnv({ NODE_ENV: "production" }), /WEB_ORIGIN is required/);
});

test("requires a session secret long enough to sign with", () => {
  assert.throws(() => {
    Object.assign(process.env, BASE, { SESSION_SECRET: "too-short" });
    return loadEnv();
  }, /at least 32 characters/);
});
