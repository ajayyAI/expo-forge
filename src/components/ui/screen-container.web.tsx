import type { ReactNode } from "react";
import { View } from "react-native";
import { twMerge } from "tailwind-merge";

interface Props {
  children: ReactNode;
  className?: string;
}

// Web canvas: cap content to a centered column so screens don't stretch edge to
// edge on desktop. A no-op on phone-width viewports (narrower than the cap).
// Native uses the pass-through in screen-container.tsx, so mobile is unaffected.
export function ScreenContainer({ children, className = "" }: Props) {
  return (
    <View className={twMerge("w-full max-w-2xl self-center", className)}>
      {children}
    </View>
  );
}
