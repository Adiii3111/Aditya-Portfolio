"use client";

import { useEffect, useState, type ReactNode, type RefObject } from "react";

/** Small deterministic PRNG (mulberry32) so first paint is identical on server and client. */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rng = () => number;

/** Exponentially distributed sample with the given mean. */
export const expo = (rng: Rng, mean: number) => -mean * Math.log(1 - rng());

/** Poisson sample (Knuth) — fine for the small means used here. */
export function poisson(rng: Rng, mean: number) {
  const limit = Math.exp(-mean);
  let k = 0;
  let p = 1;
  do { k++; p *= rng(); } while (p > limit);
  return k - 1;
}

/** True while the element is on screen; animations pause when it is not. */
export function useInView(ref: RefObject<Element | null>) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return visible;
}

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

export function Range({ label, value, min, max, step = 1, display, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; display?: string; onChange: (v: number) => void;
}) {
  return (
    <label className="lab-range">
      <span>{label}<output>{display ?? value}</output></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

export function Kpi({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "good" | "bad" }) {
  return (
    <div className={`lab-kpi ${tone ? `lab-kpi-${tone}` : ""}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
      {sub && <p>{sub}</p>}
    </div>
  );
}

export function Why({ children }: { children: ReactNode }) {
  return <p className="lab-why"><span>Why this matters to me</span>{children}</p>;
}

export function TryThis({ items }: { items: string[] }) {
  return (
    <div className="lab-try">
      <span>Try this</span>
      <ul>{items.map((t) => <li key={t}>{t}</li>)}</ul>
    </div>
  );
}
