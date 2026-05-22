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

- `artifacts/mobile/lib/outfitEngine.ts` — outfit generation, `CatalogItem` interface, in-line `CATALOG`
- `artifacts/mobile/lib/catalogExtras.ts` — hand-curated luxury PDPs with verified images/links
- `artifacts/mobile/lib/catalogFeed.ts` — **auto-generated** Shopify product feed (2,940 real PDPs across 21 brand-direct stores); do not hand-edit, regenerate via the in-chat fetcher
- `artifacts/mobile/lib/affiliate.ts` — click-time URL wrapper (Skimlinks / Rakuten / Impact / Awin / generic)
- `artifacts/api-server/src/routes/stylist.ts` — OpenAI stylist plan endpoint

## Architecture decisions

- **Catalog is code, not DB.** Three sources merge into a single `CATALOG` const at module load: in-line legacy items, `CATALOG_EXTRAS` (curated luxury PDPs), and `SHOPIFY_FEED` (auto-generated). Cheap to query, ships in the JS bundle, no network on cold start.
- **Catalog feed is sourced from public Shopify `/products.json` endpoints**, paginated per brand, normalized to `CatalogItem` with brand-fixed style tags and inferred categories. Every URL is the deterministic `domain/products/<handle>` pattern → no URL-validation pipeline needed.
- **Affiliate wrapping is click-time only.** The catalog stores raw brand URLs; `applyAffiliate()` rewrites them on tap based on `EXPO_PUBLIC_AFFILIATE_NETWORK` + `EXPO_PUBLIC_AFFILIATE_ID`. No-op when env vars are unset.
- **AI stylist resolves to catalog items only.** The OpenAI plan returns abstract slot specs; a local resolver picks real `CATALOG` items that match. Stylist never invents fake products.
- **`SHOPIFY_FEED` uses `as unknown as CatalogItem[]`** because TS2590 (union-too-complex) fires when annotating 2,940 inline rows. Shape is generator-guaranteed.

## Product

**Maison Simon / Simon Yarrell** — a luxury fashion styling app (dark `#0B0B0C` + gold `#C6A75E`). Users pick occasion, gender, budget, and style; an AI stylist composes 6+ outfits per request. Every piece is a real product from a real brand with a real PDP and real image — no AI-generated apparel, no fake links. Other capabilities: AI inspiration chips, color-story palette swatches, celebrity-look generation, designer brand-lock mode, and affiliate-ready BUY links.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `catalogFeed.ts` is generated. To refresh, re-run the in-chat fetcher (Shopify `/products.json` per brand → normalize → write file). Don't hand-edit individual rows.
- Don't add a type annotation to `SHOPIFY_FEED` — TS2590 will fire. Trust the trailing `as unknown as CatalogItem[]`.
- Don't break the deterministic Shopify URL pattern (`domain/products/<handle>`). If a brand moves off Shopify, drop it from the fetcher rather than hard-coding URLs.
- All click-out URLs must go through `applyAffiliate()` before `Linking.openURL` — adding a new BUY site means adding the call site, not bypassing it.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
