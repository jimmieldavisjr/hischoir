import { Module } from "@nestjs/common";
import { PlansModule } from "../plans/plans.module";
import { ScheduleController } from "./schedule.controller";

@Module({
  imports: [PlansModule],
  controllers: [ScheduleController],
})
export class ScheduleModule {}
