---
name: Live site stuck on old build despite GitHub being current
description: How to tell a "still broken in prod" report is a Vercel deploy failure, not a code bug
---

# Symptom
User reports prod errors that are already fixed in the code. Live site (simonyarrell.com) keeps serving an OLD build even after a push.

# How to diagnose (fast, from the shell)
- The app is hosted on **Vercel** (confirm: `curl -sI https://simonyarrell.com/ | rg -i 'server:|x-vercel'` → `server: Vercel`). Source of truth is **GitHub `main`** (`awptwilson14-alt/simonyarrell.com`). Vercel builds `pnpm run build:web` → output `artifacts/mobile/dist` (see `vercel.json`).
- The service worker version is a reliable build-identity marker: `public/sw.js` has `const VERSION = "sy-vN"`. Compare three places:
  1. local: `rg 'VERSION =' artifacts/mobile/public/sw.js`
  2. GitHub main (ground truth — local remote refs can be stale): `curl -s https://raw.githubusercontent.com/awptwilson14-alt/simonyarrell.com/main/artifacts/mobile/public/sw.js | rg 'VERSION ='`
  3. live: `curl -s https://simonyarrell.com/sw.js | rg 'VERSION ='`
- If GitHub main version > live version, the code is fine and **the deploy is the problem** — do NOT keep hunting for a code bug.

# Two root causes (both Vercel-dashboard-only, agent cannot fix from repl)
1. **Production build failing** → Vercel keeps serving the last successful build. Likely cause: the Expo web static export is heavy (3,047-product `catalogFeed.ts` inlined + every route pre-rendered) → OOM/timeout. The same build gets OOM-killed locally when the 3 dev workflows are running.
2. **Vercel "Production Branch" ≠ `main`** → pushes to main only make preview deploys; prod domain stays pinned to an old branch.

# Resolution (user must do, in Vercel dashboard)
- Deployments tab → find the deployment for the latest commit → did it **fail**? If so, open build logs, share the error, then fix it in code.
- Settings → Git → confirm Production Branch = `main` and auto-deploy is on.

**Why:** Spent a whole session almost re-debugging an already-fixed CSS-hydration crash + sw.js 206 error because the live site never updated. The fixes were correct and on GitHub the entire time.
