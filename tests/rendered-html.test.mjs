import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import net from "node:net";
import test, { after, before } from "node:test";

let server;
let baseUrl;
let homepageHtml;
let serverOutput = "";

async function availablePort() {
  const listener = net.createServer();
  listener.listen(0, "127.0.0.1");
  await once(listener, "listening");
  const address = listener.address();
  const port = typeof address === "object" && address ? address.port : 3000;
  listener.close();
  await once(listener, "close");
  return port;
}

before(async () => {
  const port = await availablePort();
  baseUrl = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, [".next/standalone/server.js"], {
    cwd: new URL("..", import.meta.url),
    env: { ...process.env, HOSTNAME: "127.0.0.1", PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", (chunk) => (serverOutput += chunk));
  server.stderr.on("data", (chunk) => (serverOutput += chunk));

  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`Server exited during startup.\n${serverOutput}`);
    try {
      const response = await fetch(baseUrl);
      if (response.ok) {
        homepageHtml = await response.text();
        return;
      }
    } catch {
      // The standalone server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Server did not become ready.\n${serverOutput}`);
});

after(async () => {
  if (!server || server.exitCode !== null) return;
  server.kill();
  await Promise.race([once(server, "exit"), new Promise((resolve) => setTimeout(resolve, 3_000))]);
});

test("server-renders the HisChoir entry page", () => {
  assert.match(homepageHtml, /<title>HisChoir<\/title>/i);
  assert.match(homepageHtml, /Sabbath worship/);
  assert.match(homepageHtml, /One workspace/);
  assert.match(homepageHtml, /director workspace/i);
  assert.doesNotMatch(homepageHtml, /codex-preview|Your site is taking shape/i);
});

test("uses PostgreSQL and Railway deployment configuration", async () => {
  const [railway, schema, packageJson, environment] = await Promise.all([
    readFile(new URL("../railway.json", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../.env.example", import.meta.url), "utf8"),
  ]);
  assert.match(railway, /"preDeployCommand"/);
  assert.match(railway, /npm run db:migrate/);
  assert.match(schema, /pgTable/);
  assert.match(packageJson, /"pg"/);
  assert.match(environment, /DATABASE_URL=/);
  assert.doesNotMatch(packageJson, /vinext|wrangler|@cloudflare/);
});
