/**
 * Promo-admin API client + admin-key storage.
 *
 * The owner manages server-side promo codes from `app/admin-promos.tsx`. The
 * admin CRUD endpoints are gated by a private `ADMIN_PROMO_KEY` secret on the
 * server; this module stores the key the owner types (AsyncStorage, admin
 * device only) and attaches it as the `x-admin-key` header.
 *
 * The public `lookupServerPromo()` helper needs no key — it's the redeem-time
 * fallback used by `promoSettings.ts` after the offline built-in codes miss.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

import type { TierId } from "./tiers";

export type PromoKind = "percent_off" | "grant_tier";

export interface PromoRecord {
  id: number;
  code: string;
  kind: PromoKind;
  percent?: number;
  tier?: TierId;
  label: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PromoInput {
  code: string;
  kind: PromoKind;
  percent?: number;
  tier?: TierId;
  label: string;
  active?: boolean;
}

export interface ServerPromoLookup {
  found: boolean;
  code?: string;
  label?: string;
  kind?: PromoKind;
  percent?: number;
  tier?: TierId;
}

export class PromoAdminError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "PromoAdminError";
  }
}

function resolveApiBase(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit && explicit.length > 0) return explicit.replace(/\/+$/, "");
  const dev =
    process.env.EXPO_PUBLIC_DOMAIN || process.env.EXPO_PUBLIC_REPLIT_DEV_DOMAIN;
  if (dev && dev.length > 0) return `https://${dev}`;
  return "";
}

const API_BASE = resolveApiBase();
const ADMIN_KEY_STORAGE = "promoAdminKey.v1";

let cachedKey: string | null = null;
let keyLoaded = false;

/** Load the saved admin key once (idempotent). */
export async function loadAdminKey(): Promise<string | null> {
  if (keyLoaded) return cachedKey;
  try {
    cachedKey = await AsyncStorage.getItem(ADMIN_KEY_STORAGE);
  } catch {
    cachedKey = null;
  }
  keyLoaded = true;
  return cachedKey;
}

export function getAdminKey(): string | null {
  return cachedKey;
}

export async function saveAdminKey(key: string): Promise<void> {
  cachedKey = key;
  keyLoaded = true;
  try {
    await AsyncStorage.setItem(ADMIN_KEY_STORAGE, key);
  } catch {
    /* in-memory copy still active for this session */
  }
}

export async function clearAdminKey(): Promise<void> {
  cachedKey = null;
  keyLoaded = true;
  try {
    await AsyncStorage.removeItem(ADMIN_KEY_STORAGE);
  } catch {
    /* non-fatal */
  }
}

async function parseError(res: Response): Promise<never> {
  let msg = `Request failed (${res.status})`;
  try {
    const body = (await res.json()) as { error?: string };
    if (body?.error) msg = body.error;
  } catch {
    /* ignore non-JSON bodies */
  }
  throw new PromoAdminError(msg, res.status);
}

function adminHeaders(key: string): HeadersInit {
  return { "Content-Type": "application/json", "x-admin-key": key };
}

/** Public — no admin key. Returns {found:false} for unknown/inactive codes. */
export async function lookupServerPromo(
  code: string,
): Promise<ServerPromoLookup> {
  const url = `${API_BASE}/api/promo/lookup?code=${encodeURIComponent(code)}`;
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 400) return { found: false };
    await parseError(res);
  }
  return (await res.json()) as ServerPromoLookup;
}

export async function listPromoCodes(key: string): Promise<PromoRecord[]> {
  const res = await fetch(`${API_BASE}/api/promo/codes`, {
    headers: adminHeaders(key),
  });
  if (!res.ok) await parseError(res);
  return (await res.json()) as PromoRecord[];
}

export async function createPromoCode(
  key: string,
  input: PromoInput,
): Promise<PromoRecord> {
  const res = await fetch(`${API_BASE}/api/promo/codes`, {
    method: "POST",
    headers: adminHeaders(key),
    body: JSON.stringify(input),
  });
  if (!res.ok) await parseError(res);
  return (await res.json()) as PromoRecord;
}

export async function updatePromoCode(
  key: string,
  id: number,
  input: Partial<PromoInput>,
): Promise<PromoRecord> {
  const res = await fetch(`${API_BASE}/api/promo/codes/${id}`, {
    method: "PATCH",
    headers: adminHeaders(key),
    body: JSON.stringify(input),
  });
  if (!res.ok) await parseError(res);
  return (await res.json()) as PromoRecord;
}

export async function deletePromoCode(key: string, id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/promo/codes/${id}`, {
    method: "DELETE",
    headers: adminHeaders(key),
  });
  if (!res.ok) await parseError(res);
}
