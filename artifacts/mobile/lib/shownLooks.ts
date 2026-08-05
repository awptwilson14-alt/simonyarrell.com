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

// ─── Global (cross-user) registry sync ───────────────────────────────────────
// Product rule: once a combination has been generated for ANY user it must
// never be generated again for ANYONE. The api-server keeps the authoritative
// global fingerprint set; we merge it into the local engine set on startup and
// register everything we generate. All calls are best-effort — offline just
// degrades to per-device dedup, never blocks generation.

const API_BASE = resolveApiBase();

function resolveApiBase(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit && explicit.length > 0) return explicit.replace(/\/+$/, "");
  const dev =
    process.env.EXPO_PUBLIC_DOMAIN ||
    process.env.EXPO_PUBLIC_REPLIT_DEV_DOMAIN;
  if (dev && dev.length > 0) return `https://${dev}`;
  return "";
}

// Fingerprints generated locally but not yet confirmed by the server.
// Mirrored to AsyncStorage (PENDING_KEY) so an abrupt kill before the POST
// lands doesn't lose the global registration — they're retried next launch.
let pendingServer: string[] = [];
let serverPushTimer: ReturnType<typeof setTimeout> | null = null;
let pushInFlight = false;

const PENDING_KEY = "pendingGlobalLookFingerprints";

function persistPending(): void {
  AsyncStorage.setItem(PENDING_KEY, JSON.stringify(pendingServer)).catch(() => {});
}

/**
 * GET the global set with a hard timeout so a hanging request can NEVER
 * stall `initShownLooks` (generation awaits readiness — a dead network must
 * degrade to per-device dedup, not block the product).
 */
async function fetchGlobalFingerprints(): Promise<string[]> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${API_BASE}/api/looks/fingerprints`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.fingerprints)
      ? data.fingerprints.filter((x: unknown): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

/**
 * Single-flight sender: only ONE POST may mutate `pendingServer` at a time.
 * Without the guard, a timer flush and a background flush racing with >500
 * pending entries could both send the same head batch and BOTH slice the
 * queue — silently dropping unsent fingerprints.
 */
function pushPendingToServer(): void {
  if (pushInFlight || pendingServer.length === 0) return;
  pushInFlight = true;
  const batch = pendingServer.slice(0, 500);
  fetch(`${API_BASE}/api/looks/fingerprints`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fingerprints: batch }),
  })
    .then((res) => {
      if (res.ok) {
        pendingServer = pendingServer.slice(batch.length);
        persistPending();
        if (pendingServer.length > 0) schedulePushToServer();
      }
      // Non-OK: keep the batch pending; retried on the next flush.
    })
    .catch(() => {})
    .finally(() => {
      pushInFlight = false;
    });
}

function schedulePushToServer(): void {
  if (serverPushTimer) clearTimeout(serverPushTimer);
  serverPushTimer = setTimeout(() => {
    serverPushTimer = null;
    pushPendingToServer();
  }, 800);
}
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
    // Local (per-device) memory and the global (cross-user) registry are
    // fetched in parallel; the engine set is the UNION so a combination shown
    // to any other user is burned here too before the first generation.
    const [raw, rawPending, globalFps] = await Promise.all([
      AsyncStorage.getItem(KEY),
      AsyncStorage.getItem(PENDING_KEY),
      fetchGlobalFingerprints(),
    ]);
    // Re-queue registrations that didn't reach the server last session.
    try {
      const pend = rawPending ? JSON.parse(rawPending) : [];
      if (Array.isArray(pend)) {
        pendingServer = pend.filter((x): x is string => typeof x === "string");
        if (pendingServer.length > 0) schedulePushToServer();
      }
    } catch {
      // Corrupt pending queue is non-fatal; the combos are still in the local set.
    }
    const arr = raw ? JSON.parse(raw) : [];
    buffer = Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
    hydrateShownLooks(buffer);
    if (globalFps.length > 0) hydrateShownLooks(globalFps);
  } catch {
    buffer = [];
  } finally {
    setShownLooksPersister((fp: string) => {
      buffer.push(fp);
      if (buffer.length > MAX) buffer = buffer.slice(buffer.length - MAX);
      scheduleFlush();
      // Burn the combination globally so no other user can ever receive it.
      pendingServer.push(fp);
      persistPending();
      schedulePushToServer();
    });
    // Durability: flush the debounced buffer immediately when the app is
    // backgrounded (native) or the tab is closed (web) so recently-generated
    // fingerprints aren't lost on an abrupt kill before the 500ms timer fires.
    AppState.addEventListener("change", (state) => {
      if (state === "background" || state === "inactive") {
        flushNow();
        pushPendingToServer();
      }
    });
    if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
      window.addEventListener("pagehide", flushNow);
      window.addEventListener("beforeunload", flushNow);
    }
    resolveReady();
  }
}
