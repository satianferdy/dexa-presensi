import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ParseUUIDPipe } from '@nestjs/common';
import { AttendanceQueryDto } from '../modules/attendance/dto/attendance-query.dto';
import { SummaryQueryDto } from '../modules/dashboard/dto/summary-query.dto';
import { isBusinessTimezone } from './business-timezone';

describe('Request boundaries', () => {
  it.each([AttendanceQueryDto, SummaryQueryDto])(
    'validates real calendar dates and range order in %p',
    async (Dto) => {
      for (const input of [
        { dateFrom: '2026-02-30' },
        { dateFrom: '2026-10-31T00:00:00Z' },
        { dateFrom: null },
        { dateFrom: '2026-11-01', dateTo: '2026-10-31' },
      ]) {
        expect((await validate(plainToInstance(Dto, input))).length).toBeGreaterThan(0);
      }
      expect(
        await validate(plainToInstance(Dto, { dateFrom: '2024-02-29', dateTo: '2024-02-29' })),
      ).toHaveLength(0);
      expect(await validate(plainToInstance(Dto, {}))).toHaveLength(0);
    },
  );

  it('rejects malformed UUIDs before record lookup', async () => {
    const pipe = new ParseUUIDPipe({ version: '4' });
    await expect(pipe.transform('not-an-id', { type: 'param' })).rejects.toThrow();
    await expect(
      pipe.transform('f98bf01f-9324-4a14-8c90-47babfb02955', { type: 'param' }),
    ).resolves.toBeTruthy();
  });

  it('accepts configured timezones and rejects unknown names', () => {
    expect(isBusinessTimezone('Asia/Jakarta')).toBe(true);
    expect(isBusinessTimezone('UTC')).toBe(true);
    expect(isBusinessTimezone('Mars/Unknown')).toBe(false);
  });
});
