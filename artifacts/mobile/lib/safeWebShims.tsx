/**
 * Web-safe shims for `LinearGradient` and `BlurView`.
 *
 * Round-8 diagnostic. The persistent "Failed to set an indexed property [0]
 * on CSSStyleDeclaration" home-tab crash on desktop web has resisted
 * surgical fixes for many rounds. Per the user's binary-search instruction,
 * this module replaces both components with plain `View` fallbacks ON WEB
 * ONLY. Native iOS/Android continues to render the real components — no
 * visual regression on the native app.
 *
 * Web fallbacks:
 *   - LinearGradient → View with a real CSS `linear-gradient(...)` painted
 *     via `backgroundImage`. Still a plain View (no expo-linear-gradient on
 *     web, so the crash-safety of this shim is unchanged), but the actual
 *     gradient renders. The previous fallback painted the FIRST color as a
 *     SOLID background, which turned the onboarding splash's framing
 *     gradient into an opaque near-black veil that hid the hero models
 *     entirely.
 *   - BlurView → View with a translucent dark backdrop (rgba(11,11,12,0.7))
 *     which is the only place BlurView is used in this app (tab bar).
 *
 * To re-enable either component on web after the crash is fixed: change the
 * Platform check below to return the real component again, OR delete this
 * file and revert the import edits.
 */

import React from "react";
import { Platform, View, type ViewStyle, type StyleProp } from "react-native";
import {
  LinearGradient as RealLinearGradient,
  type LinearGradientProps,
} from "expo-linear-gradient";
import { BlurView as RealBlurView, type BlurViewProps } from "expo-blur";

const IS_WEB = Platform.OS === "web";

export function LinearGradient(props: LinearGradientProps) {
  if (IS_WEB) {
    const { colors, locations, start, end, style, children, ...rest } = props;
    const colorList = Array.isArray(colors) ? (colors as string[]) : [];

    let webStyle: ViewStyle;
    if (colorList.length >= 2) {
      // CSS angle: 0deg = to top, measured clockwise. RN start/end are in
      // a unit square with y pointing DOWN; direction (dx, dy) maps to
      // θ = atan2(dx, -dy). Defaults (0.5,0)→(0.5,1) give 180deg (top→bottom).
      // LinearGradientPoint can be {x, y} or a [x, y] tuple — normalize.
      const toXY = (
        p: LinearGradientProps["start"],
        fx: number,
        fy: number
      ): [number, number] => {
        if (Array.isArray(p)) return [p[0] ?? fx, p[1] ?? fy];
        if (p && typeof p === "object") return [p.x ?? fx, p.y ?? fy];
        return [fx, fy];
      };
      const [sx, sy] = toXY(start, 0.5, 0);
      const [ex, ey] = toXY(end, 0.5, 1);
      const dx = ex - sx;
      const dy = ey - sy;
      const angle =
        dx === 0 && dy === 0
          ? 180
          : Math.round((Math.atan2(dx, -dy) * 180) / Math.PI);
      const stops = colorList
        .map((c, i) => {
          const loc =
            locations && locations[i] != null
              ? (locations[i] as number)
              : i / (colorList.length - 1);
          return `${c} ${(loc * 100).toFixed(2)}%`;
        })
        .join(", ");
      webStyle = {
        backgroundImage: `linear-gradient(${angle}deg, ${stops})`,
      } as ViewStyle;
    } else {
      webStyle = {
        backgroundColor: colorList.length === 1 ? colorList[0] : "transparent",
      };
    }

    return (
      <View {...rest} style={[webStyle, style as StyleProp<ViewStyle>]}>
        {children}
      </View>
    );
  }
  return <RealLinearGradient {...props} />;
}

export function BlurView(props: BlurViewProps) {
  if (IS_WEB) {
    const { style, children, ...rest } = props as BlurViewProps & {
      children?: React.ReactNode;
    };
    return (
      <View
        {...(rest as object)}
        style={[
          { backgroundColor: "rgba(11,11,12,0.7)" },
          style as StyleProp<ViewStyle>,
        ]}
      >
        {children}
      </View>
    );
  }
  return <RealBlurView {...props} />;
}
