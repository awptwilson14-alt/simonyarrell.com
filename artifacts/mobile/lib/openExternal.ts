import { Linking, Platform } from "react-native";
import {
  resolveMonetizedUrl,
  resolveMonetizedUrlViaServer,
} from "./affiliateLinkService";

/**
 * Open an external BUY URL in a way that survives modern popup blockers.
 *
 * Problem: react-native-web's `Linking.openURL` returns a Promise whose
 * resolver calls `window.open` inside a microtask. Chrome / Safari / Firefox
 * all treat any `window.open` that runs outside the synchronous call stack of
 * a user gesture as a popup and silently block it — so BUY taps appeared to
 * do nothing in production (and the previous `.catch(() => {})` swallowed
 * the error so we never saw it). On native, this isn't a problem and
 * Linking.openURL is the canonical path.
 *
 * Fix: on web, call `window.open` SYNCHRONOUSLY inside the click handler
 * (same call stack as the user gesture). On native, fall back to
 * `Linking.openURL`. `resolveMonetizedUrl` (the centralized
 * AffiliateLinkService) is applied here so every BUY tap goes through ONE
 * affiliate resolver exactly once at click time — active Rakuten partnership
 * → other active network → site-wide wrapper → original URL. The destination
 * product never changes; only authorized templates/wrappers are used.
 */
export function openExternalUrl(rawUrl: string | undefined | null): void {
  if (!rawUrl) return;

  if (Platform.OS === "web") {
    // WEB: must stay synchronous (popup blockers) → local resolver, which
    // uses the same cached partnership templates as the server.
    const { url } = resolveMonetizedUrl(rawUrl);
    try {
      const win = window.open(url, "_blank", "noopener,noreferrer");
      if (win) return;
    } catch {
      // fall through to Linking.openURL as a last resort
    }
    // Popup blocked → same-tab navigation is always allowed from a user
    // gesture. Better than the BUY button doing nothing.
    try {
      window.location.assign(url);
      return;
    } catch {
      // fall through
    }
    Linking.openURL(url).catch(() => {});
    return;
  }

  // NATIVE: no popup-blocker constraint → prefer the server resolver
  // (source of truth: priority config + link cache), falling back to the
  // local resolver on timeout/offline. Never blocks shopping.
  resolveMonetizedUrlViaServer(rawUrl)
    .then(({ url }) => Linking.openURL(url))
    .catch(() => Linking.openURL(rawUrl).catch(() => {}));
}
