import React from "react";
import { Text } from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  glyph?: string;
}

/**
 * Inline gold middle-dot separator. Use INSIDE a parent <Text> node when the
 * surrounding text isn't already gold (typical pattern: muted-foreground or
 * off-white parent + gold dot as the editorial accent).
 *
 * Renders as a nested <Text> so it inherits parent fontSize / fontFamily /
 * letterSpacing / lineHeight — only color is overridden. Default glyph is
 * " · " (middle-dot with surrounding hair-spaces) which is the cadence used
 * across the app's metadata rows.
 *
 * Pattern established by batches 129 (look heroCrumb) and 131 (membership
 * banner sub + extraction). The opposite case — parent IS already gold and
 * the tokens AROUND the dot need to be muted — uses inline color overrides
 * on the tokens (see batch 130, profile identity row).
 */
export function GoldDot({ glyph = " · " }: Props) {
  const colors = useColors();
  return <Text style={{ color: colors.gold }}>{glyph}</Text>;
}
