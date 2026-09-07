"use client";

import { useEffect } from "react";

/** Run an async loader when enabled / reloadKey changes, without sync setState in the effect body. */
export function useLoadWhen(
  enabled: boolean,
  load: () => void | Promise<void>,
  reloadKey: string | number = 0,
) {
  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!cancelled) void load();
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [enabled, reloadKey, load]);
}
