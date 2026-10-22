// Customer-side analytics for the illustrative MERCURY demo: model bake-off,
// account segmentation, churn-risk scoring, order/shipping monitoring,
// shipment consolidation, and waste analysis. Every input is randomly
// generated from a seed; methods are generic textbook ones; all names are
// fictional. Nothing here mirrors the original system, its data, or its logic.

import type { Action } from "./models";
import { normal, rng, type Rng } from "./synthetic";

const between = (r: Rng, lo: number, hi: number) => lo + r() * (hi - lo);
const int = (r: Rng, lo: number, hi: number) => Math.floor(between(r, lo, hi + 1));
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const sd = (xs: number[]) => { const m = mean(xs); return Math.sqrt(mean(xs.map((x) => (x - m) ** 2))); };
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export const MONTHS = 60; // five years of monthly history
export const TODAY = MONTHS * 30; // "today" on a simple 30-day-month day axis

/* ───────────────────────── accounts ───────────────────────── */

type Archetype = "steady" | "growing" | "shrinking" | "volatile" | "intermittent";
const ARCHETYPES: Archetype[] = ["steady", "growing", "shrinking", "volatile", "intermittent"];

export type Order = { day: number; units: number };
export type ShipEvent = { orderDay: number; shipDay: number | null };
export type Account = { id: string; region: number; monthly: number[]; orders: Order[]; ships: ShipEvent[] };

export const REGION_NAMES = ["North", "North-East", "East", "South-East", "South", "South-West", "West", "Central"] as const;

export function accounts(seed: number, n = 24): Account[] {
  const r = rng(seed * 7919 + 101);
  return Array.from({ length: n }, (_, i) => {
    const kind = ARCHETYPES[(i + int(r, 0, 4)) % ARCHETYPES.length];
    const level = between(r, 30, 220);
    const season = between(r, 0.05, 0.25);
    const phase = between(r, 0, Math.PI * 2);
    const noise = kind === "volatile" ? between(r, 0.55, 0.9) : between(r, 0.08, 0.22);
    const slope = kind === "growing" ? between(r, 0.012, 0.03) : kind === "shrinking" ? -between(r, 0.008, 0.016) : between(r, -0.003, 0.004);
    const quietFrom = kind === "shrinking" && r() < 0.6 ? MONTHS - int(r, 3, 7) : MONTHS; // some stop ordering
    const monthly = Array.from({ length: MONTHS }, (_, t) => {
      if (t >= quietFrom) return 0;
      if (kind === "intermittent" && r() < 0.5) return 0;
      const v = level * Math.max(0.05, 1 + slope * t) * (1 + season * Math.sin((2 * Math.PI * t) / 12 + phase)) * (1 + noise * normal(r));
      return Math.max(0, Math.round(v));
    });
    const orders: Order[] = monthly.flatMap((u, t) => (u > 0 ? [{ day: t * 30 + int(r, 0, 29), units: u }] : []));
    const ships: ShipEvent[] = orders.filter((o) => o.day > TODAY - 120).map((o) => {
      const lag = r() < 0.18 ? int(r, 11, 22) : int(r, 2, 8);
      const shipDay = o.day + lag;
      return { orderDay: o.day, shipDay: shipDay <= TODAY ? shipDay : null };
    });
    return { id: `Account ${String(i + 1).padStart(2, "0")}`, region: int(r, 0, REGION_NAMES.length - 1), monthly, orders, ships };
  });
}

/* ───────────────────────── 1 · model bake-off (7 textbook models) ───────────────────────── */

export type ModelId = "naive" | "snaive" | "wma" | "ses" | "holt" | "hw" | "ar";
export const MODELS: { id: ModelId; label: string }[] = [
  { id: "naive", label: "Naive (last value)" },
  { id: "snaive", label: "Seasonal naive" },
  { id: "wma", label: "Weighted moving average" },
  { id: "ses", label: "Simple exponential smoothing" },
  { id: "holt", label: "Holt, damped trend" },
  { id: "hw", label: "Holt-Winters, damped" },
  { id: "ar", label: "ARIMA-style (AR on differences)" },
];

function fit(y: number[], model: ModelId, h: number): number[] {
  const n = y.length;
  const flat = (v: number) => Array(h).fill(Math.max(0, v));
  switch (model) {
    case "naive": return flat(y[n - 1]);
    case "snaive": return Array.from({ length: h }, (_, k) => y[n - 12 + (k % 12)]);
    case "wma": { const w = [1, 2, 3], last = y.slice(-3); return flat(last.reduce((a, v, i) => a + v * w[i], 0) / 6); }
    case "ses": { let l = y[0]; for (const v of y) l = 0.3 * v + 0.7 * l; return flat(l); }
    case "holt": {
      const a = 0.3, b = 0.1, phi = 0.9; let l = y[0], t = y[1] - y[0];
      for (let i = 1; i < n; i++) { const lp = l; l = a * y[i] + (1 - a) * (lp + phi * t); t = b * (l - lp) + (1 - b) * phi * t; }
      let damp = 0;
      return Array.from({ length: h }, (_, k) => { damp += phi ** (k + 1); return Math.max(0, l + damp * t); });
    }
    case "hw": {
      const a = 0.3, b = 0.05, g = 0.2, phi = 0.9, m = 12;
      let l = mean(y.slice(0, m)), t = 0;
      const s = y.slice(0, m).map((v) => v - l);
      for (let i = m; i < n; i++) {
        const lp = l, si = s[i % m];
        l = a * (y[i] - si) + (1 - a) * (lp + phi * t);
        t = b * (l - lp) + (1 - b) * phi * t;
        s[i % m] = g * (y[i] - l) + (1 - g) * si;
      }
      let damp = 0;
      return Array.from({ length: h }, (_, k) => { damp += phi ** (k + 1); return Math.max(0, l + damp * t + s[(n + k) % m]); });
    }
    case "ar": {
      // AR(1) on first differences, fitted by least squares; forecasts are re-integrated.
      const d = y.slice(1).map((v, i) => v - y[i]);
      const xs = d.slice(0, -1), ys = d.slice(1), mx = mean(xs), my = mean(ys);
      const cov = xs.reduce((acc, x, i) => acc + (x - mx) * (ys[i] - my), 0), vx = xs.reduce((acc, x) => acc + (x - mx) ** 2, 0);
      const phi = vx ? Math.max(-0.95, Math.min(0.95, cov / vx)) : 0, c = my - phi * mx;
      let last = y[n - 1], dl = d[d.length - 1];
      return Array.from({ length: h }, () => { dl = c + phi * dl; last = Math.max(0, last + dl); return last; });
    }
  }
}

export type Split = { train: number; test: number };
export const SPLITS: Split[] = [{ train: 18, test: 9 }, { train: 21, test: 6 }, { train: 24, test: 3 }];

export function bakeoff(accts: Account[], split: Split, count = 8) {
  // Use accounts with enough non-zero months for MAPE to mean something.
  const pool = accts.filter((a) => a.monthly.slice(-27).filter((v) => v > 0).length >= 22).slice(0, count);
  const rows = pool.map((a) => {
    const y = a.monthly.slice(-(split.train + split.test));
    const train = y.slice(0, split.train), test = y.slice(split.train);
    const scores = MODELS.map((m) => {
      const f = fit(train, m.id, split.test);
      const err = test.map((v, i) => Math.abs(v - f[i]));
      const ape = test.flatMap((v, i) => (v > 0 ? [err[i] / v] : []));
      return { model: m.id, forecast: f, mae: mean(err), mape: mean(ape) };
    });
    const best = scores.reduce((p, s) => (s.mape < p.mape ? s : p));
    return { account: a, train, test, scores, best: best.model, bestMape: best.mape };
  });
  const wins = MODELS.map((m) => ({ model: m.id, wins: rows.filter((r) => r.best === m.id).length }));
  const distinctWinners = wins.filter((w) => w.wins > 0).length;
  const unreliable = rows.filter((r) => r.bestMape > 0.2).length;
  return { rows, wins, distinctWinners, unreliable };
}

/* ───────────────────────── 2 · segmentation ───────────────────────── */

export type Segment = "Stable" | "Rising" | "Declining" | "Inconsistent" | "Sporadic";
export const SEGMENTS: Segment[] = ["Stable", "Rising", "Declining", "Inconsistent", "Sporadic"];
export type SegThresholds = { cv: number; trend: number; zeros: number };
export const SEG_DEFAULT: SegThresholds = { cv: 55, trend: 12, zeros: 30 };

export function segment(accts: Account[], th: SegThresholds) {
  return accts.map((a) => {
    const y = a.monthly, m = mean(y);
    const cv = m ? (sd(y) / m) * 100 : 0;
    const xs = y.map((_, i) => i), mx = mean(xs);
    const slope = y.reduce((acc, v, i) => acc + (i - mx) * (v - m), 0) / xs.reduce((acc, x) => acc + (x - mx) ** 2, 0);
    const trend = m ? ((slope * 12) / m) * 100 : 0; // % of mean per year
    const zeros = (y.filter((v) => v === 0).length / y.length) * 100;
    const seg: Segment = zeros >= th.zeros ? "Sporadic" : cv >= th.cv ? "Inconsistent" : trend >= th.trend ? "Rising" : trend <= -th.trend ? "Declining" : "Stable";
    return { account: a, cv, trend, zeros, mean: m, segment: seg };
  });
}

/* ───────────────────────── 3 · churn-risk score ───────────────────────── */

export type ChurnWeights = { recency: number; frequency: number; size: number; gap: number };
export const CHURN_DEFAULT: ChurnWeights = { recency: 3, frequency: 2, size: 1, gap: 2 };
export const FACTOR_LABELS: Record<keyof ChurnWeights, string> = { recency: "Recency", frequency: "Order frequency trend", size: "Order size trend", gap: "Gap vs usual interval" };

export function churn(accts: Account[], w: ChurnWeights) {
  const total = w.recency + w.frequency + w.size + w.gap || 1;
  return accts.map((a) => {
    const o = a.orders;
    const last = o.length ? o[o.length - 1].day : 0;
    const intervals = o.slice(1).map((x, i) => x.day - o[i].day);
    const usual = intervals.length ? [...intervals].sort((p, q) => p - q)[Math.floor(intervals.length / 2)] : 60;
    const recent = o.filter((x) => x.day > TODAY - 360), prior = o.filter((x) => x.day <= TODAY - 360 && x.day > TODAY - 720);
    const f = {
      recency: clamp01((TODAY - last) / 180),
      frequency: prior.length ? clamp01(1 - recent.length / prior.length) : 0,
      size: prior.length && recent.length ? clamp01(1 - mean(recent.map((x) => x.units)) / mean(prior.map((x) => x.units))) : recent.length ? 0 : 1,
      gap: clamp01(((TODAY - last) / Math.max(15, usual) - 1) / 3),
    };
    const score = ((w.recency * f.recency + w.frequency * f.frequency + w.size * f.size + w.gap * f.gap) / total) * 100;
    const top = (Object.keys(f) as (keyof ChurnWeights)[]).sort((p, q) => w[q] * f[q] - w[p] * f[p])[0];
    return { account: a, factors: f, score, tier: score >= 55 ? "High" : score >= 30 ? "Medium" : "Low", top, daysSince: TODAY - last, usual };
  }).sort((p, q) => q.score - p.score);
}

/* ───────────────────────── 4 · monitoring: fill dates, demand shifts, shipping gaps ───────────────────────── */

export type MonitorSettings = { tolerance: number; shift: number; lag: number };
export const MONITOR_DEFAULT: MonitorSettings = { tolerance: 10, shift: 40, lag: 10 };

export function monitor(accts: Account[], s: MonitorSettings) {
  const fill = accts.filter((a) => a.orders.length >= 4).map((a) => {
    const o = a.orders, last = o[o.length - 1].day;
    const recentOrders = o.slice(-8);
    const iv = recentOrders.slice(1).map((x, i) => x.day - recentOrders[i].day);
    const usual = Math.max(10, Math.round(mean(iv.filter((v) => v > 0)) || 30));
    const due = last + usual, late = TODAY - due;
    return { account: a, last, usual, due, late, status: late > s.tolerance ? "Overdue" : late > 0 ? "Due now" : "On cadence" };
  }).sort((p, q) => q.late - p.late);

  const shifts = accts.map((a) => {
    const recent = mean(a.monthly.slice(-6)), base = mean(a.monthly.slice(-18, -6));
    const change = base ? (recent - base) / base : 0;
    return { account: a, recent, base, change, flagged: Math.abs(change) * 100 >= s.shift && base > 0 };
  }).sort((p, q) => Math.abs(q.change) - Math.abs(p.change));

  const gaps = accts.flatMap((a) => a.ships.map((e) => {
    const lag = (e.shipDay ?? TODAY) - e.orderDay;
    return { account: a, ...e, lag, status: e.shipDay === null ? (lag > s.lag ? "Not shipped" : "Open") : lag > s.lag ? "Late" : "On time" };
  }));
  return { fill, shifts, gaps };
}

/* ───────────────────────── 5 · shipment consolidation ───────────────────────── */

export type Location = { id: string; region: number; x: number; y: number };
export type Delivery = { id: number; loc: number; day: number; units: number };

export function network(seed: number) {
  const r = rng(seed * 31337 + 7);
  const locations: Location[] = [];
  REGION_NAMES.forEach((_, g) => {
    const n = int(r, 3, 6);
    for (let k = 0; k < n; k++) locations.push({ id: `${REGION_NAMES[g].split("-").map((w) => w[0]).join("")}-${k + 1}`, region: g, x: between(r, 0.12, 0.88), y: between(r, 0.15, 0.85) });
  });
  const deliveries: Delivery[] = [];
  let id = 0;
  locations.forEach((l, li) => {
    const rate = between(r, 0.03, 0.11); // deliveries per day
    for (let d = 0; d < 90; d++) if (r() < rate) deliveries.push({ id: id++, loc: li, day: d, units: Math.round(between(r, 10, 90)) });
  });
  return { locations, deliveries };
}

export function consolidate(net: ReturnType<typeof network>, windowDays: number, capacity: number) {
  const byLoc = net.locations.map((_, li) => net.deliveries.filter((d) => d.loc === li).sort((a, b) => a.day - b.day));
  const groups = byLoc.map((list) => {
    const out: { start: number; end: number; units: number; count: number }[] = [];
    for (const d of list) {
      const g = out[out.length - 1];
      if (g && d.day - g.start <= windowDays && g.units + d.units <= capacity) { g.end = d.day; g.units += d.units; g.count++; }
      else out.push({ start: d.day, end: d.day, units: d.units, count: 1 });
    }
    return out;
  });
  const before = net.deliveries.length, after = groups.reduce((a, g) => a + g.length, 0);
  const redundant = byLoc.reduce((acc, list) => acc + list.filter((d, i) => i > 0 && d.day - list[i - 1].day <= 3).length, 0);
  return { groups, before, after, reduction: before ? (before - after) / before : 0, redundant, perRegion: REGION_NAMES.map((_, g) => ({
    before: net.deliveries.filter((d) => net.locations[d.loc].region === g).length,
    after: groups.filter((_, li) => net.locations[li].region === g).reduce((a, gr) => a + gr.length, 0),
  })) };
}

/* ───────────────────────── waste analysis (lots tab) ───────────────────────── */

export const WASTE_REASONS = ["Expired on shelf", "Quality hold", "Damaged in transit", "Planning overrun"] as const;

export function waste(seed: number, expiredUnits: number) {
  const r = rng(seed * 6007 + 3);
  const byReason = [expiredUnits, Math.round(between(r, 40, 180)), Math.round(between(r, 20, 90)), Math.round(between(r, 30, 140))];
  const trend = Array.from({ length: 12 }, (_, w) => {
    const expired = Math.max(0, Math.round(between(r, 10, 60) * (1 + 0.4 * Math.sin(w / 2))));
    const other = Math.round(between(r, 8, 40));
    return { week: w - 11, expired, other };
  });
  return { byReason, trend, total: byReason.reduce((a, b) => a + b, 0) };
}

/* ───────────────────────── process flow (schematic) ───────────────────────── */

export const PROCESS = [
  { id: "ferm", name: "Fermentation", steps: ["Inoculation", "Seed culture", "Production culture", "Harvest"], text: "Cells or organisms are grown under controlled conditions — temperature, pH, oxygen — scaled up from a small seed culture to production volume, then harvested." },
  { id: "dsp", name: "Downstream processing", steps: ["Clarification", "Purification", "Concentration", "In-process testing"], text: "The harvest is separated, purified, and concentrated so that only the material of interest moves on, with checks at each step." },
  { id: "fill", name: "Blending & bottling", steps: ["Formulation", "Blending", "Fill & seal", "Label & pack"], text: "Purified material is formulated and blended into the final product, filled into containers, then labelled, packed, and released into inventory as a lot." },
] as const;

/* ───────────────────────── decision-assist actions from the customer-side modules ───────────────────────── */


export function customerActions(r: {
  bake: ReturnType<typeof bakeoff>; churn: ReturnType<typeof churn>; mon: ReturnType<typeof monitor>; cons: ReturnType<typeof consolidate>; windowDays: number;
}): Action[] {
  const out: Action[] = [];
  r.churn.filter((c) => c.tier === "High").slice(0, 3).forEach((c) => out.push({
    id: `churn-${c.account.id}`, module: "Churn", tab: "churn", severity: "High",
    title: `Reach out to ${c.account.id}`,
    why: `Churn-risk score ${c.score.toFixed(0)}/100, driven mostly by ${FACTOR_LABELS[c.top].toLowerCase()}; last order ${c.daysSince} days ago.`,
  }));
  r.mon.fill.filter((f) => f.status === "Overdue").slice(0, 2).forEach((f) => out.push({
    id: `fill-${f.account.id}`, module: "Monitoring", tab: "monitor", severity: "Medium",
    title: `Check in on ${f.account.id}'s next order`,
    why: `Expected about ${f.usual} days after the last order; it is now ${f.late} days past that date.`,
  }));
  r.mon.shifts.filter((s) => s.flagged).slice(0, 2).forEach((s) => out.push({
    id: `shift-${s.account.id}`, module: "Monitoring", tab: "monitor", severity: "Medium",
    title: `Review plan for ${s.account.id}: demand ${s.change >= 0 ? "up" : "down"} ${Math.abs(s.change * 100).toFixed(0)}%`,
    why: `Last 6 months average ${Math.round(s.recent)} / month against a 12-month baseline of ${Math.round(s.base)}.`,
  }));
  const gaps = r.mon.gaps.filter((g) => g.status === "Not shipped" || g.status === "Late");
  if (gaps.length) out.push({
    id: "ship-gaps", module: "Monitoring", tab: "monitor", severity: gaps.some((g) => g.status === "Not shipped") ? "Medium" : "Low",
    title: `Investigate ${gaps.length} shipping gap${gaps.length === 1 ? "" : "s"}`,
    why: `${gaps.filter((g) => g.status === "Not shipped").length} order(s) still unshipped and ${gaps.filter((g) => g.status === "Late").length} shipped later than the threshold.`,
  });
  if (r.cons.reduction >= 0.05) out.push({
    id: "consolidate", module: "Consolidation", tab: "consolidation", severity: "Low",
    title: `Consolidate deliveries with a ${r.windowDays}-day window`,
    why: `Merging same-destination deliveries cuts ${r.cons.before - r.cons.after} trips (${(r.cons.reduction * 100).toFixed(1)}%) in the synthetic network.`,
  });
  if (r.bake.unreliable > 0) out.push({
    id: "bakeoff", module: "Forecast models", tab: "bakeoff", severity: "Medium",
    title: `Monitor rather than auto-plan ${r.bake.unreliable} account${r.bake.unreliable === 1 ? "" : "s"}`,
    why: `Even the best of seven models misses by more than 20% MAPE on the test months for these accounts.`,
  });
  return out;
}
