import { env } from "cloudflare:workers";

export type RuntimeEnv = {
  ADMIN_PASSCODE?: string;
  TEAM_PASSCODE?: string;
  SESSION_SECRET?: string;
  YOUTUBE_API_KEY?: string;
};

export function runtimeEnv(): RuntimeEnv {
  return env as unknown as RuntimeEnv;
}
