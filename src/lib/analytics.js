/**
 * First-party analytics. Events go to our own API; no third-party tracker,
 * so member behaviour never leaves our infrastructure.
 */

const queue = [];

function flush() {
  if (!queue.length) return;
  const batch = queue.splice(0, queue.length);
  for (const event of batch) {
    fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(event),
    }).catch(() => {});
  }
}

export function track(name, path, meta) {
  queue.push({ name, path: path ?? window.location.pathname, meta });
  if (queue.length >= 5) flush();
  else setTimeout(flush, 2000);
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", flush);
}
