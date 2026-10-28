"use client";

import { useEffect } from "react";

// Eased one-gesture-per-section snapping for the hero: the four acts of Act I, then each of
// the five petals. Releases to free scrolling once the page flow (thought, upcoming, ...) starts.
// Design: docs/design/wireframes/a2-snap.js. Off for reduced motion and when the 3D stage is not running.
const ACT_STOPS = [0, 0.4, 0.7, 0.93];
const DURATION = 760;
const EASE: [number, number, number, number] = [0.22, 0.61, 0.36, 1];
const COOLDOWN = 220; // swallow the inertia tail of a trackpad swipe after a glide

function bezier(x: number, [p1x, p1y, p2x, p2y]: [number, number, number, number]) {
  const cx = 3 * p1x;
  const bx = 3 * (p2x - p1x) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * p1y;
  const by = 3 * (p2y - p1y) - cy;
  const ay = 1 - cy - by;
  let t = x;
  for (let i = 0; i < 8; i++) {
    const fx = ((ax * t + bx) * t + cx) * t - x;
    const d = (3 * ax * t + 2 * bx) * t + cx;
    if (Math.abs(fx) < 1e-5 || !d) break;
    t -= fx / d;
  }
  return ((ay * t + by) * t + cy) * t;
}

const INTERACTIVE = "input, textarea, select, button, [contenteditable='true']";

export function HomeSnap() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const journey = document.getElementById("act1")?.parentElement;
    if (!journey || reduce.matches) return;

    let targets: number[] = [];
    let flowTop = Infinity;
    let anim = 0;
    let lockUntil = 0;

    const top = (el: Element) => el.getBoundingClientRect().top + window.scrollY;
    const measure = () => {
      const act1 = document.getElementById("act1");
      const flow = document.getElementById("home-flow");
      if (!act1 || !flow) return false;
      const span = Math.max(1, act1.offsetHeight - window.innerHeight);
      const a1 = top(act1);
      targets = ACT_STOPS.map((p) => Math.round(a1 + p * span));
      document.querySelectorAll("#act2 > section").forEach((el) => targets.push(Math.round(top(el))));
      flowTop = Math.round(top(flow));
      return targets.length > 1;
    };
    // Only while the WebGL stage drives the acts (static / no-JS poster scrolls freely).
    const active = () => journey.dataset.mode === "enhanced" && !reduce.matches;
    const inRegion = () => active() && window.scrollY < flowTop - 6;

    const glide = (target: number) => {
      const to = Math.max(0, Math.min(target, document.documentElement.scrollHeight - window.innerHeight));
      const from = window.scrollY;
      const d = to - from;
      if (Math.abs(d) < 2) return;
      const t0 = performance.now();
      lockUntil = t0 + DURATION + COOLDOWN;
      const step = (now: number) => {
        const k = Math.min(1, (now - t0) / DURATION);
        window.scrollTo(0, from + d * bezier(k, EASE));
        anim = k < 1 ? requestAnimationFrame(step) : 0;
      };
      anim = requestAnimationFrame(step);
    };

    const move = (dir: 1 | -1) => {
      if (anim || performance.now() < lockUntil) return;
      if (!measure()) return;
      const y = window.scrollY;
      let cur = 0;
      let best = Infinity;
      targets.forEach((t, i) => {
        const dist = Math.abs(t - y);
        if (dist < best) {
          best = dist;
          cur = i;
        }
      });
      let to: number | undefined;
      if (best > 8) {
        to = dir > 0 ? targets.find((t) => t > y + 8) : [...targets].reverse().find((t) => t < y - 8);
        if (to === undefined) to = dir > 0 ? flowTop : 0;
      } else {
        const n = cur + dir;
        to = n < 0 ? 0 : n >= targets.length ? flowTop : targets[n];
      }
      glide(to);
    };

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || !inRegion()) return;
      if (!anim && !measure()) return;
      // Scrolling up from below the region (flow) must stay native: only take over inside it.
      e.preventDefault();
      if (anim || Math.abs(e.deltaY) < 2) return;
      move(e.deltaY > 0 ? 1 : -1);
    };
    const onKey = (e: KeyboardEvent) => {
      if (!inRegion() || e.altKey || e.ctrlKey || e.metaKey) return;
      if ((e.target as Element | null)?.closest?.(INTERACTIVE)) return;
      const dir = ({ ArrowDown: 1, PageDown: 1, " ": 1, ArrowUp: -1, PageUp: -1 } as Record<string, 1 | -1>)[e.key];
      if (!dir) return;
      e.preventDefault();
      move(dir);
    };
    let ty = 0;
    const onTouchStart = (e: TouchEvent) => {
      ty = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (inRegion() && e.cancelable && e.touches.length === 1) e.preventDefault();
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (!inRegion()) return;
      const dy = ty - (e.changedTouches[0]?.clientY ?? ty);
      if (Math.abs(dy) > 28) move(dy > 0 ? 1 : -1);
    };
    // The user grabbed the scrollbar or jumped via a link: stop fighting them.
    const cancel = () => {
      if (anim) {
        cancelAnimationFrame(anim);
        anim = 0;
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("pointerdown", cancel);
    window.addEventListener("resize", measure);
    const t1 = window.setTimeout(measure, 400);
    const t2 = window.setTimeout(measure, 1500);
    return () => {
      cancelAnimationFrame(anim);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("pointerdown", cancel);
      window.removeEventListener("resize", measure);
    };
  }, []);

  return null;
}
