---
name: api-server esbuild externalizes @google/*
description: Why a @google/* package used only through a workspace lib must ALSO be a direct dep of api-server.
---

# api-server bundling: `@google/*` (and other listed packages) are externalized

The api-server `build.mjs` esbuild `external` list includes `@google/*` (alongside
sharp, @aws-sdk/*, @grpc/*, etc.). So `@google/genai` is NOT bundled into
`dist/index.mjs`; the compiled output keeps a bare `import "@google/genai"`.

**The trap:** importing it only *transitively* (e.g. via
`@workspace/integrations-gemini-ai`, which is the direct dep) is not enough.
pnpm isolates the SDK inside the lib's own node_modules, so at runtime Node
resolves `@google/genai` from `artifacts/api-server/dist/` upward and fails with
`ERR_MODULE_NOT_FOUND` — the server crashes on boot for ALL routes.

**Rule:** any package on the esbuild `external` list that the api-server needs at
runtime (even through a workspace lib) must be a **direct dependency** of
`artifacts/api-server/package.json` so pnpm creates a resolvable symlink.

**How to apply:** if you add an integration lib that pulls an externalized SDK
(`@google/*`, `@aws-sdk/*`, `googleapis`, `firebase-admin`, etc.), add that SDK
to api-server deps too. Typecheck passes without it (types resolve transitively);
the failure only shows up at runtime after `pnpm run build && start`.
