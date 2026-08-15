import { BadRequestException, Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { RequireRole } from "../auth/require-role.decorator";
import { SessionGuard } from "../auth/session.guard";
import { PlansService } from "../plans/plans.service";
import { YouTubeService } from "../youtube/youtube.service";

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
  if (!label) throw new BadRequestException("Give this service a short name.");
  return label;
}

function requireDate(value: string) {
  if (!validDate(value)) throw new BadRequestException("Choose a valid service date.");
  return value;
}

@Controller("planner")
@UseGuards(SessionGuard)
@RequireRole("admin")
export class PlannerController {
  constructor(
    private readonly plans: PlansService,
    private readonly youtube: YouTubeService,
  ) {}

  @Get()
  get(@Query("serviceId") serviceId?: string) {
    return this.plans.getPlannerPayload(serviceId || undefined);
  }

  @Post()
  async act(@Body() body: PlannerAction) {
    let selectedId: string | undefined = "serviceId" in body ? body.serviceId : undefined;

    switch (body.action) {
      case "createService": {
        const service = await this.plans.createService(
          requireDate(body.serviceDate),
          cleanLabel(body.label),
        );
        selectedId = service?.id;
        break;
      }
      case "updateService":
        await this.plans.updateService(
          body.serviceId,
          requireDate(body.serviceDate),
          cleanLabel(body.label),
        );
        break;
      case "deleteService":
        await this.plans.deleteService(body.serviceId);
        selectedId = undefined;
        break;
      case "duplicateService": {
        const service = await this.plans.duplicateService(body.serviceId, requireDate(body.serviceDate));
        selectedId = service?.id;
        break;
      }
      case "addSong":
        if (!Number.isInteger(body.songId)) {
          throw new BadRequestException("Choose a song from the library.");
        }
        await this.plans.addSong(body.serviceId, body.songId);
        break;
      case "updateItem":
        await this.plans.updateItem(body.serviceId, body.itemId, body.notes.slice(0, 2000));
        break;
      case "removeItem":
        await this.plans.removeItem(body.serviceId, body.itemId);
        break;
      case "reorder":
        await this.plans.reorderItems(body.serviceId, body.itemIds);
        break;
      case "sync":
        await this.youtube.syncPlaylist();
        break;
      default:
        throw new BadRequestException("Unknown planner action.");
    }

    return this.plans.getPlannerPayload(selectedId);
  }
}
