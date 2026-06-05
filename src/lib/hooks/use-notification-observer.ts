/**
 * Notification tap-to-route observer.
 *
 * Routes a notification tap to its `data.url` (an app-internal path only — see
 * resolveDeepLink) via expo-router. Mount once inside the navigation
 * tree so `router.push` is available. Auth-independent: tapping a notification
 * routes whether or not the user is signed in.
 */

import * as Notifications from "expo-notifications";
import type { Href } from "expo-router";
import { router } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import { Platform } from "react-native";

import { resolveDeepLink } from "@/lib/deep-link";
import { useLastNotificationResponse } from "./use-last-notification-response";

function routeFromResponse(response: Notifications.NotificationResponse): void {
  // Only a default tap opens the app; custom action buttons keep their own behavior.
  if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
    return;
  }
  const path = resolveDeepLink(response.notification.request.content.data?.url);
  if (!path) {
    if (__DEV__) {
      console.warn(
        "[notifications] blocked tap-route to non-internal url:",
        response.notification.request.content.data?.url
      );
    }
    return;
  }
  router.push(path as Href);
}

export function useNotificationObserver(): void {
  // Identifier of the response we've already routed, so the cold-start handler
  // and the warm listener never double-route the same tap.
  const routedId = useRef<string | null>(null);

  const routeOnce = useCallback(
    (response: Notifications.NotificationResponse) => {
      const id = response.notification.request.identifier;
      if (routedId.current === id) {
        return;
      }
      routedId.current = id;
      routeFromResponse(response);
    },
    []
  );

  // Cold start: the tap that launched the app, surfaced once on mount and
  // marked consumed by routeOnce. Native-only — the web override returns null.
  const lastResponse = useLastNotificationResponse();
  useEffect(() => {
    if (lastResponse) {
      routeOnce(lastResponse);
    }
  }, [lastResponse, routeOnce]);

  // Warm path: taps while the app is already running. No-op on web, which has
  // no native notification listeners.
  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    const responseSub =
      Notifications.addNotificationResponseReceivedListener(routeOnce);

    const receivedSub = __DEV__
      ? Notifications.addNotificationReceivedListener((notification) => {
          console.log(
            "[notifications] received:",
            notification.request.identifier
          );
        })
      : null;

    return () => {
      responseSub.remove();
      receivedSub?.remove();
    };
  }, [routeOnce]);
}
