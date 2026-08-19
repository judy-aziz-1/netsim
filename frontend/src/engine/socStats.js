export function computeTicketStats(tickets) {
  const safeTickets = Array.isArray(tickets) ? tickets : [];

  return {
    total: safeTickets.length,
    open: safeTickets.filter((ticket) => ticket.status === 'open').length,
    investigating: safeTickets.filter((ticket) => ticket.status === 'investigating').length,
    closed: safeTickets.filter((ticket) => ticket.status === 'closed').length,
  };
}

const MINUTE_MS = 60000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export function formatRelativeTime(isoString, now = Date.now()) {
  const then = new Date(isoString).getTime();

  if (Number.isNaN(then)) {
    return '';
  }

  const diffMs = Math.max(now - then, 0);

  if (diffMs < MINUTE_MS) {
    return 'just now';
  }

  if (diffMs < HOUR_MS) {
    const minutes = Math.floor(diffMs / MINUTE_MS);
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }

  if (diffMs < DAY_MS) {
    const hours = Math.floor(diffMs / HOUR_MS);
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }

  const days = Math.floor(diffMs / DAY_MS);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}
