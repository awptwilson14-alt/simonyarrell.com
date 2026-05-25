import { useEffect, useState } from "react";
import { Dimensions, Platform, type ScaledSize } from "react-native";

// Responsive breakpoints — additive layer that lets desktop web feel like a
// luxury fashion site while iPhone/Android keep the native-app feel. Native
// platforms always return `isMobile` (Dimensions reflects device width, not
// viewport), so no other screen logic changes on iOS/Android.
export type Breakpoint = "mobile" | "tablet" | "desktop";

const TABLET_MIN = 768;
const DESKTOP_MIN = 1024;
const DESKTOP_MAX_CONTENT_WIDTH = 1400;

function resolve(width: number) {
  const isMobile = width < TABLET_MIN;
  const isTablet = width >= TABLET_MIN && width < DESKTOP_MIN;
  const isDesktop = width >= DESKTOP_MIN;
  const breakpoint: Breakpoint = isDesktop
    ? "desktop"
    : isTablet
    ? "tablet"
    : "mobile";
  return {
    width,
    isMobile,
    isTablet,
    isDesktop,
    breakpoint,
    maxContentWidth: DESKTOP_MAX_CONTENT_WIDTH,
  };
}

export function useResponsive() {
  // Initial state may be wrong in two scenarios:
  // 1. Expo static web export (output:"static") pre-renders HTML at build
  //    time with no `window`, so `Dimensions.get("window").width` returns 0
  //    on the server pass and the hook latches into mobile breakpoint.
  // 2. Some web environments hydrate before Dimensions has measured the
  //    real window. We re-measure on mount (effect runs only on the
  //    client) and again on every resize so the desktop branch activates
  //    immediately after hydration without needing a manual viewport
  //    change.
  const [size, setSize] = useState(() => resolve(Dimensions.get("window").width));

  useEffect(() => {
    // Post-mount remeasure — fixes static-export hydration where the
    // initial useState value was computed against an empty window.
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const realWidth = window.innerWidth || Dimensions.get("window").width;
      const next = resolve(realWidth);
      setSize((prev) =>
        prev.width === next.width ? prev : next,
      );
    } else {
      const next = resolve(Dimensions.get("window").width);
      setSize((prev) =>
        prev.width === next.width ? prev : next,
      );
    }

    const onChange = ({ window: w }: { window: ScaledSize }) => {
      setSize(resolve(w.width));
    };
    const sub = Dimensions.addEventListener("change", onChange);
    return () => sub.remove();
  }, []);

  return size;
}

export const RESPONSIVE = {
  TABLET_MIN,
  DESKTOP_MIN,
  DESKTOP_MAX_CONTENT_WIDTH,
  isWeb: Platform.OS === "web",
} as const;
