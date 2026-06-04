import { Linking } from "react-native";
import type { StoreApi, UseBoundStore } from "zustand";

export function openLinkInBrowser(url: string) {
  Linking.canOpenURL(url).then((canOpen) => canOpen && Linking.openURL(url));
}

type WithSelectors<S> = S extends { getState: () => infer T }
  ? S & { use: { [K in keyof T]: () => T[K] } }
  : never;

export function createSelectors<S extends UseBoundStore<StoreApi<object>>>(
  _store: S
) {
  const store = _store as WithSelectors<typeof _store>;
  store.use = {};
  for (const k of Object.keys(store.getState())) {
    // biome-ignore lint/suspicious/noExplicitAny: indexing the dynamically-built `use` selector map requires erasing the per-key signature; the public type is restored by WithSelectors<S>.
    (store.use as any)[k] = () => store((s) => s[k as keyof typeof s]);
  }

  return store;
}
