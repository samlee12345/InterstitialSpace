// "3 days ago", "2 months ago", "1 year ago" from an ISO date (YYYY-MM-DD).
export function timeAgo(iso, now = Date.now()) {
  const days = Math.max(0, Math.floor((now - Date.parse(iso)) / 86400000));
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  const [n, unit] = days < 7 ? [days, 'day'] : days < 30 ? [Math.floor(days / 7), 'week'] : days < 365 ? [Math.floor(days / 30), 'month'] : [Math.floor(days / 365), 'year'];
  return `${n} ${unit}${n === 1 ? '' : 's'} ago`;
}
