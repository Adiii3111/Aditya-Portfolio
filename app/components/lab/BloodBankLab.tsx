"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Kpi, Range, TryThis, Why, poisson, seeded, useInView, useReducedMotion } from "./shared";

/*
 * Toy daily simulation of a regional blood centre supplying three hospitals.
 * Deliberately simple and synthetic: it is NOT the model, data, or results of the WSC 2026 paper.
 */

const DAYS = 60;
const HOSPITALS = [
  { name: "Hospital A", size: "Large", mean: 14 },
  { name: "Hospital B", size: "Medium", mean: 8 },
  { name: "Hospital C", size: "Small", mean: 4 },
];

type HospitalResult = { demand: number; met: number; short: number; expired: number; received: number };
type DayRow = { inv: number; short: number; expired: number; moved: number };

function simulate(seed: number, shelfLife: number, levels: number[], supplyPct: number, transship: boolean) {
  const rng = seeded(seed);
  const L = shelfLife;
  // inventory[h][age] = units of that age (days)
  const inv = levels.map((S) => {
    const ages = Array<number>(L).fill(0);
    const spread = Math.min(L, 4);
    for (let i = 0; i < S; i++) ages[i % spread]++;
    return ages;
  });
  const res: HospitalResult[] = HOSPITALS.map(() => ({ demand: 0, met: 0, short: 0, expired: 0, received: 0 }));
  const days: DayRow[] = [];
  const total = (h: number) => inv[h].reduce((a, b) => a + b, 0);
  const takeOldest = (h: number, n: number) => {
    let got = 0;
    for (let a = L - 1; a >= 0 && got < n; a--) { const t = Math.min(inv[h][a], n - got); inv[h][a] -= t; got += t; }
    return got;
  };
  const meanSum = HOSPITALS.reduce((a, h) => a + h.mean, 0);

  for (let day = 0; day < DAYS; day++) {
    // 1. Morning: the centre ships fresh units toward each hospital's order-up-to level, limited by donations.
    const supply = Math.round(meanSum * (supplyPct / 100) * (0.8 + rng() * 0.4));
    const need = levels.map((S, h) => Math.max(0, S - total(h)));
    const needSum = need.reduce((a, b) => a + b, 0);
    const give = need.map((n) => (needSum <= supply ? n : Math.floor((n / needSum) * supply)));
    give.forEach((g, h) => { inv[h][0] += g; res[h].received += g; });

    // 2. Daytime demand, served oldest-first.
    let dayShort = 0, moved = 0;
    const short = HOSPITALS.map((hosp, h) => {
      const dmd = poisson(rng, hosp.mean);
      res[h].demand += dmd;
      const got = takeOldest(h, dmd);
      res[h].met += got;
      return dmd - got;
    });

    // 3. Optional lateral transshipment: a short hospital borrows from the one with the most stock,
    //    as long as the lender keeps a buffer of half its own mean daily demand.
    if (transship) {
      short.forEach((s, h) => {
        let remaining = s;
        while (remaining > 0) {
          let lender = -1, spare = 0;
          HOSPITALS.forEach((other, o) => {
            if (o === h) return;
            const sp = total(o) - Math.ceil(other.mean / 2);
            if (sp > spare) { spare = sp; lender = o; }
          });
          if (lender < 0) break;
          const got = takeOldest(lender, Math.min(remaining, spare));
          res[h].met += got;
          remaining -= got;
          moved += got;
        }
        short[h] = remaining;
      });
    }
    short.forEach((s, h) => { res[h].short += s; dayShort += s; });

    // 4. Night: everything ages one day; units reaching their shelf life expire.
    let dayExpired = 0;
    inv.forEach((ages, h) => {
      const exp = ages[L - 1];
      res[h].expired += exp;
      dayExpired += exp;
      for (let a = L - 1; a > 0; a--) ages[a] = ages[a - 1];
      ages[0] = 0;
    });

    days.push({ inv: inv.reduce((a, _, h) => a + total(h), 0), short: dayShort, expired: dayExpired, moved });
  }

  const sum = (k: keyof HospitalResult) => res.reduce((a, r) => a + r[k], 0);
  return {
    res,
    days,
    service: sum("demand") ? sum("met") / sum("demand") : 1,
    waste: sum("received") ? sum("expired") / sum("received") : 0,
    shortages: sum("short"),
    expired: sum("expired"),
    moved: days.reduce((a, d) => a + d.moved, 0),
  };
}

const W = 600, H = 200;

export default function BloodBankLab() {
  const [shelfLife, setShelfLife] = useState(7);
  const [levels, setLevels] = useState([30, 18, 10]);
  const [supplyPct, setSupplyPct] = useState(105);
  const [transship, setTransship] = useState(false);
  const [seed, setSeed] = useState(21);
  const [shown, setShown] = useState(DAYS);
  const [replayKey, setReplayKey] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const visible = useInView(rootRef);
  const reduced = useReducedMotion();

  const r = useMemo(() => simulate(seed, shelfLife, levels, supplyPct, transship), [seed, shelfLife, levels, supplyPct, transship]);

  // Replay draws the 60 days one by one.
  useEffect(() => {
    if (!replayKey || !visible || reduced) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const n = Math.min(DAYS, Math.ceil(((now - start) / 2600) * DAYS));
      setShown(n);
      if (n < DAYS) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [replayKey, visible, reduced]);

  const update = (fn: () => void) => { fn(); setShown(DAYS); };
  const challengeMet = r.service >= 0.98 && r.waste <= 0.05;

  const maxInv = Math.max(1, ...r.days.map((d) => d.inv)) * 1.1;
  const maxBar = Math.max(4, ...r.days.map((d) => Math.max(d.short, d.expired)));
  const bx = (i: number) => 36 + (i / DAYS) * (W - 46);
  const bw = ((W - 46) / DAYS) * 0.38;
  const days = r.days.slice(0, shown);
  const invLine = days.map((d, i) => `${i ? "L" : "M"}${(bx(i) + bw).toFixed(1)} ${(96 - (d.inv / maxInv) * 80).toFixed(1)}`).join("");

  return (
    <div className="lab-experiment" ref={rootRef}>
      <div className="lab-controls">
        <p className="lab-banner" role="note">Toy model for exploration — not the model, data, or results from the WSC 2026 paper.</p>
        <Range label="Shelf life of a unit" value={shelfLife} min={3} max={21} display={`${shelfLife} days`} onChange={(v) => update(() => setShelfLife(v))} />
        {HOSPITALS.map((h, i) => (
          <Range key={h.name} label={`${h.name} order-up-to level`} value={levels[i]} min={2} max={60} display={`${levels[i]} units · ~${h.mean}/day demand`} onChange={(v) => update(() => setLevels(levels.map((x, j) => (j === i ? v : x))))} />
        ))}
        <Range label="Donor supply vs. average demand" value={supplyPct} min={80} max={140} step={5} display={`${supplyPct}%`} onChange={(v) => update(() => setSupplyPct(v))} />
        <label className="lab-toggle">
          <input type="checkbox" checked={transship} onChange={(e) => update(() => setTransship(e.target.checked))} />
          <span aria-hidden="true" />
          Inter-hospital transshipment
        </label>
        <div className="lab-buttons">
          <button className="lab-btn lab-btn-gold" onClick={() => { setShown(0); setReplayKey((k) => k + 1); }} disabled={reduced}>Replay 60 days</button>
          <button className="lab-btn" onClick={() => update(() => setSeed((s) => s + 1))}>New demand scenario</button>
        </div>
        <TryThis items={["The challenge: reach 98% service with under 5% of units expiring.", "Shorten the shelf life to 5 days (platelet-like) and see how hard that gets — then switch on transshipment."]} />
      </div>

      <div className="lab-stage">
        <div className={`lab-challenge ${challengeMet ? "is-met" : ""}`} aria-live="polite">
          {challengeMet ? "Challenge met — 98%+ service with ≤ 5% waste." : `Challenge: 98% service with ≤ 5% waste. You’re at ${(r.service * 100).toFixed(1)}% service, ${(r.waste * 100).toFixed(1)}% waste.`}
        </div>
        <dl className="lab-kpis lab-kpis-4">
          <Kpi label="Service level" value={`${(r.service * 100).toFixed(1)}%`} tone={r.service >= 0.98 ? "good" : r.service < 0.9 ? "bad" : undefined} />
          <Kpi label="Units short" value={r.shortages} tone={r.shortages ? "bad" : "good"} />
          <Kpi label="Units expired" value={r.expired} sub={`${(r.waste * 100).toFixed(1)}% of deliveries`} tone={r.waste <= 0.05 ? "good" : "bad"} />
          <Kpi label="Units transshipped" value={transship ? r.moved : "off"} />
        </dl>

        <svg className="lab-svg lab-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Sixty-day chart: total inventory, daily shortages and expired units. Service ${(r.service * 100).toFixed(1)} percent.`}>
          <text className="lab-axis" x="4" y="20">stock</text>
          <path className="lab-chart-base" d={`M36 96 H${W - 10}`} />
          {invLine && <path className="lab-chart-line" d={invLine} />}
          <path className="lab-chart-base" d={`M36 182 H${W - 10}`} />
          {days.map((d, i) => (
            <g key={i}>
              {d.short > 0 && <rect className="lab-bar-short" x={bx(i)} y={182 - (d.short / maxBar) * 66} width={bw} height={(d.short / maxBar) * 66} />}
              {d.expired > 0 && <rect className="lab-bar-expired" x={bx(i) + bw} y={182 - (d.expired / maxBar) * 66} width={bw} height={(d.expired / maxBar) * 66} />}
            </g>
          ))}
          <text className="lab-axis" x="4" y="120">units</text>
          <text className="lab-axis" x="36" y="198">day 1</text>
          <text className="lab-axis" x={W - 10} y="198" textAnchor="end">day 60</text>
        </svg>
        <ul className="lab-legend">
          <li><i className="lab-lg-line" />Total stock across hospitals</li>
          <li><i className="lab-lg-short" />Shortages</li>
          <li><i className="lab-lg-expired" />Expired</li>
        </ul>

        <div className="lab-table-wrap">
          <table className="lab-table">
            <thead><tr><th scope="col">Hospital</th><th scope="col">Demand</th><th scope="col">Service</th><th scope="col">Short</th><th scope="col">Expired</th></tr></thead>
            <tbody>
              {r.res.map((h, i) => (
                <tr key={HOSPITALS[i].name}>
                  <th scope="row">{HOSPITALS[i].name}<small>{HOSPITALS[i].size}</small></th>
                  <td>{h.demand}</td>
                  <td>{h.demand ? ((h.met / h.demand) * 100).toFixed(1) : "100.0"}%</td>
                  <td>{h.short}</td>
                  <td>{h.expired}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Why>My WSC 2026 paper with Professor Tugce Martagan studies a multi-echelon perishable blood supply chain with inter-hospital transshipment. This toy lets you feel the tension between running out and throwing away.</Why>
    </div>
  );
}
