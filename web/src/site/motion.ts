// Motion helpers for the public site: reduced-motion detection, scroll-in
// reveals and scroll-linked progress. Everything here is a no-op (content
// shown in its final state) when the visitor prefers reduced motion.

import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from 'react';

const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

export const prefersReducedMotion = () => reducedQuery.matches;

export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (cb) => {
      reducedQuery.addEventListener('change', cb);
      return () => reducedQuery.removeEventListener('change', cb);
    },
    prefersReducedMotion,
  );
}

/** Whether the device can comfortably run the optional WebGL scenes. */
export function canRun3D(): boolean {
  if (prefersReducedMotion()) return false;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (nav.connection?.saveData) return false;
  if ((nav.deviceMemory ?? 8) < 4) return false;
  if ((navigator.hardwareConcurrency ?? 8) < 4) return false;
  return true;
}

// ---------- Reveal on scroll ----------

let revealer: IntersectionObserver | null = null;
const onReveal = new WeakMap<Element, () => void>();

function getRevealer() {
  revealer ??= new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        onReveal.get(e.target)?.();
        revealer!.unobserve(e.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
  );
  return revealer;
}

/**
 * Whether the element has scrolled into view yet (always true under reduced
 * motion). Put `is-in` in its className from this, next to `.s-reveal`, so a
 * re-render that changes the className can't drop it.
 */
export function useReveal<T extends HTMLElement>(): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [shown, setShown] = useState(prefersReducedMotion);
  useEffect(() => {
    const el = ref.current;
    if (!el || shown) return;
    const io = getRevealer();
    onReveal.set(el, () => setShown(true));
    io.observe(el);
    return () => {
      io.unobserve(el);
      onReveal.delete(el);
    };
  }, [shown]);
  return [ref, shown];
}

// ---------- Scroll progress ----------

type Tracker = (rect: DOMRect, viewport: number) => void;
const trackers = new Map<Element, Tracker>();
let queued = false;

function run() {
  queued = false;
  const vh = window.innerHeight;
  trackers.forEach((fn, el) => {
    const r = el.getBoundingClientRect();
    if (r.bottom < -200 || r.top > vh + 200) return;
    fn(r, vh);
  });
}

function schedule() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(run);
}

/**
 * Calls `fn` with the element's rect on every scroll frame while it is near the
 * viewport. Pass `enabled: false` (e.g. under reduced motion) to skip it.
 */
export function useScrollTracker<T extends HTMLElement>(ref: RefObject<T | null>, fn: Tracker, enabled = true) {
  const latest = useRef(fn);
  latest.current = fn;
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    if (!trackers.size) {
      window.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule);
    }
    trackers.set(el, (r, vh) => latest.current(r, vh));
    schedule();
    return () => {
      trackers.delete(el);
      if (!trackers.size) {
        window.removeEventListener('scroll', schedule);
        window.removeEventListener('resize', schedule);
      }
    };
  }, [ref, enabled]);
}

/** How far an element has travelled through the viewport: 0 entering at the bottom, 1 leaving at the top. */
export const travel = (r: DOMRect, vh: number) => Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));

/** Writes `travel` to a CSS variable on the element, for CSS-only parallax. */
export function useScrollVar<T extends HTMLElement>(name = '--travel') {
  const ref = useRef<T>(null);
  const reduced = useReducedMotion();
  useScrollTracker(ref, (r, vh) => ref.current?.style.setProperty(name, travel(r, vh).toFixed(3)), !reduced);
  return ref;
}
