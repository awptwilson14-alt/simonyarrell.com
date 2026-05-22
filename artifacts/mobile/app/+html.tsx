import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

/**
 * Custom HTML <head> for the web build. Expo Router renders this once at
 * the document root; it does NOT run in native (iOS / Android) builds.
 *
 * Responsibilities:
 *  - Wire up the Web App Manifest so Chrome / Edge / Safari treat the site
 *    as an installable PWA ("Add to Home Screen").
 *  - Register the service worker (`/sw.js`) for offline shell + image cache.
 *  - Apply Apple / Android theme colors so the status bar matches the app
 *    chrome when installed.
 *  - Keep Expo Router's default <ScrollViewStyleReset /> so RN-Web scroll
 *    behavior matches native.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />

        {/* PWA — Web App Manifest + theme */}
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#0B0B0C" />
        <meta name="background-color" content="#0B0B0C" />
        <meta name="application-name" content="Simon Yarrell" />

        {/* iOS — make installable + dark status bar */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Simon Yarrell" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />

        {/* SEO basics */}
        <meta
          name="description"
          content="Simon Yarrell — Luxury Styling, Powered by Intelligence. AI-generated outfits from a 3,000+ item real-product catalog."
        />

        <ScrollViewStyleReset />

        {/* Note: service-worker registration lives in `lib/pwa.ts` and runs
            on every page-load (dev + production). We intentionally do NOT
            inline a second register() here — duplicating it would just
            schedule two no-op registrations and muddy debugging. */}
      </head>
      <body>{children}</body>
    </html>
  );
}
