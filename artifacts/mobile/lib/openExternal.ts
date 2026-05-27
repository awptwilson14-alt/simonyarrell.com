import { Linking, Platform } from "react-native";
import { applyAffiliate } from "./affiliate";

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
 * `Linking.openURL`. `applyAffiliate` is applied here so every BUY tap goes
 * through the affiliate wrapper exactly once at click time (architectural
 * invariant — see affiliate.ts header).
 */
export function openExternalUrl(rawUrl: string | undefined | null): void {
  if (!rawUrl) return;
  const url = applyAffiliate(rawUrl);

  if (Platform.OS === "web") {
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
  }

  Linking.openURL(url).catch(() => {});
}
