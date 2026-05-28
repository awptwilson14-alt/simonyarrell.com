/* Simon Yarrell — Service Worker
 *
 * Cache strategy:
 *   - App shell (HTML, JS bundle, CSS): network-first w/ cache fallback so
 *     users get fresh code when online but the app still boots offline.
 *   - Static assets (images, fonts, icons): cache-first with background
 *     revalidation — fast loads, eventual freshness.
 *   - External brand-CDN product images (shopify, mrporter, mytheresa, etc.):
 *     cache-first with size cap so the catalog stays browsable offline once
 *     visited.
 *   - API calls (/api/*): network-only — outfit generation and stylist
 *     responses must be fresh; if offline we surface the failure.
 */

const VERSION = "sy-v9";
const APP_CACHE = `${VERSION}-app`;
const ASSET_CACHE = `${VERSION}-assets`;
const IMAGE_CACHE = `${VERSION}-images`;

const APP_SHELL = ["/", "/manifest.webmanifest"];
const MAX_IMAGE_ENTRIES = 300;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.startsWith(VERSION))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  const overflow = keys.length - maxEntries;
  await Promise.all(keys.slice(0, overflow).map((k) => cache.delete(k)));
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Skip non-http(s) and Chrome extension requests
  if (!url.protocol.startsWith("http")) return;

  // Skip API calls entirely — always go to network
  if (url.pathname.startsWith("/api/")) return;

  // Image / asset handler (same-origin or known CDN hosts)
  const isImage =
    req.destination === "image" ||
    /\.(png|jpe?g|webp|gif|svg|ico)(\?.*)?$/i.test(url.pathname);

  if (isImage) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        try {
          // Brand CDNs (Shopify, mrporter, mytheresa, ...) typically respond
          // without CORS headers, so the response.type comes back as
          // "opaque". We still want those in the cache so offline catalog
          // browsing works — opaque responses can be served back from cache
          // as <img src> just fine. `resp.ok` is always `false` for opaque
          // (status is reported as 0), so cache on `opaque` OR `ok`.
          const resp = await fetch(req);
          const isOpaque = resp.type === "opaque";
          if (isOpaque || resp.ok) {
            cache.put(req, resp.clone()).then(() => trimCache(IMAGE_CACHE, MAX_IMAGE_ENTRIES));
          }
          return resp;
        } catch (e) {
          return cached || Response.error();
        }
      })
    );
    return;
  }

  // App shell + JS/CSS bundles — network-first
  const isAppShell =
    req.mode === "navigate" ||
    req.destination === "script" ||
    req.destination === "style" ||
    req.destination === "document";

  if (isAppShell) {
    event.respondWith(
      (async () => {
        try {
          const resp = await fetch(req);
          if (resp.ok && url.origin === self.location.origin) {
            const cache = await caches.open(APP_CACHE);
            cache.put(req, resp.clone());
          }
          return resp;
        } catch (e) {
          const cached = await caches.match(req);
          if (cached) return cached;
          // Last-resort offline fallback for navigations
          if (req.mode === "navigate") {
            const shell = await caches.match("/");
            if (shell) return shell;
          }
          return Response.error();
        }
      })()
    );
    return;
  }

  // Everything else: stale-while-revalidate against ASSET_CACHE
  event.respondWith(
    caches.open(ASSET_CACHE).then(async (cache) => {
      const cached = await cache.match(req);
      const fetchPromise = fetch(req)
        .then((resp) => {
          if (resp.ok) cache.put(req, resp.clone());
          return resp;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
