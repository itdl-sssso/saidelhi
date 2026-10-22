"use client";

import { useEffect } from "react";

/** Registers the /f/ service worker (scope = this page's /f/ or /hi/f/ prefix) so the form shell opens without signal. */
export function SwRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const scope = location.pathname.startsWith("/hi/f/") ? "/hi/f/" : "/f/";
    navigator.serviceWorker.register("/f-sw.js", { scope }).catch(() => undefined);
  }, []);
  return null;
}
