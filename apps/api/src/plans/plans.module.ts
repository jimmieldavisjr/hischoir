import { Module } from "@nestjs/common";
import { YouTubeModule } from "../youtube/youtube.module";
import { PlansService } from "./plans.service";

@Module({
  imports: [YouTubeModule],
  providers: [PlansService],
  exports: [PlansService],
})
export class PlansModule {}
