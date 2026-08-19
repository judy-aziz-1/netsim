const TYPE_COLORS = {
  arp_spoof: 'var(--danger)',
  dns_poison: 'var(--warning)',
  firewall_blocked_arp_spoof: 'var(--success)',
  firewall_blocked_dns_spoof: 'var(--ns-accent)',
};

const TYPE_LABELS = {
  arp_spoof: 'ARP Spoofing',
  dns_poison: 'DNS Poisoning',
  firewall_blocked_arp_spoof: 'Blocked ARP',
  firewall_blocked_dns_spoof: 'Blocked DNS',
};

const TYPE_ORDER = ['arp_spoof', 'dns_poison', 'firewall_blocked_arp_spoof', 'firewall_blocked_dns_spoof'];

const BURST_THRESHOLD = 3;
const TOP_N = 4;
const DONUT_RADIUS = 55;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;

// The timeline chart only needs to show recent activity — total counts (stat
// cards, donut, top attackers/victims) stay full-history and are computed from
// the unfiltered event list elsewhere in this module.
const RECENT_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_BUCKETS = 200;
const BUCKET_WIDTHS_MIN = [1, 5, 15, 30, 60];

function countBy(events, key) {
  const counts = {};
  events.forEach((event) => {
    const value = event[key];
    if (!value) return;
    counts[value] = (counts[value] ?? 0) + 1;
  });
  return counts;
}

function topEntries(events, key, nameKey) {
  const counts = countBy(events, key);

  // Prefers any resolved name found for this id across all events, but falls back
  // to the raw id when no event ever carried a name (old events predating the
  // name-snapshot field) - never leaves an entry blank.
  const nameById = {};
  events.forEach((event) => {
    const id = event[key];
    if (!id) return;
    nameById[id] = event[nameKey] || nameById[id] || id;
  });

  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, TOP_N);
  const max = Math.max(...entries.map(([, count]) => count), 1);

  return entries.map(([id, count]) => ({
    id,
    name: nameById[id] ?? id,
    count,
    pct: (count / max) * 100,
  }));
}

function buildStatCards(byType, activeThreats, total) {
  const arpAttacks = byType.arp_spoof ?? 0;
  const arpBlocked = byType.firewall_blocked_arp_spoof ?? 0;
  const dnsAttacks = byType.dns_poison ?? 0;
  const dnsBlocked = byType.firewall_blocked_dns_spoof ?? 0;
  const blocked = arpBlocked + dnsBlocked;
  const attacks = total - blocked;

  return [
    {
      label: 'ACTIVE THREATS',
      value: activeThreats,
      color: 'var(--danger)',
      sub: 'Open high-severity alerts',
    },
    {
      label: 'ARP EVENTS',
      value: arpAttacks + arpBlocked,
      color: 'var(--ns-accent)',
      sub: `${arpAttacks} attacks · ${arpBlocked} blocked`,
    },
    {
      label: 'DNS EVENTS',
      value: dnsAttacks + dnsBlocked,
      color: 'var(--warning)',
      sub: `${dnsAttacks} attacks · ${dnsBlocked} blocked`,
    },
    {
      label: 'BLOCKED / ATTACKS',
      value: `${blocked} / ${attacks}`,
      color: 'var(--success)',
      sub: `of ${total} total events`,
    },
  ];
}

function buildDonut(byType, total) {
  let acc = 0;
  const donutSegments = [];
  const legend = [];

  TYPE_ORDER.forEach((type) => {
    const count = byType[type] ?? 0;
    if (!count) return;

    const fraction = count / total;
    const dashLen = fraction * DONUT_CIRCUMFERENCE;

    donutSegments.push({
      color: TYPE_COLORS[type],
      dash: `${dashLen} ${DONUT_CIRCUMFERENCE - dashLen}`,
      offset: -acc,
    });
    acc += dashLen;

    legend.push({ color: TYPE_COLORS[type], label: TYPE_LABELS[type], count });
  });

  return { donutSegments, legend };
}

// Anchored on the latest event's own timestamp rather than Date.now() — this keeps
// the function pure/deterministic (testable with fixed fixtures) and, more
// importantly, avoids showing an empty chart when the underlying data itself is
// stale (e.g. no attacks triggered recently): it always shows "the most recent
// window of activity that actually exists," not "activity relative to right now."
function filterToRecentWindow(events, windowMs = RECENT_WINDOW_MS) {
  if (events.length === 0) {
    return [];
  }

  const maxT = Math.max(...events.map((event) => new Date(event.created_at).getTime()));

  return events.filter((event) => new Date(event.created_at).getTime() >= maxT - windowMs);
}

// Picks the smallest bucket width (from a fixed ladder) that keeps the number of
// rendered buckets under MAX_BUCKETS — this is what actually bounds DOM node count
// regardless of how wide a span buildTimeline is ever asked to cover, independent
// of the recent-window filtering above (defense in depth: this stays safe even if
// RECENT_WINDOW_MS is changed later without revisiting this function).
function pickBucketWidthMs(spanMs) {
  for (const widthMin of BUCKET_WIDTHS_MIN) {
    const widthMs = widthMin * 60000;
    if (spanMs / widthMs <= MAX_BUCKETS) {
      return widthMs;
    }
  }
  return BUCKET_WIDTHS_MIN[BUCKET_WIDTHS_MIN.length - 1] * 60000;
}

function buildTimeline(events) {
  if (events.length === 0) {
    return { bars: [], bucketWidthMin: 1 };
  }

  const times = events.map((event) => new Date(event.created_at).getTime());
  const minT = Math.min(...times);
  const maxT = Math.max(...times);
  const bucketMs = pickBucketWidthMs(maxT - minT);
  const startBucket = Math.floor(minT / bucketMs);
  const endBucket = Math.floor(maxT / bucketMs);

  const buckets = [];
  for (let bucket = startBucket; bucket <= endBucket; bucket += 1) {
    buckets.push({ start: bucket * bucketMs, count: 0 });
  }

  events.forEach((event) => {
    const index = Math.floor(new Date(event.created_at).getTime() / bucketMs) - startBucket;
    if (buckets[index]) {
      buckets[index].count += 1;
    }
  });

  const maxCount = Math.max(...buckets.map((bucket) => bucket.count), 1);

  const bars = buckets.map((bucket) => {
    const isBurst = bucket.count >= BURST_THRESHOLD;
    const heightPct = Math.max((bucket.count / maxCount) * 100, bucket.count > 0 ? 6 : 2);
    const date = new Date(bucket.start);
    const hh = String(date.getUTCHours()).padStart(2, '0');
    const mm = String(date.getUTCMinutes()).padStart(2, '0');

    return {
      time: `${hh}:${mm}`,
      count: bucket.count,
      isBurst,
      heightPct,
    };
  });

  return { bars, bucketWidthMin: bucketMs / 60000 };
}

export function computeSiemOverview(events, alerts) {
  const safeEvents = Array.isArray(events) ? events : [];
  const safeAlerts = Array.isArray(alerts) ? alerts : [];

  const total = safeEvents.length;
  const byType = countBy(safeEvents, 'eventType');
  const activeThreats = safeAlerts.filter((alert) => alert.status === 'open').length;

  const statCards = buildStatCards(byType, activeThreats, total);
  const { donutSegments, legend } = buildDonut(byType, total);
  const recentEvents = filterToRecentWindow(safeEvents);
  const { bars: timelineBars, bucketWidthMin } = buildTimeline(recentEvents);
  const topAttackers = topEntries(safeEvents, 'attackerDeviceId', 'attackerDeviceName');
  const topVictims = topEntries(safeEvents, 'victimDeviceId', 'victimDeviceName');

  return {
    statCards,
    donutSegments,
    legend,
    totalEvents: total,
    timelineBars,
    timelineBucketMinutes: bucketWidthMin,
    topAttackers,
    topVictims,
  };
}
