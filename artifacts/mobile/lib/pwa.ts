/**
 * Simon Yarrell — PWA Bootstrap (web only)
 *
 * Expo Router's `+html.tsx` is only used during static-export production
 * builds — `expo start` in dev still serves Metro's default index.html, so
 * the manifest + theme + apple meta tags never reach the page. This module
 * injects them at runtime so dev preview, deployed dev, and production all
 * behave the same.
 *
 * It also registers `/sw.js` for offline shell + image caching. The whole
 * module is a no-op on iOS/Android (where `document` doesn't exist) and is
 * idempotent — repeated calls won't duplicate tags.
 *
 * Call once from the root layout, after platform detection.
 */

import { Platform } from "react-native";

type TagSpec = { tag: "link" | "meta"; attrs: Record<string, string>; key: string };

const TAGS: TagSpec[] = [
  { tag: "link", attrs: { rel: "manifest", href: "/manifest.webmanifest" }, key: "rel=manifest" },
  { tag: "link", attrs: { rel: "apple-touch-icon", href: "/apple-touch-icon.png" }, key: "rel=apple-touch-icon" },
  { tag: "link", attrs: { rel: "icon", type: "image/png", sizes: "192x192", href: "/icon-192.png" }, key: "rel=icon-192" },
  { tag: "link", attrs: { rel: "icon", type: "image/png", sizes: "512x512", href: "/icon-512.png" }, key: "rel=icon-512" },
  { tag: "meta", attrs: { name: "theme-color", content: "#0B0B0C" }, key: "name=theme-color" },
  { tag: "meta", attrs: { name: "background-color", content: "#0B0B0C" }, key: "name=background-color" },
  { tag: "meta", attrs: { name: "application-name", content: "Simon Yarrell" }, key: "name=application-name" },
  { tag: "meta", attrs: { name: "apple-mobile-web-app-capable", content: "yes" }, key: "name=apple-mobile-web-app-capable" },
  { tag: "meta", attrs: { name: "mobile-web-app-capable", content: "yes" }, key: "name=mobile-web-app-capable" },
  { tag: "meta", attrs: { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" }, key: "name=apple-mobile-web-app-status-bar-style" },
  { tag: "meta", attrs: { name: "apple-mobile-web-app-title", content: "Simon Yarrell" }, key: "name=apple-mobile-web-app-title" },
  { tag: "meta", attrs: { name: "description", content: "Discover luxury fashion with AI-powered styling. Shop authentic designer clothing, handbags, shoes and accessories from trusted premium retailers." }, key: "name=description" },
];

// SEO homepage title — applied at runtime because dev preview uses Metro's
// default HTML template (see +html.tsx note below).
const SEO_TITLE = "Simon Yarrell | AI Luxury Fashion Styling & Shopping";

// Track whether init has already run this page-load so we don't reflow the
// head on every hot reload or layout remount.
let didInit = false;

export function initPWA(): void {
  if (Platform.OS !== "web") return;
  if (didInit) return;
  if (typeof document === "undefined" || typeof window === "undefined") return;

  const head = document.head;
  if (!head) return;

  // Homepage SEO title (static export already bakes it via +html.tsx; this
  // makes the dev preview match).
  document.title = SEO_TITLE;

  // Only mark init complete once we've confirmed the DOM is usable —
  // otherwise an early call (before <head> exists) would permanently lock
  // injection out for this page-load.
  didInit = true;

  // Inject / dedupe head tags
  for (const spec of TAGS) {
    const selector = spec.tag + Object.entries(spec.attrs)
      .filter(([k]) => k === "rel" || k === "name" || k === "sizes")
      .map(([k, v]) => `[${k}="${v}"]`)
      .join("");
    try {
      const existing = head.querySelector(selector);
      if (existing) continue;
      const el = document.createElement(spec.tag);
      for (const [k, v] of Object.entries(spec.attrs)) el.setAttribute(k, v);
      head.appendChild(el);
    } catch {
      // SSR or hostile DOM — skip silently
    }
  }

  // Register the service worker on next idle so it doesn't compete with
  // the JS bundle for main-thread cycles. Failures (insecure context,
  // private-mode Safari, stale Replit preview URLs that go cross-origin
  // mid-session) are swallowed — the app must still boot if SW fails.
  if ("serviceWorker" in navigator && window.isSecureContext) {
    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => {
          /* noop — see comment above */
        });
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }
}
