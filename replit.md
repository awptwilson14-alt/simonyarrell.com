# [Project name]

_Replace the heading above with the project's name, and this line with one sentence describing what this app does for users._

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Optional env (mobile/web): `EXPO_PUBLIC_AFFILIATE_NETWORK` (`skimlinks` | `rakuten` | `impact` | `awin` | `generic`) + `EXPO_PUBLIC_AFFILIATE_ID` — when both set, every BUY link is wrapped through the network's redirector so taps earn commission. Leave unset for un-monetised dev / preview.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/mobile/constants/data.ts` — `Look` interface (gender-tagged), static `LOOKS` seed (12 entries), `filterLooksForProfile(looks, profile)` — HARD gender + SOFT season filter every LOOKS consumer must route through
- `artifacts/mobile/lib/outfitEngine.ts` — outfit generation, `CatalogItem` interface, in-line `CATALOG`
- `artifacts/mobile/lib/catalogExtras.ts` — hand-curated luxury PDPs with verified images/links
- `artifacts/mobile/lib/catalogFeed.ts` — **auto-generated** Shopify product feed (3,047 real PDPs across 22 brand-direct stores, incl. Micas under-$500 womenswear); do not hand-edit, regenerate via the in-chat fetcher
- `artifacts/mobile/lib/affiliate.ts` — click-time URL wrapper (Skimlinks / Rakuten / Impact / Awin / CJ / LTK / ShareASale / generic). Reads runtime override from `affiliateSettings.ts` first, then env vars
- `artifacts/mobile/lib/affiliateSettings.ts` — AsyncStorage-backed runtime toggle (`enabled`, `network`, `publisherId`) with master kill-switch; in-app UI at `app/affiliate-settings.tsx`
- `artifacts/mobile/lib/runwayModes.ts` — runway + fashion-week vocab + `composeRunwayBrief()` for the Runway Styling Engine
- `artifacts/mobile/app/runway.tsx` — Real Luxury Runway Styling Engine screen (entry CTA on home hero). Pipes runway/fashion-week selections through the existing `/api/stylist/plan` endpoint
- `artifacts/api-server/src/routes/stylist.ts` — OpenAI stylist plan endpoint
- `artifacts/api-server/src/routes/usage.ts` — `/api/usage/today` GET + `/api/usage/look-attempt` POST (free-tier 3/day metering)
- `artifacts/api-server/src/routes/subscriptions.ts` — `/api/subscriptions/sync` POST (RC purchase → server-side tier mirror)
- `lib/db/src/schema/userSubscriptions.ts` + `dailyLookUsage.ts` — sub tier mirror + per-day look counter (unique on userId+date)
- `artifacts/mobile/lib/tiers.ts` — 5-tier matrix (Basic free / Premium / Pro / VIP / Diamond), `Feature` enum, `tierIncludes`, `minTierFor`, `FREE_DAILY_LOOK_CAP=3`
- `artifacts/mobile/lib/entitlements.ts` — `deriveTierFromCustomerInfo(info)` pure function (highest active RC entitlement wins)
- `artifacts/mobile/context/EntitlementsContext.tsx` — `{tier, can, requireFeature, looksToday, lookCap, showUpgradePrompt}`; renders `TierLockPrompt` internally
- `artifacts/mobile/components/TierLockPrompt.tsx` — editorial upgrade modal opened by `requireFeature`
- `artifacts/mobile/app/membership.tsx` — 5-tier editorial paywall; honours `?required=<tier>` deep-link from lock prompts; posts to `/subscriptions/sync` after RC purchase
- `artifacts/mobile/public/{manifest.webmanifest,sw.js,icon-*.png,apple-touch-icon.png}` — PWA assets served at web root
- `artifacts/mobile/lib/pwa.ts` — runtime PWA bootstrap (head tag injection + service-worker registration); called once from `app/_layout.tsx`
- `artifacts/mobile/app/+html.tsx` — custom HTML root used by Expo Router's **static export** (production); dev preview uses Metro's default template, which is why `lib/pwa.ts` exists

## Architecture decisions

- **Catalog is code, not DB.** Three sources merge into a single `CATALOG` const at module load: in-line legacy items, `CATALOG_EXTRAS` (curated luxury PDPs), and `SHOPIFY_FEED` (auto-generated). Cheap to query, ships in the JS bundle, no network on cold start.
- **Catalog feed is sourced from public Shopify `/products.json` endpoints**, paginated per brand, normalized to `CatalogItem` with brand-fixed style tags and inferred categories. Every URL is the deterministic `domain/products/<handle>` pattern → no URL-validation pipeline needed.
- **Affiliate wrapping is click-time only.** The catalog stores raw brand URLs; `applyAffiliate()` rewrites them on tap based on `EXPO_PUBLIC_AFFILIATE_NETWORK` + `EXPO_PUBLIC_AFFILIATE_ID`. No-op when env vars are unset.
- **AI stylist resolves to catalog items only.** The OpenAI plan returns abstract slot specs; a local resolver picks real `CATALOG` items that match. Stylist never invents fake products.
- **Budget is a HARD cap on the look TOTAL, not per-item.** Every look displayed on the budget page must have `estimatedPrice` (sum of all pieces) ≤ the selected budget's max. `generateLooks` keeps `useBudget:true` on every pass (relax occasion/style to fill the grid, never budget) and filters its final array; `generateLookFromAIPlan` returns `null` when the resolved total exceeds budget (AI looks render on the same budget page). A too-tight budget legitimately yields fewer/zero looks — that's the intended empty state, handled by both brand-lock and generic over-budget messaging in `style.tsx`. Never reintroduce a `useBudget:false` "always fill count" pass — that was the original over-budget bug.
- **`SHOPIFY_FEED` uses `as unknown as CatalogItem[]`** because TS2590 (union-too-complex) fires when annotating 2,940 inline rows. Shape is generator-guaranteed.
- **PWA tags are injected twice on purpose.** `+html.tsx` only runs during Expo's static export (production build); dev mode serves Metro's default template. To make Add-to-Home-Screen, theme-color, and the service worker work in *both* dev preview and production, `lib/pwa.ts` re-injects the same tags at runtime from `_layout.tsx`. The runtime injector is idempotent (selector-deduped) so it's a no-op when the static-export HTML already has them.
- **Service worker is `/sw.js` at the web root, scope `/`.** App shell is network-first (fresh code online, cached fallback offline), images are cache-first with a 300-entry cap, `/api/*` is network-only (stylist/outfit responses must be fresh). Versioned cache name (`sy-v1`) so bumping invalidates everything.
- **Entitlements are derived, not stored.** RevenueCat `customerInfo.entitlements.active` is the source of truth; `deriveTierFromCustomerInfo` walks TIER_DEFINITIONS highest-first and returns the matching `TierId`. The server-side `user_subscriptions` row exists only so the `/usage/look-attempt` endpoint can trust the tier on each call without re-fetching RC — it's a mirror, never a primary. `/subscriptions/sync` writes it on successful purchase.
- **Free-tier cap is server-enforced atomically.** `/usage/look-attempt` does a read-then-INSERT-ON-CONFLICT-UPDATE increment scoped on (userId, date). Client `attemptLookGeneration()` is called BEFORE each AI plan request and throws a typed `LookCapExceededError` when the server denies. Failures other than HTTP 200 fall OPEN — we'd rather over-serve than block paying members on a transient API blip.
- **`requireFeature(feature)` is the single gate primitive.** Returns true when allowed, otherwise opens `TierLockPrompt` (and Upgrade routes to `/membership?required=<tier>` with the matching tier preselected). Used by home pills, Runway CTA, and the AI generation flows. Adding a new gated surface = one call, never an ad-hoc modal.
- **Server-side cap enforcement is in TWO layers and both matter.** (1) The `tier` field in the `/usage/look-attempt` request body is IGNORED — the server reads the authoritative tier from `user_subscriptions` via `resolveServerTier()`. A free user POSTing `tier=diamond` is still capped. (2) The cap check + increment is a single SQL upsert with `setWhere: looksGenerated < cap`, so two concurrent requests at the cap boundary can't both win. The denied branch re-reads the count to report the truth. Do NOT replace this with a read-then-write — it reintroduces a TOCTOU race.

## Product

**Maison Simon / Simon Yarrell** — a luxury fashion styling app (dark `#0B0B0C` + gold `#C6A75E`). Users pick occasion, gender, budget, and style; an AI stylist composes 6+ outfits per request. Every piece is a real product from a real brand with a real PDP and real image — no AI-generated apparel, no fake links. Other capabilities: AI inspiration chips, color-story palette swatches, celebrity-look generation, designer brand-lock mode, and affiliate-ready BUY links.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `catalogFeed.ts` is generated. To refresh, re-run the in-chat fetcher (Shopify `/products.json` per brand → normalize → write file). Don't hand-edit individual rows.
- Don't add a type annotation to `SHOPIFY_FEED` — TS2590 will fire. Trust the trailing `as unknown as CatalogItem[]`.
- Don't break the deterministic Shopify URL pattern (`domain/products/<handle>`). If a brand moves off Shopify, drop it from the fetcher rather than hard-coding URLs.
- All click-out URLs must go through `openExternalUrl()` (from `lib/openExternal.ts`) — it applies the affiliate wrapper AND opens via synchronous `window.open` on web (popup blockers kill `Linking.openURL` on web because RNW defers `window.open` to a Promise microtask, out of the user-gesture stack). Never call `Linking.openURL(applyAffiliate(...))` directly from a tap handler. Falls back to `window.location.assign` if the popup is blocked, then to `Linking.openURL` as a last resort on native.
- **Never chain multiple `window.open`/external opens from a single tap** (e.g. `setTimeout` loops, `forEach`+open). Browsers flag this as popup-bombing and block everything after the first. The "Shop All" CTA on `look/[id].tsx` deliberately opens only the first piece for this reason.
- `/api/subscriptions/sync` is currently client-callable and unauthenticated — fine for a pre-launch state with anonymous RC IDs, but a malicious client could POST `{userId, tier:"diamond", status:"active"}` against any user's RC anonymous ID and grant themselves a tier. Before public launch, swap this to a RevenueCat server-to-server webhook (or add a signed payload + per-userId rate limit). Server-side cap enforcement in `/usage/look-attempt` still depends on this table being trustworthy.
- Affiliate tracking precedence (in `activeConfig()` in `affiliate.ts`): (1) unhydrated → no-op (closes first-tap race), (2) user has saved any settings → runtime is authoritative, env vars ignored even when OFF, (3) no saved override → env vars fall back for legacy deployments. The in-app toggle in `app/affiliate-settings.tsx` is the single master switch once touched. Adding a new network means: (1) add it to `AFFILIATE_NETWORKS` in `affiliateSettings.ts`, (2) add the URL-tagging switch case in `affiliate.ts`, (3) add labels/hints in `affiliate-settings.tsx`.
- Runway engine is **additive** — never bypasses the AI stylist's HARD gender + season + budget constraints. `composeRunwayBrief()` only augments the free-text `prompt` field.
- **Never use legacy `shadow*` style props** (`shadowColor` / `shadowOffset` / `shadowOpacity` / `shadowRadius`) anywhere — on web, RN-Web's `preprocess()` runs a conversion to `boxShadow` that, when the shadow payload is malformed or interacts badly with array styles, throws `TypeError: Failed to set an indexed property [0] on 'CSSStyleDeclaration'` and can crash the page (an ErrorBoundary rendering ErrorFallback that itself uses shadow* compounds into a cascading failure loop). Always use the web-native string form: `boxShadow: "0px 2px 4px rgba(0,0,0,0.1)"` + `elevation: N` for Android. The whole source tree is currently clean — keep it that way.
- **Do NOT wrap third-party-shim style arrays in `StyleSheet.flatten()` "defensively".** Plain `style={[a, b]}` arrays passed to `expo-image`, `expo-linear-gradient`, `BlurView`, etc. work correctly on web — this is canonical RN syntax that RN-Web's preprocessor handles natively. A previous round of fixes wrapped these in `StyleSheet.flatten()` thinking it would prevent indexed-property errors; in practice it changed nothing and the user reported the web version started misbehaving after that change. Keep array-style passes plain.
- **HeroAudio on web mounts muted and stays muted until the user taps the visible speaker icon.** Browsers reject audible autoplay without a gesture; on native iOS/Android the audio session is configured for immediate playback. A document-level gesture auto-unlock was tried briefly and then removed — it correlated with a home-tab render crash on web. If reintroducing, validate thoroughly on Safari + Chrome before shipping.
- **`_layout.tsx` installs a `[CRASH-TRAP]` error swallower** for the persistent "Failed to set indexed property [0] on CSSStyleDeclaration" error in production. The trap logs the message + truncated stack to the console with the `[CRASH-TRAP]` prefix and `event.preventDefault()`s the error so a single bad style assignment can't cascade through React's commit phase. Leave it in until the root cause is identified and removed; harmless when no matching error fires.
- `LOOKS` in `constants/data.ts` is **gender-tagged static seed**. Every screen that surfaces a static look to the user (home `(tabs)/index.tsx`, `tryon.tsx`, related-looks in `look/[id].tsx`) MUST filter through `filterLooksForProfile(LOOKS, userProfile)`. Iterating `LOOKS` directly will leak women's looks into a Men profile (and vice versa). AI-generated looks already stamp `gender` from `genderKey` in `outfitEngine.ts`, so they obey the same Look-interface contract.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
