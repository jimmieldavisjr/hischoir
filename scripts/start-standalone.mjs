import net from "node:net";

/**
 * Starts the standalone Next.js server with a bind address Railway can reach.
 *
 * The generated server listens on `process.env.HOSTNAME || "0.0.0.0"`, and
 * container runtimes set HOSTNAME to the container id, which binds the server
 * to a single private address. Railway also routes healthchecks and private
 * traffic over IPv6, so the server has to listen on `::` (which accepts IPv4
 * connections too) rather than on `0.0.0.0`.
 */
async function canBind(host) {
  const listener = net.createServer();
  return new Promise((resolve) => {
    listener.once("error", () => resolve(false));
    listener.listen(0, host, () => listener.close(() => resolve(true)));
  });
}

const requested = process.env.HOST?.trim();
process.env.HOSTNAME = requested || ((await canBind("::")) ? "::" : "0.0.0.0");

console.log(`HisChoir is listening on ${process.env.HOSTNAME}:${process.env.PORT ?? 3000}`);

await import("../.next/standalone/server.js");
