"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { cx } from "@/ui/cx";
import type { LotusStage } from "./lotus/stage";
import type { Starfield } from "./lotus/starfield";
import { VALUE_KEYS } from "./values";
import styles from "./LotusJourney.module.css";

const VEIL_CAP_MS = 4000;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const smooth = (t: number) => t * t * (3 - 2 * t);

// Sky colour from night to dawn cream as Act I progresses (design: a2-app-v2.jsx).
const STOPS: [number, [number, number, number]][] = [
  [0, [4, 6, 11]],
  [0.3, [38, 35, 56]],
  [0.55, [110, 96, 121]],
  [0.78, [201, 179, 182]],
  [1, [255, 253, 243]],
];
function skyAt(p: number): string {
  let a = STOPS[0];
  let b = STOPS[STOPS.length - 1];
  for (let i = 0; i < STOPS.length - 1; i++) {
    if (p >= STOPS[i][0] && p <= STOPS[i + 1][0]) {
      a = STOPS[i];
      b = STOPS[i + 1];
      break;
    }
  }
  const t = (p - a[0]) / (b[0] - a[0] || 1);
  return `rgb(${a[1].map((v, i) => Math.round(v + (b[1][i] - v) * t)).join(",")})`;
}

type NavigatorExtras = Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };

/** Whether this device should get the 3D journey; everyone else keeps the static poster. */
function canEnhance(): boolean {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  const nav = navigator as NavigatorExtras;
  if (nav.connection?.saveData) return false;
  if ((nav.hardwareConcurrency ?? 8) < 4 || (nav.deviceMemory ?? 8) < 2) return false;
  try {
    const probe = document.createElement("canvas");
    return !!(probe.getContext("webgl2") ?? probe.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * The pinned stage behind the lotus journey: poster, sky canvas, WebGL canvas, the value
 * photo riding on the lotus heart, and the petal rail. It drives the server-rendered
 * acts and petal panels through data attributes on the journey root, so all text is in
 * the HTML from the start and the hero never waits for three.js.
 */
export function JourneyStage({ photos }: { photos: { key: string; src: string }[] }) {
  const t = useTranslations("home");
  const stageRef = useRef<HTMLDivElement>(null);
  const skyRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<HTMLCanvasElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const heartRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const stageEl = stageRef.current;
    const root = stageEl?.parentElement;
    const skyCanvas = skyRef.current;
    const glCanvas = glRef.current;
    if (!stageEl || !root || !skyCanvas || !glCanvas) return;

    if (!canEnhance()) {
      root.dataset.mode = "static";
      return;
    }
    root.dataset.mode = "enhanced";
    // Never hold the page behind the loading veil: lift it after a few seconds even if the
    // lotus is still loading (it fades in over the poster when ready).
    const veilCap = window.setTimeout(() => (root.dataset.veil = "off"), VEIL_CAP_MS);

    let disposed = false;
    let stage: LotusStage | null = null;
    let sky: Starfield | null = null;
    let raf = 0;
    let visible = true;
    let lastKey = "";
    const cleanups: (() => void)[] = [];

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const act1 = document.getElementById("act1");
      const act2 = document.getElementById("act2");
      if (!act1 || !act2 || !stage || !sky) return;
      const vh = stageEl.clientHeight || window.innerHeight;
      const y = window.scrollY;
      const a1Top = act1.getBoundingClientRect().top + y;
      const a2Top = act2.getBoundingClientRect().top + y;
      const p1 = clamp((y - a1Top) / Math.max(1, act1.offsetHeight - vh), 0, 1);
      const f = clamp((y - a2Top) / vh, -1, 4);
      const exposure = smooth(clamp((p1 - 0.13) / 0.77, 0, 1));
      const wide = window.innerWidth > 900;
      const bloom = 0.3 + 0.7 * smooth(clamp((p1 - 0.18) / 0.62, 0, 1));
      stage.set({ bloom, exposure, focus: f, shift: wide ? 0.86 * clamp(f + 1, 0, 1) : 0, spin: p1 * 0.5 });
      const skyCss = skyAt(p1);
      stageEl.style.backgroundColor = skyCss;
      if (root) root.style.backgroundColor = skyCss; // real CSS bg behind text (contrast tools / no-canvas)
      if (glowRef.current) glowRef.current.style.opacity = (bloom * exposure * 0.55).toFixed(3);
      sky.set({ dawn: smooth(clamp((p1 - 0.06) / 0.42, 0, 1)), petals: smooth(clamp((p1 - 0.46) / 0.3, 0, 1)) });

      const act = p1 < 0.28 ? 0 : p1 < 0.58 ? 1 : p1 < 0.84 ? 2 : 3;
      const focus = f > -0.55 ? Math.round(f) : -1;
      const tone = p1 < 0.62 ? "dark" : "light";
      const hint = p1 < 0.05 ? "1" : "0";
      const key = `${act}|${focus}|${tone}|${hint}`;
      if (key !== lastKey) {
        lastKey = key;
        root.dataset.act = String(act);
        root.dataset.focus = String(focus);
        root.dataset.tone = tone;
        root.dataset.hint = hint;
        railRef.current?.querySelectorAll("a").forEach((a, i) => {
          if (i === focus) a.setAttribute("aria-current", "true");
          else a.removeAttribute("aria-current");
        });
      }

      // The focused value's photo rides over the heart of the model.
      const heart = heartRef.current;
      if (heart) {
        const h = stage.heart;
        heart.style.transform = `translate(${(h.x - h.size / 2).toFixed(1)}px,${(h.y - h.size / 2).toFixed(1)}px)`;
        heart.style.width = `${h.size.toFixed(1)}px`;
        heart.style.height = `${h.size.toFixed(1)}px`;
        heart.querySelectorAll("img").forEach((img, i) => {
          img.style.opacity = String(focus >= 0 ? Math.max(0, 1 - Math.abs(f - i) * 1.6) : 0);
        });
      }
    };

    const run = (on: boolean) => {
      if (!stage || !sky) return;
      if (on) {
        stage.start();
        sky.start();
        if (!raf) raf = requestAnimationFrame(tick);
      } else {
        stage.stop();
        sky.stop();
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const boot = async () => {
      try {
        const [{ LotusStage: Stage }, { Starfield: Sky }] = await Promise.all([
          import("./lotus/stage"),
          import("./lotus/starfield"),
        ]);
        if (disposed) return;
        sky = new Sky(skyCanvas);
        stage = new Stage(glCanvas);
        await stage.load("/models/lotus.glb");
        if (disposed) {
          stage.dispose();
          return;
        }
        const resize = () => {
          const w = stageEl.clientWidth;
          const h = stageEl.clientHeight;
          stage?.resize(w, h);
          sky?.resize(w, h);
        };
        resize();
        const ro = new ResizeObserver(resize);
        ro.observe(stageEl);
        cleanups.push(() => ro.disconnect());

        let first = true;
        stage.onFrame = () => {
          if (!first) return;
          first = false;
          root.dataset.ready = "1";
        };
        // Only animate while the journey is on screen.
        const io = new IntersectionObserver(([entry]) => {
          visible = entry.isIntersecting;
          run(visible);
        });
        io.observe(root);
        cleanups.push(() => io.disconnect());
        run(visible);
      } catch (err) {
        console.warn("[lotus] 3D stage unavailable, keeping the poster", err);
        if (!disposed) root.dataset.mode = "static";
      }
    };

    // Start after the page has loaded and the browser is idle: never competes with LCP.
    type IdleWindow = Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    const w = window as IdleWindow;
    const schedule = () => (w.requestIdleCallback ? w.requestIdleCallback(() => void boot(), { timeout: 2500 }) : window.setTimeout(() => void boot(), 300));
    if (document.readyState === "complete") schedule();
    else {
      window.addEventListener("load", schedule, { once: true });
      cleanups.push(() => window.removeEventListener("load", schedule));
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(veilCap);
      cleanups.forEach((c) => c());
      sky?.stop();
      stage?.dispose();
      delete root.dataset.mode;
      delete root.dataset.ready;
      delete root.dataset.veil;
    };
  }, []);

  return (
    <div ref={stageRef} className={styles.stage}>
      <div className={styles.poster} aria-hidden="true" />
      <canvas ref={skyRef} className={styles.canvas} aria-hidden="true" />
      <canvas ref={glRef} className={cx(styles.canvas, styles.gl)} aria-hidden="true" />
      <div ref={glowRef} className={styles.glow} aria-hidden="true" />
      <div ref={heartRef} className={styles.heart} aria-hidden="true">
        {photos.map((p) => (
          // eslint-disable-next-line @next/next/no-img-element -- positioned every frame; next/image adds nothing here
          <img key={p.key} src={p.src} alt="" loading="lazy" decoding="async" />
        ))}
      </div>
      <nav ref={railRef} className={styles.rail} aria-label={t("valuesNav")}>
        {VALUE_KEYS.map((k) => (
          <a key={k} href={`#petal-${k}`}>
            <span className={styles.railLabel}>{t(`values.${k}.name`)}</span>
            <span className={styles.railDot} aria-hidden="true" />
          </a>
        ))}
      </nav>
    </div>
  );
}
