import { Module } from "@nestjs/common";
import { PlansModule } from "../plans/plans.module";
import { YouTubeModule } from "../youtube/youtube.module";
import { PlannerController } from "./planner.controller";

@Module({
  imports: [PlansModule, YouTubeModule],
  controllers: [PlannerController],
})
export class PlannerModule {}
