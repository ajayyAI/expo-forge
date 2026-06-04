import { useCallback } from "react";
import { useWindowDimensions } from "react-native";

/**
 * Scales an icon/symbol size with the system Dynamic Type slider.
 *
 * Text-paired icons inherit Dynamic Type automatically, but standalone symbols
 * (e.g. a bare chevron) do not. Pass the base size you'd normally hard-code and
 * this hook returns it multiplied by the device `fontScale`, so the symbol
 * grows in lockstep with the label beside it.
 *
 *     const symbolSize = useSymbolSize();
 *     <Icon name="chevron-right" size={symbolSize(13)} />
 *
 * Pure (only `useWindowDimensions`) — safe on iOS, Android, and web.
 */
export function useSymbolSize(): (size: number) => number {
  const { fontScale } = useWindowDimensions();
  return useCallback(
    (size: number) => Math.round(size * fontScale),
    [fontScale]
  );
}
