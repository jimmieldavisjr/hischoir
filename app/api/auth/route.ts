import { createSessionCookie, isRateLimited, recordAttempt, safeEqual } from "@/lib/auth";
import { runtimeEnv } from "@/lib/runtime";
import type { Role } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { role?: Role; passcode?: string };
    if (body.role !== "admin" && body.role !== "team") {
      return Response.json({ error: "Choose director or team access." }, { status: 400 });
    }
    if (await isRateLimited(request, body.role)) {
      return Response.json({ error: "Too many attempts. Please wait 15 minutes and try again." }, { status: 429 });
    }
    const expected = body.role === "admin" ? runtimeEnv().ADMIN_PASSCODE : runtimeEnv().TEAM_PASSCODE;
    if (!expected) {
      return Response.json({ error: "This access area has not been configured yet." }, { status: 503 });
    }
    const succeeded = await safeEqual(body.passcode ?? "", expected);
    await recordAttempt(request, body.role, succeeded);
    if (!succeeded) {
      return Response.json({ error: "That passcode wasn’t recognized." }, { status: 401 });
    }
    return Response.json(
      { ok: true, role: body.role },
      { headers: { "Set-Cookie": await createSessionCookie(request, body.role) } },
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to sign in." },
      { status: 500 },
    );
  }
}
