---
name: Web LinearGradient shim renders real CSS gradient
description: safeWebShims LinearGradient on web must emit a CSS linear-gradient, never a solid first-color View
---

Rule: on web, the `LinearGradient` shim in `safeWebShims` renders a plain View with a CSS `linear-gradient(...)` via `backgroundImage` (angle from start/end, stops from locations). It must never fall back to painting the FIRST gradient color as a solid background.

**Why:** the original crash-safety shim painted the first color solid; on the onboarding splash that first color was rgba(11,11,12,0.92), producing an opaque near-black veil that made the hero models completely invisible on web (user-reported bug). The solid-first-color fallback silently ruins any gradient whose first stop is heavy.

**How to apply:** keep gradient overlays' first stops as heavy as design needs — the shim now renders them faithfully. If adding gradient features (useAngle, angleCenter), extend the shim's CSS mapping rather than reverting to a solid fill. Crash-safety is preserved because expo-linear-gradient is still never mounted on web.
