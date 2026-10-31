import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);
  catch(exception: unknown, host: ArgumentsHost): void {
    const request = host.switchToHttp().getRequest<Request>();
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    if (!(exception instanceof HttpException))
      this.logger.error(
        `Unhandled error requestId=${request.id}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    const payload = exception instanceof HttpException ? exception.getResponse() : null;
    const message =
      typeof payload === 'object' && payload && 'message' in payload
        ? payload.message
        : exception instanceof HttpException
          ? exception.message
          : 'An internal server error occurred';
    response.status(status).json({
      statusCode: status,
      code: exception instanceof HttpException ? exception.name : 'InternalServerError',
      message,
      ...(typeof payload === 'object' && payload && 'field' in payload
        ? { field: payload.field }
        : {}),
      requestId: request.id,
    });
  }
}
