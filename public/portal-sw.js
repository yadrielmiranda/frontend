// Navigation fallback only. Never store portal pages, API data or mutations.
// Do not claim existing clients: the technician app keeps its own scoped worker.
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || request.mode !== "navigate") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch { return; }
  const excluded = ["/api", "/technician", "/public", "/company", "/_next", "/uploads"];
  if (excluded.some((path) => pathname === path || pathname.startsWith(`${path}/`))) return;
  // A download failure must remain a download failure, never an HTML document.
  if (/\.[a-z0-9]+$/i.test(pathname) ||
      /\/(?:downloads?|exports?|pdf|attachments?)(?:\/|$)/i.test(pathname) ||
      ["download", "attachment", "pdf"].some((key) => url.searchParams.has(key)) ||
      /^(?:pdf|csv|xlsx?|zip)$/i.test(url.searchParams.get("format") || "")) return;

  event.respondWith(fetch(request, { cache: "no-store" }).catch(() => new Response(
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#0f172a"><title>Authentic Evolution — Offline</title></head><body style="font-family:system-ui;padding:32px;max-width:480px;margin:auto;color:#0f172a"><h1>No connection</h1><p>Connect to the internet to use Authentic Evolution.</p><p>After reconnecting, check the latest status of any pending changes before trying them again.</p><p><a href="/">Try again</a></p></body></html>',
    { status: 503, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  )));
});
