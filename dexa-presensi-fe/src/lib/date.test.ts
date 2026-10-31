import { afterEach, describe, expect, it, vi } from 'vitest';
import { configureTimezone, time, today } from './date';

afterEach(() => {
  vi.useRealTimers();
  configureTimezone('UTC');
});

describe('Business timezone', () => {
  it('changes the business date at midnight in Jakarta', () => {
    vi.useFakeTimers();
    configureTimezone('Asia/Jakarta');
    vi.setSystemTime(new Date('2026-10-31T16:59:59Z'));
    expect(today()).toBe('2026-10-31');
    vi.setSystemTime(new Date('2026-10-31T17:00:00Z'));
    expect(today()).toBe('2026-11-01');
  });

  it('uses the configured timezone for attendance times and dates', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-31T17:00:00Z'));
    configureTimezone('UTC');
    expect(today()).toBe('2026-10-31');
    expect(time('2026-10-31T17:00:00Z')).toBe('17:00 UTC');
    configureTimezone('Asia/Jakarta');
    expect(today()).toBe('2026-11-01');
    expect(time('2026-10-31T17:00:00Z')).toBe('00:00 WIB');
  });
});
