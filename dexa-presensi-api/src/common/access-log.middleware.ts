import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class AccessLogMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction): void {
    const started = process.hrtime.bigint();
    let logged = false;
    const write = (aborted: boolean) => {
      if (logged) return;
      logged = true;
      const status = aborted ? 499 : response.statusCode;
      const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
      const line = JSON.stringify({
        timestamp: new Date().toISOString(),
        level,
        context: 'HTTP',
        requestId: request.id,
        method: request.method,
        route: request.route?.path ?? request.path,
        status,
        durationMs: Number(process.hrtime.bigint() - started) / 1e6,
        aborted,
      });
      (level === 'info' ? process.stdout : process.stderr).write(`${line}\n`);
    };
    response.once('finish', () => write(false));
    response.once('close', () => write(!response.writableFinished));
    next();
  }
}
