"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useLocale } from "next-intl";
import type { AppLocale } from "@/lib/format";
import { linkApi } from "../api";
import { browserKv } from "../kv";
import { FormStore, linkKeyOf } from "../store";

let storeP: Promise<FormStore> | null = null;
export const openStore = () => (storeP ??= browserKv().then((kv) => new FormStore(kv)));

/** Per-link handles used by every /f/ screen: the API client, the draft store and the hashed link key. */
export function useLink(token: string) {
  const locale = useLocale() as AppLocale;
  const api = useMemo(() => linkApi(token, locale), [token, locale]);
  const [env, setEnv] = useState<{ store: FormStore; linkKey: string } | null>(null);
  useEffect(() => {
    let live = true;
    void Promise.all([openStore(), linkKeyOf(token)]).then(([store, linkKey]) => live && setEnv({ store, linkKey }));
    return () => {
      live = false;
    };
  }, [token]);
  return { locale, api, store: env?.store ?? null, linkKey: env?.linkKey ?? null };
}

const subscribeOnline = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
};

/** navigator.onLine as state (true on the server render). */
export function useOnline(): boolean {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
}

/** Seconds left until `until` (epoch ms), ticking twice a second; 0 when null or past. */
export function useCountdown(until: number | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (until === null) return;
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 500);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [until]);
  return until === null ? 0 : Math.max(0, Math.ceil((until - now) / 1000));
}

export const formPaths = (token: string) => ({
  verify: `/f/${token}`,
  form: `/f/${token}/form`,
  done: `/f/${token}/done`,
});
