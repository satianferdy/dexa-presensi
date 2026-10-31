import { ConfigService } from '@nestjs/config';
import { AttendancePolicyService } from './attendance-policy.service';

describe('AttendancePolicyService', () => {
  const policy = new AttendancePolicyService({
    get: () => 'Asia/Jakarta',
  } as unknown as ConfigService);

  it('changes an unclosed record to incomplete only after the business date changes', () => {
    jest.useFakeTimers();
    try {
      jest.setSystemTime(new Date('2026-10-31T16:59:59Z'));
      expect(policy.status('2026-10-31', null)).toBe('CHECKED_IN');
      jest.setSystemTime(new Date('2026-10-31T17:00:00Z'));
      expect(policy.status('2026-10-31', null)).toBe('INCOMPLETE');
      expect(policy.status('2026-11-01', null)).toBe('CHECKED_IN');
      expect(policy.status('2026-10-31', new Date('2026-10-31T10:00:00Z'))).toBe('COMPLETE');
      expect(policy.workedSeconds(new Date('2026-10-31T01:00:00Z'), null)).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it('calculates elapsed seconds without deducting breaks or capping at work targets', () => {
    expect(
      policy.workedSeconds(new Date('2026-10-31T01:00:00Z'), new Date('2026-10-31T10:00:00Z')),
    ).toBe(32400);
    expect(
      policy.workedSeconds(
        new Date('2026-10-31T01:10:00.100Z'),
        new Date('2026-10-31T10:35:42.900Z'),
      ),
    ).toBe(33942);
  });

  it('leaves incomplete attendance uncounted and prevents negative durations', () => {
    const start = new Date('2026-10-31T01:00:00Z');
    expect(policy.workedSeconds(start, null)).toBeNull();
    expect(policy.workedSeconds(start, start)).toBe(0);
    expect(policy.workedSeconds(start, new Date('2026-10-31T00:00:00Z'))).toBe(0);
  });

  it('derives the work date in the business timezone', () => {
    expect(policy.localParts(new Date('2026-10-27T17:30:00.000Z')).workDate).toBe('2026-10-28');
  });

  it('marks check-in after 08:00 WIB as late', () => {
    expect(policy.isLate(new Date('2026-10-28T01:00:00.000Z'))).toBe(false);
    expect(policy.isLate(new Date('2026-10-28T01:01:00.000Z'))).toBe(true);
  });

  it('marks checkout before 17:00 WIB as early', () => {
    expect(policy.isEarlyCheckout(new Date('2026-10-28T09:59:00.000Z'))).toBe(true);
    expect(policy.isEarlyCheckout(new Date('2026-10-28T10:00:00.000Z'))).toBe(false);
  });
});
