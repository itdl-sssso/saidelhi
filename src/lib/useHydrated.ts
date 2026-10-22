import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** false during SSR and the hydration pass, true once the page runs in the browser. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
