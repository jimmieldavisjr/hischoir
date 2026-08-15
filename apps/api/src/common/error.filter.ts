import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";
import type { Response } from "express";

/**
 * The web client reads `payload.error` from every failed request, so all
 * failures are normalised to that single shape instead of Nest's default body.
 */
@Catch()
export class ErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(ErrorFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      const message =
        typeof body === "string"
          ? body
          : ((body as { message?: string | string[] }).message ?? exception.message);
      response
        .status(exception.getStatus())
        .json({ error: Array.isArray(message) ? message[0] : message });
      return;
    }

    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ error: exception instanceof Error ? exception.message : "Something went wrong." });
  }
}
