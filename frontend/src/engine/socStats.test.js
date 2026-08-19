import { describe, expect, it } from 'vitest';
import { computeTicketStats, formatRelativeTime } from './socStats';

function ticket(status) {
  return { status };
}

describe('computeTicketStats', () => {
  it('returns zero counts for an empty or non-array input', () => {
    expect(computeTicketStats([])).toEqual({ total: 0, open: 0, investigating: 0, closed: 0 });
    expect(computeTicketStats(null)).toEqual({ total: 0, open: 0, investigating: 0, closed: 0 });
  });

  it('counts tickets by status independently of order', () => {
    const tickets = [
      ticket('open'),
      ticket('open'),
      ticket('investigating'),
      ticket('closed'),
      ticket('closed'),
    ];

    expect(computeTicketStats(tickets)).toEqual({ total: 5, open: 2, investigating: 1, closed: 2 });
  });
});

describe('formatRelativeTime', () => {
  const now = new Date('2026-08-10T12:00:00.000Z').getTime();

  it('returns "just now" for timestamps under a minute old', () => {
    expect(formatRelativeTime('2026-08-10T11:59:30.000Z', now)).toBe('just now');
  });

  it('formats minutes, singular and plural', () => {
    expect(formatRelativeTime('2026-08-10T11:59:00.000Z', now)).toBe('1 minute ago');
    expect(formatRelativeTime('2026-08-10T11:56:00.000Z', now)).toBe('4 minutes ago');
  });

  it('formats hours, singular and plural', () => {
    expect(formatRelativeTime('2026-08-10T11:00:00.000Z', now)).toBe('1 hour ago');
    expect(formatRelativeTime('2026-08-10T09:00:00.000Z', now)).toBe('3 hours ago');
  });

  it('formats days, singular and plural', () => {
    expect(formatRelativeTime('2026-08-09T12:00:00.000Z', now)).toBe('1 day ago');
    expect(formatRelativeTime('2026-08-07T12:00:00.000Z', now)).toBe('3 days ago');
  });

  it('returns an empty string for an unparseable timestamp', () => {
    expect(formatRelativeTime('not-a-date', now)).toBe('');
  });
});
