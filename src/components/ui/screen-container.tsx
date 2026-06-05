import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
}

// Caps and centers screen content on wide web viewports. Native has no wide
// viewport to tame, so this is a pass-through and mobile layout is untouched.
// The web canvas lives in screen-container.web.tsx.
export function ScreenContainer({ children }: Props) {
  return <>{children}</>;
}
