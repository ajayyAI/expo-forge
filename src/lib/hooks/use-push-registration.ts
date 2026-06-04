/**
 * Push token registration lifecycle.
 *
 * Registers the device's Expo push token with the backend once per
 * authenticated session and re-registers on token rotation. Token lifecycle
 * only — tap-to-route lives in src/lib/hooks/use-notification-observer.ts.
 */

import { api } from "convex/_generated/api";
import * as Notifications from "expo-notifications";
import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

import { useConvexAuth, useMutation } from "@/lib/convex";
import {
  type DeviceType,
  getDeviceType,
  getExpoPushToken,
  requestPermission,
} from "@/lib/notifications";

const PUSH_SUPPORTED = Platform.OS === "ios" || Platform.OS === "android";

export function usePushRegistration(): { expoPushToken: string | null } {
  const { isAuthenticated } = useConvexAuth();
  const upsert = useMutation(api.pushTokens.upsert);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);

  // One registration attempt per auth session; reset on sign-out so the next
  // sign-in re-registers.
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!(PUSH_SUPPORTED && isAuthenticated)) {
      return;
    }

    const deviceType = getDeviceType();
    if (!deviceType) {
      return;
    }

    async function register(type: DeviceType) {
      if (registeredRef.current) {
        return;
      }
      registeredRef.current = true;

      const status = await requestPermission();
      if (status !== "granted") {
        return;
      }

      const token = await getExpoPushToken();
      if (!token) {
        return;
      }

      setExpoPushToken(token);
      await upsert({ token, deviceType: type });
    }

    register(deviceType);
  }, [isAuthenticated, upsert]);

  // Re-upsert when Expo rotates the token. The listener fires with the native
  // device token, so re-fetch the Expo token rather than using the payload.
  useEffect(() => {
    if (!(PUSH_SUPPORTED && isAuthenticated)) {
      return;
    }

    const deviceType = getDeviceType();
    if (!deviceType) {
      return;
    }

    let active = true;
    const subscription = Notifications.addPushTokenListener(() => {
      getExpoPushToken().then((token) => {
        if (!(active && token)) {
          return;
        }
        setExpoPushToken(token);
        upsert({ token, deviceType });
      });
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, [isAuthenticated, upsert]);

  // Clear the guard + token on sign-out so a later sign-in re-registers.
  useEffect(() => {
    if (!isAuthenticated) {
      registeredRef.current = false;
      setExpoPushToken(null);
    }
  }, [isAuthenticated]);

  return { expoPushToken };
}
