/**
 * Newsletter client — calls POST /api/newsletter/subscribe so the
 * "Stay Ahead of Luxury Fashion" signup actually persists subscriber emails.
 */

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

export async function subscribeToNewsletter(
  email: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { ok: false, error: "Please enter a valid email address." };
  }
  try {
    const res = await fetch(`${API_BASE}/api/newsletter/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: trimmed, source: "landing" }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;
      return {
        ok: false,
        error: body?.error ?? "Something went wrong. Please try again.",
      };
    }
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Couldn't reach the server. Please try again.",
    };
  }
}
