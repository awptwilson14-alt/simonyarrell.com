---
name: Desktop-web "indexed property [0]" crash
description: Why the Maison Simon mobile app crashes only on desktop web, and how to actually reproduce/fix it
---

# Desktop-web "Failed to set an indexed property [0] on CSSStyleDeclaration" crash

The Maison Simon Expo app (`artifacts/mobile`) ships web as a **static export**
(`app.json` → `web.output: "static"`). Each route is prerendered to HTML at build
time with **no `window`**, so any width-based logic resolves to a phone layout.
On the client, a desktop-width screen would compute the desktop layout on the very
first render → **hydration mismatch** → React tears down and re-commits the desktop
subtree, which surfaced the long-standing crash.

**Fix (already in code):** on web, `hooks/useResponsive.ts` seeds the first render
with width 0 (phone layout, matching the server HTML), then remeasures to the real
width in a post-mount effect — a normal update, not a hydration mismatch.

**Why:** many prior "surgical" rounds (shadow props, gradient/blur shims, crash
trap, disabling DesktopNav) did not fix it because none addressed the hydration
mismatch, which is the real mechanism.

**How to reproduce — the part that cost many rounds:**
- It is **impossible to reproduce in the dev preview** (Metro `expo start`): dev
  never does SSR/hydration, so the mismatch never happens.
- It only reproduces against a **static export served as HTML, opened at a desktop
  viewport ≥1024px** (`hooks/useResponsive.ts` DESKTOP_MIN). Headless Chrome at the
  default ~800px width is below the breakpoint → no desktop branch → no repro.
- A full `expo export --platform web` of this app prerenders thousands of routes and
  takes well over 90s — it exceeds a single 120s bash call. Don't expect to build +
  serve + screenshot it in one shot from bash.

**Deploy gotcha:** the live site (simonyarrell.com) is updated separately from local
commits. A fix can be committed locally yet absent from the deployed branch, so the
user keeps seeing the crash on a site that doesn't have the fix. Always confirm the
fix is actually on the deployed branch before concluding a fix "didn't work".

**Browser extensions were a red herring** — the crash reproduces in incognito; it is
a genuine static-export hydration bug, not MetaMask/SES lockdown.
