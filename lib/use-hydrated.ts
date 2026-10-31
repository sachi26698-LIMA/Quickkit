"use client";
import { useSyncExternalStore } from "react";
const subscribe = () => () => {};
// Prevents editable SSR controls from accepting input before React attaches handlers.
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
