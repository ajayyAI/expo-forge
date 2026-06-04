// Type-only import: erased at compile time, so it does NOT pull `@expo/ui`'s
// native module (`requireNativeModule('ExpoUI')`) into the web/Android bundle.
import type { useNativeState } from "@expo/ui/swift-ui";
import { runOnUI } from "react-native-worklets";

type ObservableState<T> = ReturnType<typeof useNativeState<T>>;

/**
 * Safely write to an `@expo/ui` `ObservableState` from the JS thread.
 *
 * Hops the write onto the UI worklet runtime so the update lands on the same
 * thread that drives the native (SwiftUI / Compose) host. Reads of `.value`
 * are safe from any thread, but writing from the JS thread races the renderer
 * and trips `ObservableState.value was set from the JS thread` in dev.
 *
 * Only the TYPE of `useNativeState` is imported here, so this module carries no
 * native dependency and is safe to import from shared code; the `state` you
 * pass in is created on-device by the iOS/Android SwiftUI/Compose layer.
 */
export function setNativeValue<T>(state: ObservableState<T>, value: T): void {
  runOnUI(() => {
    "worklet";
    state.value = value;
  })();
}
