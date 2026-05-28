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
 *   - LinearGradient → View with the first color in `colors` as a solid
 *     background. The vast majority of usages stack a dark gradient over
 *     a dark background, so the visual difference is minor (no fade, but
 *     no crash).
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
    const { colors, style, children, ...rest } = props;
    const fallback =
      Array.isArray(colors) && colors.length > 0
        ? (colors[0] as string)
        : "transparent";
    return (
      <View
        {...rest}
        style={[{ backgroundColor: fallback }, style as StyleProp<ViewStyle>]}
      >
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
