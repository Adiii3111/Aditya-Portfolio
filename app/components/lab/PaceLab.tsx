"use client";

import { useState } from "react";
import { Range, TryThis, Why } from "./shared";

const RACES = [
  { key: "5k", label: "5K", km: 5 },
  { key: "10k", label: "10K", km: 10 },
  { key: "21k", label: "21K", km: 21.0975, note: "half marathon" },
] as const;
type RaceKey = (typeof RACES)[number]["key"];

const MILE = 1.609344;

/** Riegel's endurance model: T2 = T1 × (D2 / D1)^1.06 */
const riegel = (t1: number, d1: number, d2: number) => t1 * Math.pow(d2 / d1, 1.06);

function fmt(sec: number, withHours = false) {
  const s = Math.round(sec);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const mm = String(m).padStart(h || withHours ? 2 : 1, "0"), ss = String(r).padStart(2, "0");
  return h || withHours ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Per-km splits for a total time; `bias` > 0 = negative split (start slower, finish faster). */
function splits(totalSec: number, km: number, bias: number) {
  const n = Math.ceil(km - 1e-9);
  const segs = Array.from({ length: n }, (_, i) => Math.min(1, km - i));
  let pos = 0;
  const raw = segs.map((len) => {
    const mid = (pos + len / 2) / km;
    pos += len;
    return len * (1 + bias * (1 - 2 * mid));
  });
  const scale = totalSec / raw.reduce((a, b) => a + b, 0);
  return segs.map((len, i) => ({ len, sec: raw[i] * scale, pace: (raw[i] * scale) / len }));
}

export default function PaceLab() {
  const [base, setBase] = useState<RaceKey>("5k");
  const [h, setH] = useState(0);
  const [m, setM] = useState(28);
  const [s, setS] = useState(0);
  const [target, setTarget] = useState<RaceKey>("10k");
  const [bias, setBias] = useState(2);

  const baseRace = RACES.find((r) => r.key === base)!;
  const targetRace = RACES.find((r) => r.key === target)!;
  const t1 = h * 3600 + m * 60 + s;
  const valid = t1 >= 60 * baseRace.km * 2 && t1 <= 60 * 60 * baseRace.km * 0.5; // between 2:00/km and 30:00/km

  const predicted = RACES.map((r) => {
    const t = riegel(t1, baseRace.km, r.km);
    return { ...r, t, perKm: t / r.km, perMile: t / (r.km / MILE) };
  });
  const tTarget = predicted.find((p) => p.key === target)!.t;
  const parts = valid ? splits(tTarget, targetRace.km, bias / 100) : [];
  const paces = parts.map((p) => p.pace);
  const fastest = Math.min(...paces), slowest = Math.max(...paces);
  const cumulative = parts.reduce<number[]>((acc, p) => [...acc, (acc[acc.length - 1] ?? 0) + p.sec], []);

  const clamp = (v: number, max: number) => Math.max(0, Math.min(max, Math.floor(v || 0)));

  return (
    <div className="lab-experiment">
      <div className="lab-controls">
        <p className="lab-hint">Enter a recent race result and see what it suggests for the Sprint Sync distances.</p>
        <div className="lab-seg" role="group" aria-label="Recent race distance">
          {RACES.map((r) => <button key={r.key} aria-pressed={base === r.key} onClick={() => setBase(r.key)}>{r.label}</button>)}
        </div>
        <fieldset className="lab-time">
          <legend>Your {baseRace.label} time</legend>
          <label><input type="number" inputMode="numeric" min={0} max={5} value={h} onChange={(e) => setH(clamp(+e.target.value, 5))} aria-label="Hours" /><span>h</span></label>
          <label><input type="number" inputMode="numeric" min={0} max={59} value={m} onChange={(e) => setM(clamp(+e.target.value, 59))} aria-label="Minutes" /><span>min</span></label>
          <label><input type="number" inputMode="numeric" min={0} max={59} value={s} onChange={(e) => setS(clamp(+e.target.value, 59))} aria-label="Seconds" /><span>s</span></label>
        </fieldset>
        {!valid && <p className="lab-warn" role="alert">That works out faster than 2:00/km or slower than 30:00/km — check the time.</p>}
        <Range label="Pacing strategy" value={bias} min={-6} max={6} display={bias === 0 ? "Even pace" : bias > 0 ? `Negative split · ${bias}%` : `Positive split · ${-bias}%`} onChange={setBias} />
        <TryThis items={["Try a negative split: start a little easier, finish strong.", "Compare what a 5K time predicts for the half — Riegel assumes you train for the distance."]} />
      </div>

      <div className="lab-stage">
        <div className="lab-races">
          {predicted.map((p) => (
            <button key={p.key} className={`lab-race ${p.key === target ? "is-on" : ""}`} aria-pressed={p.key === target} onClick={() => setTarget(p.key)}>
              <span>{p.label}{"note" in p ? ` · ${p.note}` : ""}{p.key === base ? " · your race" : ""}</span>
              <strong>{valid ? fmt(p.t, p.km > 15) : "—"}</strong>
              <em>{valid ? `${fmt(p.perKm)} /km · ${fmt(p.perMile)} /mi` : ""}</em>
            </button>
          ))}
        </div>

        <div className="lab-splits" role="img" aria-label={`Per-kilometre splits for ${targetRace.label}${valid ? `, finishing in ${fmt(tTarget, true)}` : ""}.`}>
          {parts.map((p, i) => {
            const k = slowest - fastest > 0.5 ? (slowest - p.pace) / (slowest - fastest) : 0.5;
            return <span key={i} style={{ flexGrow: p.len, opacity: 0.45 + k * 0.55 }} title={`km ${i + 1}: ${fmt(p.pace)}/km`} />;
          })}
        </div>
        <p className="lab-caption">Brighter segments are faster kilometres.</p>

        {valid && (
          <ol className="lab-split-list">
            {parts.map((p, i) => (
              <li key={i}>
                <span>{i === parts.length - 1 && p.len < 1 ? `${targetRace.km.toFixed(1)} km` : `km ${i + 1}`}</span>
                <strong>{fmt(p.pace)}</strong>
                <em>{fmt(cumulative[i], targetRace.km > 15)}</em>
              </li>
            ))}
          </ol>
        )}
      </div>

      <Why>I founded AgileFlowSprinter. Our Sprint Sync Marathon on 21 January 2024 at Ullal Lake, Bengaluru, offered 5K, 10K, and 21K — so these are the distances that matter here.</Why>
    </div>
  );
}
