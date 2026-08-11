import { requireRole } from "@/lib/auth";
import {
  addSong,
  createService,
  deleteService,
  duplicateService,
  getPlannerPayload,
  removeItem,
  reorderItems,
  updateItem,
  updateService,
} from "@/lib/data";
import { syncYouTubePlaylist } from "@/lib/youtube";

type PlannerAction =
  | { action: "createService"; serviceDate: string; label: string }
  | { action: "updateService"; serviceId: string; serviceDate: string; label: string }
  | { action: "deleteService"; serviceId: string }
  | { action: "duplicateService"; serviceId: string; serviceDate: string }
  | { action: "addSong"; serviceId: string; songId: number }
  | { action: "updateItem"; serviceId: string; itemId: string; notes: string }
  | { action: "removeItem"; serviceId: string; itemId: string }
  | { action: "reorder"; serviceId: string; itemIds: string[] }
  | { action: "sync"; serviceId?: string };

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`));
}

function cleanLabel(value: string) {
  const label = value.trim().slice(0, 80);
  if (!label) throw new Error("Give this service a short name.");
  return label;
}

export async function GET(request: Request) {
  const unauthorized = await requireRole(request, "admin");
  if (unauthorized) return unauthorized;
  try {
    const serviceId = new URL(request.url).searchParams.get("serviceId") ?? undefined;
    return Response.json(await getPlannerPayload(serviceId));
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to load the planner." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const unauthorized = await requireRole(request, "admin");
  if (unauthorized) return unauthorized;
  try {
    const body = (await request.json()) as PlannerAction;
    let selectedId: string | undefined = "serviceId" in body ? body.serviceId : undefined;
    switch (body.action) {
      case "createService": {
        if (!validDate(body.serviceDate)) throw new Error("Choose a valid service date.");
        const service = await createService(body.serviceDate, cleanLabel(body.label));
        selectedId = service?.id;
        break;
      }
      case "updateService":
        if (!validDate(body.serviceDate)) throw new Error("Choose a valid service date.");
        await updateService(body.serviceId, body.serviceDate, cleanLabel(body.label));
        break;
      case "deleteService":
        await deleteService(body.serviceId);
        selectedId = undefined;
        break;
      case "duplicateService": {
        if (!validDate(body.serviceDate)) throw new Error("Choose a valid service date.");
        const service = await duplicateService(body.serviceId, body.serviceDate);
        selectedId = service?.id;
        break;
      }
      case "addSong":
        if (!Number.isInteger(body.songId)) throw new Error("Choose a song from the library.");
        await addSong(body.serviceId, body.songId);
        break;
      case "updateItem":
        await updateItem(body.serviceId, body.itemId, body.notes.slice(0, 2000));
        break;
      case "removeItem":
        await removeItem(body.serviceId, body.itemId);
        break;
      case "reorder":
        await reorderItems(body.serviceId, body.itemIds);
        break;
      case "sync":
        await syncYouTubePlaylist();
        break;
      default:
        return Response.json({ error: "Unknown planner action." }, { status: 400 });
    }
    return Response.json(await getPlannerPayload(selectedId));
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "The change could not be saved." },
      { status: 400 },
    );
  }
}
