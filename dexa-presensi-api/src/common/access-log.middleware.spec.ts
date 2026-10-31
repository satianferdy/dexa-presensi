import { EventEmitter } from 'events';
import { Request, Response } from 'express';
import { AccessLogMiddleware } from './access-log.middleware';

describe('Access log response lifecycle', () => {
  afterEach(() => jest.restoreAllMocks());

  it.each([200, 400, 401, 403, 429, 500])(
    'logs final status %i once without sensitive fields',
    (status) => {
      const stdout = jest.spyOn(process.stdout, 'write').mockReturnValue(true);
      const stderr = jest.spyOn(process.stderr, 'write').mockReturnValue(true);
      const request = {
        id: 'request-test',
        method: 'GET',
        path: '/api/employees',
        headers: { authorization: 'secret' },
        body: { password: 'secret' },
      } as unknown as Request;
      const response = Object.assign(new EventEmitter(), {
        statusCode: status,
        writableFinished: false,
      });
      const next = jest.fn();
      new AccessLogMiddleware().use(request, response as unknown as Response, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(stdout).not.toHaveBeenCalled();
      response.writableFinished = true;
      response.emit('finish');
      response.emit('close');
      const write = status < 400 ? stdout : stderr;
      expect(write).toHaveBeenCalledTimes(1);
      const line = JSON.parse(String(write.mock.calls[0][0]));
      expect(line).toMatchObject({
        status,
        requestId: 'request-test',
        aborted: false,
        level: status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info',
      });
      expect(line.durationMs).toBeGreaterThanOrEqual(0);
      expect(JSON.stringify(line)).not.toContain('secret');
    },
  );

  it('records a disconnected client once as an aborted request', () => {
    const stderr = jest.spyOn(process.stderr, 'write').mockReturnValue(true);
    const response = Object.assign(new EventEmitter(), {
      statusCode: 200,
      writableFinished: false,
    });
    new AccessLogMiddleware().use(
      { id: 'abort', method: 'GET', path: '/api/files' } as Request,
      response as unknown as Response,
      jest.fn(),
    );
    response.emit('close');
    response.emit('finish');
    expect(stderr).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(stderr.mock.calls[0][0]))).toMatchObject({
      status: 499,
      aborted: true,
    });
  });
});
