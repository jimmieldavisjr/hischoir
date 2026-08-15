import { Controller, Get, NotFoundException, Param, UseGuards } from "@nestjs/common";
import { RequireRole } from "../auth/require-role.decorator";
import { SessionGuard } from "../auth/session.guard";
import { PlansService } from "../plans/plans.service";

/**
 * The read-only team surface. "team" also admits a director session, matching
 * the original requireRole() behaviour.
 */
@Controller()
@UseGuards(SessionGuard)
@RequireRole("team")
export class ScheduleController {
  constructor(private readonly plans: PlansService) {}

  @Get("team")
  async listServices() {
    return { services: await this.plans.listServices() };
  }

  @Get("service/:token")
  async servicePlan(@Param("token") token: string) {
    const service = await this.plans.getServicePlan(token, true);
    if (!service) throw new NotFoundException("This service plan was not found.");
    return { service };
  }
}
