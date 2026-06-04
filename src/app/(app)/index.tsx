import { useRouter } from "expo-router";
import { useEffect } from "react";

import { LoadingScreen } from "@/components/ui";
import { HomeScreen } from "@/features/home/home-screen";
import { useIsFirstTime } from "@/lib/hooks/use-is-first-time";

// First-launch gate. The redirect runs in an effect, not as a render-phase
// <Redirect>: on a cold start the root navigator isn't mounted yet, so a
// render-phase redirect resolves against an empty tree and lands on +not-found.
// Deferring to after mount navigates once the navigator is ready.
export default function Index() {
  const [isFirstTime] = useIsFirstTime();
  const router = useRouter();

  useEffect(() => {
    if (isFirstTime) {
      router.replace("/onboarding");
    }
  }, [isFirstTime, router]);

  if (isFirstTime) {
    return <LoadingScreen />;
  }

  return <HomeScreen />;
}
