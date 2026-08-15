import { SetMetadata } from "@nestjs/common";
import type { Role } from "../common/types";

export const REQUIRED_ROLE = "requiredRole";

/**
 * Mirrors the original requireRole(): "team" accepts either role, while
 * "admin" accepts only the director session.
 */
export const RequireRole = (role: Role) => SetMetadata(REQUIRED_ROLE, role);
