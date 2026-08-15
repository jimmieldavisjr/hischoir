import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import type { Role } from "../common/types";
import { AuthService } from "./auth.service";
import { REQUIRED_ROLE } from "./require-role.decorator";

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
  ) {}

  canActivate(context: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<Role | undefined>(REQUIRED_ROLE, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const role = this.auth.roleFromRequest(request);
    if (!role || (required === "admin" && role !== "admin")) {
      throw new UnauthorizedException("Please enter the correct passcode to continue.");
    }
    return true;
  }
}
