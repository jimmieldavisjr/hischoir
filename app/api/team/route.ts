import { requireRole } from "@/lib/auth";
import { listServices } from "@/lib/data";

export async function GET(request: Request) {
  const unauthorized = await requireRole(request, "team");
  if (unauthorized) return unauthorized;
  try {
    return Response.json({ services: await listServices() });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to load services." },
      { status: 500 },
    );
  }
}
