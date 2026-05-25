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
  const [size, setSize] = useState(() => resolve(Dimensions.get("window").width));

  useEffect(() => {
    // Only web needs live resize tracking — native devices don't change
    // viewport at runtime (orientation rotations re-emit too, harmless).
    const onChange = ({ window }: { window: ScaledSize }) => {
      setSize(resolve(window.width));
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
