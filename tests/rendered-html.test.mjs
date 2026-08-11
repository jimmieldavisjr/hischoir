import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html", host: "localhost" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the HisChoir entry page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>HisChoir<\/title>/i);
  assert.match(html, /Sabbath worship/);
  assert.match(html, /One workspace/);
  assert.match(html, /director workspace/i);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/i);
});

test("uses durable storage and removes the disposable starter", async () => {
  const [hosting, schema, packageJson] = await Promise.all([
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);
  assert.match(hosting, /"d1": "DB"/);
  assert.match(schema, /serviceItems/);
  assert.match(packageJson, /"name": "hischoir"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(page, /_sites-preview|SkeletonPreview/);
});
