export type RuntimeEnv = {
  ADMIN_PASSCODE?: string;
  TEAM_PASSCODE?: string;
  SESSION_SECRET?: string;
  YOUTUBE_API_KEY?: string;
  DATABASE_URL?: string;
};

export function runtimeEnv(): RuntimeEnv {
  return {
    ADMIN_PASSCODE: process.env.ADMIN_PASSCODE,
    TEAM_PASSCODE: process.env.TEAM_PASSCODE,
    SESSION_SECRET: process.env.SESSION_SECRET,
    YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
  };
}
