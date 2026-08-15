import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { AppConfigModule } from "./config/config.module";
import { DatabaseModule } from "./database/database.module";
import { HealthModule } from "./health/health.module";
import { PlannerModule } from "./planner/planner.module";
import { PlansModule } from "./plans/plans.module";
import { ScheduleModule } from "./schedule/schedule.module";
import { YouTubeModule } from "./youtube/youtube.module";

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    AuthModule,
    YouTubeModule,
    PlansModule,
    PlannerModule,
    ScheduleModule,
    HealthModule,
  ],
})
export class AppModule {}
