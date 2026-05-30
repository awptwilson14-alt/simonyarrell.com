---
name: Desktop-web "indexed property [0]" crash
description: Confirmed root cause + fix for the Maison Simon desktop-web "Failed to set an indexed property [0] on CSSStyleDeclaration" crash
---

# Desktop-web "Failed to set an indexed property [0] on CSSStyleDeclaration" crash

## Confirmed root cause (verified by direct reproduction)
A **style ARRAY reaching a raw DOM host element**. React DOM's `setValueForStyle`
iterates the style object with `for (k in styles)`; if `styles` is an array it
walks indices `"0","1"...` and calls `style["0"] = ...` → "Failed to set an indexed
property [0] on CSSStyleDeclaration". RN-Web flattens array styles for
`View`/`Text`/`Pressable`, so the array only escapes to the DOM through a real
host element.

The offender was **`components/DesktopNav.tsx`** using expo-router
`<Link asChild><Pressable style={[...]}>`. On web, `Link` renders a real `<a>`
DOM element and, with `asChild`, merges the child `Pressable`'s RN **style array**
onto that `<a>`. The `<a>` host does not flatten → array hits React DOM → crash.

**Fix:** navigate imperatively — `const router = useRouter()` + plain
`<Pressable onPress={() => router.push(href)}>`, no `<Link>`/`asChild`, so no `<a>`
host ever receives an RN style array. (Pressable/Text/View keep their array styles;
those flatten fine.)

**Why it was desktop-only:** `DesktopNav` only renders on web at ≥1024px
(`hooks/useResponsive.ts` DESKTOP_MIN); mobile/tablet/native never mount it.

## Reproduction — IS possible in the dev preview (corrects earlier note)
It DOES reproduce in `expo start` dev preview, contrary to a prior hydration-theory
note. Two requirements:
1. **Desktop viewport ≥1024px** — screenshot at e.g. `[1280, 800]`. Headless
   Chrome's default ~800px is below the breakpoint, so DesktopNav never mounts and
   you see no crash (this is what made earlier rounds think it was unreproducible).
2. **Land on a tab route directly** (`/explore`, `/style`, ...) — `/` redirects to
   `/onboarding` when onboarding isn't complete, so it never reaches the tab layout
   where DesktopNav lives.
With DesktopNav's `Link asChild` present at 1280px → ErrorBoundary "Something went
wrong" + the indexed-property TypeError in console. With router.push → clean.

## General rule
Never pass an RN style array (`style={[...]}`) through any wrapper that forwards it
to a DOM host element (expo-router `Link asChild`, anything rendering `<a>`/`<div>`).
Either flatten with `StyleSheet.flatten(...)` before it hits the host, or avoid the
host wrapper entirely (imperative navigation).

## Browser extensions were a red herring
MetaMask / SES lockdown / chrome-extension noise in the console is unrelated; the
crash reproduces clean in dev.

## Deploy gotcha
The live site is deployed separately from local commits. A committed fix can be
absent from the deployed build, so the user keeps seeing the crash on a stale site.
Confirm the fix is on the deployed build (and bump `public/sw.js` VERSION so stale
service-worker caches purge) before concluding a fix "didn't work". See
`vercel-deploy-stale-build.md`.
