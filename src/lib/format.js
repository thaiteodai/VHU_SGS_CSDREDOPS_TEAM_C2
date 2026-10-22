/**
 * Formatting helpers shared across the UI.
 */

export function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Human countdown. Returns { text, urgent, overdue }.
 */
export function countdown(dueAt, now = new Date()) {
  const diff = new Date(dueAt).getTime() - now.getTime();
  const abs = Math.abs(diff);
  const hours = Math.floor(abs / 3600000);
  const days = Math.floor(abs / 86400000);

  let text;
  if (diff < 0) {
    if (hours < 1) text = "just now";
    else if (hours < 24) text = `${hours}h overdue`;
    else if (days < 30) text = `${days}d overdue`;
    else text = `${Math.floor(days / 30)}mo overdue`;
  } else if (hours < 1) text = "due now";
  else if (hours < 24) text = `${hours}h left`;
  else if (days < 30) text = `${days}d left`;
  else text = `${Math.floor(days / 30)}mo left`;

  return {
    text,
    overdue: diff < 0,
    urgent: diff >= 0 && diff < 2 * 86400000,
    days: diff / 86400000,
  };
}

/**
 * The panic label for a target, driven by the same tier logic as the server.
 */
export function panicLabel(panic, tier) {
  if (tier >= 5) return "CODE RED";
  if (tier === 4) return "GETTING REAL";
  if (panic >= 85) return "BURNING";
  if (panic >= 60) return "HEATING UP";
  if (panic >= 35) return "WATCHING";
  if (panic >= 15) return "TRACKING";
  return "CHILL";
}

export function relativeTime(value) {
  if (!value) return "";
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
}
