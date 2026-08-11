import { getSessionRole } from "@/lib/auth";

export async function GET(request: Request) {
  return Response.json({ role: await getSessionRole(request) });
}
