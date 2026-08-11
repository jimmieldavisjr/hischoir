import { requireRole } from "@/lib/auth";
import { getServicePlan } from "@/lib/data";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const unauthorized = await requireRole(request, "team");
  if (unauthorized) return unauthorized;
  try {
    const { token } = await params;
    const service = await getServicePlan(token, true);
    if (!service) return Response.json({ error: "This service plan was not found." }, { status: 404 });
    return Response.json({ service });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to load the service plan." },
      { status: 500 },
    );
  }
}
