import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Req,
  Res,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request, Response } from "express";
import type { Role } from "../common/types";
import { AuthService, SESSION_COOKIE } from "./auth.service";

type SignInBody = { role?: Role; passcode?: string };

@Controller()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("auth")
  @HttpCode(HttpStatus.OK)
  async signIn(
    @Body() body: SignInBody,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (body.role !== "admin" && body.role !== "team") {
      throw new BadRequestException("Choose director or team access.");
    }
    if (await this.auth.isRateLimited(request, body.role)) {
      throw new HttpException(
        "Too many attempts. Please wait 15 minutes and try again.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const expected = this.auth.passcodeFor(body.role);
    if (!expected) {
      throw new ServiceUnavailableException("This access area has not been configured yet.");
    }

    const succeeded = await this.auth.safeEqual(body.passcode ?? "", expected);
    await this.auth.recordAttempt(request, body.role, succeeded);
    if (!succeeded) {
      throw new UnauthorizedException("That passcode wasn’t recognized.");
    }

    const session = this.auth.createSession(body.role);
    response.cookie(SESSION_COOKIE, session.value, this.auth.cookieOptions(session.maxAge));
    return { ok: true, role: body.role };
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  signOut(@Res({ passthrough: true }) response: Response) {
    response.clearCookie(SESSION_COOKIE, this.auth.cookieOptions());
    return { ok: true };
  }

  @Get("session")
  session(@Req() request: Request) {
    return { role: this.auth.roleFromRequest(request) };
  }
}
