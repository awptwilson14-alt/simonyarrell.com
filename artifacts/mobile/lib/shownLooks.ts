import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";
import { hydrateShownLooks, setShownLooksPersister } from "./outfitEngine";

// ─── Persistent "already generated" memory ───────────────────────────────────
// The outfit engine remembers every look combination it has ever produced so it
// NEVER regenerates the same one (the user's hard "no duplicate looks" rule).
// That memory lives in-process; this module makes it survive app restarts by
// mirroring the fingerprints to AsyncStorage. Combinations are only "kept" for
// the user by SAVING them — everything generated is burned so it can't recur.

const KEY = "shownLookFingerprints";
// Upper bound on how many fingerprints we persist. This is a STORAGE-SAFETY
// valve, not a product feature: on web AsyncStorage is localStorage (~5MB), so
// an unbounded store would eventually throw QuotaExceeded and silently stop
// persisting ALL future looks. In practice the finite catalog means the number
// of DISTINCT generatable complete outfits (and therefore fingerprints) is what
// bounds real growth long before this cap — a user would have to generate
// thousands of batches to approach it. If ever exceeded we drop the OLDEST
// fingerprints; those few oldest combos become eligible again, which is a far
// better failure mode than losing persistence entirely. ~90 bytes/fp → ~540KB.
const MAX = 6000;

let buffer: string[] = [];
let hydrated = false;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

// Resolves once the persisted memory has been loaded into the engine. Every
// generation entry point awaits this so a look produced before hydration can
// never duplicate a prior-session look (closes the startup race).
let resolveReady: () => void;
const readyPromise: Promise<void> = new Promise((r) => {
  resolveReady = r;
});
export function whenShownLooksReady(): Promise<void> {
  return readyPromise;
}

function flushNow(): void {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  // Fire-and-forget; a failed write (e.g. quota) just degrades to session-only
  // dedup and is retried on the next commit / lifecycle flush.
  AsyncStorage.setItem(KEY, JSON.stringify(buffer)).catch(() => {});
}

function scheduleFlush(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    flushNow();
  }, 500);
}

/**
 * Load persisted fingerprints into the engine's in-memory shown-set and wire up
 * the persister so future generations are remembered. Idempotent — safe to call
 * once at app startup (from AppContext). Always resolves the readiness promise,
 * even on failure, so generation is never blocked forever. Failure is
 * non-fatal: worst case the app forgets prior-session combos, never a crash.
 */
export async function initShownLooks(): Promise<void> {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    buffer = Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
    hydrateShownLooks(buffer);
  } catch {
    buffer = [];
  } finally {
    setShownLooksPersister((fp: string) => {
      buffer.push(fp);
      if (buffer.length > MAX) buffer = buffer.slice(buffer.length - MAX);
      scheduleFlush();
    });
    // Durability: flush the debounced buffer immediately when the app is
    // backgrounded (native) or the tab is closed (web) so recently-generated
    // fingerprints aren't lost on an abrupt kill before the 500ms timer fires.
    AppState.addEventListener("change", (state) => {
      if (state === "background" || state === "inactive") flushNow();
    });
    if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
      window.addEventListener("pagehide", flushNow);
      window.addEventListener("beforeunload", flushNow);
    }
    resolveReady();
  }
}
