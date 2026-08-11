import { checkDatabase } from "@/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Liveness probe for the Railway healthcheck.
 *
 * The healthcheck decides whether a new deployment replaces the running one, so
 * it reports on the web server only: a database that is still waking up, or a
 * brief connection blip, must not roll a good release back. The database result
 * is reported in the body (and in the logs) for diagnosis instead.
 */
export async function GET() {
  let database = "connected";

  try {
    await checkDatabase();
  } catch (error) {
    database = "unavailable";
    console.error("HisChoir healthcheck could not reach the database:", error);
  }

  return Response.json(
    { status: "ok", database },
    { headers: { "Cache-Control": "no-store" } },
  );
}
