import { describe, expect, it } from 'vitest';
import { formatDuration } from './duration';

describe('Work duration display', () => {
  it('formats completed durations and multi-day totals without wrapping at 24 hours', () => {
    expect(formatDuration(32400)).toBe('9h 00m');
    expect(formatDuration(33942)).toBe('9h 25m');
    expect(formatDuration(162000)).toBe('45h 00m');
    expect(formatDuration(0)).toBe('0h 00m');
    expect(formatDuration(12)).toBe('<1m');
  });
  it('keeps pending and invalid durations distinct from zero', () => {
    expect(formatDuration(null)).toBe('—');
    expect(formatDuration(undefined)).toBe('—');
    expect(formatDuration(NaN)).toBe('—');
    expect(formatDuration(-1)).toBe('—');
  });
});
