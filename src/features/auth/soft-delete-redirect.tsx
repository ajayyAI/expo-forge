import { api } from "convex/_generated/api";
import { useRouter, useSegments } from "expo-router";
import { type ReactNode, useEffect } from "react";

import { authClient } from "@/lib/auth-client";
import { useQuery } from "@/lib/convex";

const RESTORE_HREF = "/restore-account";
const RESTORE_SEGMENT = "restore-account";

/**
 * App-wide safety net for routes that live outside the `(app)` group and so
 * never pass through its AuthGate. Redirecting imperatively (rather than with
 * a declarative `<Redirect>`) keeps the root navigator mounted, which
 * `router.replace` needs to work.
 */
export function SoftDeleteRedirect({ children }: { children: ReactNode }) {
  const { data: session } = authClient.useSession();
  const me = useQuery(api.users.getMe);
  const segments = useSegments();
  const router = useRouter();

  const isDeleted = !!session?.session && !!me?.deletedAt;
  const onRestoreScreen = segments[0] === RESTORE_SEGMENT;

  useEffect(() => {
    if (isDeleted && !onRestoreScreen) {
      router.replace(RESTORE_HREF);
    }
  }, [isDeleted, onRestoreScreen, router]);

  return <>{children}</>;
}
