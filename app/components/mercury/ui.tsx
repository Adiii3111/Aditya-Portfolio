"use client";

import { useId } from "react";

export function Slider({ label, value, min, max, step = 1, unit = "", format, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string;
  format?: (v: number) => string; onChange: (v: number) => void;
}) {
  const id = useId();
  return (
    <div className="mc-field">
      <label htmlFor={id}><span>{label}</span><output htmlFor={id}>{format ? format(value) : value}{unit && ` ${unit}`}</output></label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

export function Select<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: { id: T; label: string }[]; onChange: (v: T) => void;
}) {
  const id = useId();
  return (
    <div className="mc-field">
      <label htmlFor={id}><span>{label}</span></label>
      <select id={id} className="mc-select" value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    </div>
  );
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="mc-toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span aria-hidden="true" />
      {label}
    </label>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "good" | "warn" | "bad" }) {
  return (
    <div className={`mc-stat ${tone ? `mc-${tone}` : ""}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
      {sub && <dd className="mc-stat-sub">{sub}</dd>}
    </div>
  );
}

export function Chip({ children, tone }: { children: React.ReactNode; tone: "good" | "warn" | "bad" | "info" | "muted" }) {
  return <span className={`mc-chip mc-chip-${tone}`}>{children}</span>;
}

export function Panel({ intro, controls, children }: { intro: React.ReactNode; controls?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className={`mc-panel ${controls ? "" : "mc-panel-wide"}`}>
      {controls && (
        <div className="mc-controls">
          <p className="mc-intro">{intro}</p>
          {controls}
        </div>
      )}
      <div className="mc-visual">
        {!controls && <p className="mc-intro">{intro}</p>}
        {children}
      </div>
    </div>
  );
}

/** Linear scale helper for hand-written SVG charts. */
export const scale = (d0: number, d1: number, r0: number, r1: number) => (v: number) =>
  d1 === d0 ? r0 : r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);

export function niceTicks(max: number, count = 4) {
  if (max <= 0) return [0];
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const stepSize = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  return Array.from({ length: Math.floor(max / stepSize) + 1 }, (_, i) => +(i * stepSize).toFixed(6));
}

export const pct = (v: number, digits = 1) => `${(v * 100).toFixed(digits)}%`;
export const fmt = (v: number) => Math.round(v).toLocaleString("en-US");
