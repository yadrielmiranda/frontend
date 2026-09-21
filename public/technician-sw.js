// Solo fallback de navegación. Nunca guardar HTML privado, APIs ni movimientos en caché.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate" || event.request.method !== "GET") return;
  event.respondWith(fetch(event.request).catch(() => new Response(
    '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AE Technician — Offline</title><body style="font-family:system-ui;padding:32px;max-width:480px;margin:auto"><h1>No connection</h1><p>Reconnect to use the technician workspace. Do not assume an unconfirmed scan or receipt was saved.</p><p>After reconnecting, retry the same pending operation to check its result without duplicating it.</p><p><a href="/technician">Try again</a></p></body></html>',
    { status: 503, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  )));
});
