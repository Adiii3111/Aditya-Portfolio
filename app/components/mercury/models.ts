// Generic, textbook planning models for the illustrative demo.
// Forecasting (moving average, exponential smoothing, Holt, Holt-Winters),
// reorder point / safety stock / EOQ, an (s, Q) perishable simulation,
// capacity-constrained batch scheduling, FEFO lot allocation, lot-for-lot MRP,
// and simple rule-based recommendations. All inputs are synthetic.

import { type Data, HIST, PERIOD, PRODUCTS } from "./synthetic";

export type Scenario = { demand: number; lead: number; capacity: number; shelf: number };
export const BASELINE: Scenario = { demand: 0, lead: 0, capacity: 0, shelf: 0 };

export type ReorderParams = { rop: number; qty: number; lead: number; life: number; service: number; orderCost: number; holdPct: number; unitCost: number };
export type Params = { reorder: ReorderParams; mps: number[]; overtime: boolean };

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const mean = (xs: number[]) => (xs.length ? sum(xs) / xs.length : 0);
const sd = (xs: number[]) => { const m = mean(xs); return Math.sqrt(mean(xs.map((x) => (x - m) ** 2))); };
const shock = (s: Scenario) => 1 + s.demand / 100;

/** Inverse standard normal CDF (Acklam's rational approximation). */
export function invNorm(p: number) {
  const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924];
  const b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857];
  const c = [-0.00778489400243029, -0.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878];
  const d = [0.00778469570904146, 0.32246712907004, 2.445134137143, 3.75440866190742];
  const lo = 0.02425;
  if (p < lo) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p > 1 - lo) { const q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  const q = p - 0.5, r = q * q;
  return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

/* ───────────────────────── 1. Forecasting ───────────────────────── */

export type Method = "ma" | "ses" | "holt" | "hw";
export const METHODS: { id: Method; label: string }[] = [
  { id: "ma", label: "Moving average" },
  { id: "ses", label: "Exponential smoothing" },
  { id: "holt", label: "Holt (trend)" },
  { id: "hw", label: "Holt-Winters (trend + season)" },
];
export type FcParams = { window: number; alpha: number; beta: number; gamma: number };

/** Fits a method to a series and forecasts `horizon` steps ahead. */
export function forecast(y: number[], method: Method, p: FcParams, horizon: number) {
  const n = y.length;
  const fitted: (number | null)[] = new Array(n).fill(null);
  let future: number[] = [];

  if (method === "ma") {
    const w = Math.max(1, Math.min(p.window, n));
    for (let t = w; t < n; t++) fitted[t] = mean(y.slice(t - w, t));
    future = new Array(horizon).fill(mean(y.slice(n - w)));
  } else if (method === "ses") {
    let l = y[0];
    for (let t = 1; t < n; t++) { fitted[t] = l; l = p.alpha * y[t] + (1 - p.alpha) * l; }
    future = new Array(horizon).fill(l);
  } else if (method === "holt") {
    let l = y[0], b = y[1] - y[0];
    for (let t = 1; t < n; t++) {
      fitted[t] = l + b;
      const prev = l;
      l = p.alpha * y[t] + (1 - p.alpha) * (l + b);
      b = p.beta * (l - prev) + (1 - p.beta) * b;
    }
    future = Array.from({ length: horizon }, (_, h) => l + (h + 1) * b);
  } else {
    const m = PERIOD;
    if (n < 2 * m) return forecast(y, "holt", p, horizon);
    let l = mean(y.slice(0, m));
    let b = (mean(y.slice(m, 2 * m)) - l) / m;
    const s = y.slice(0, m).map((v) => v - l);
    for (let t = m; t < n; t++) {
      const st = s[t - m];
      fitted[t] = l + b + st;
      const prev = l;
      l = p.alpha * (y[t] - st) + (1 - p.alpha) * (l + b);
      b = p.beta * (l - prev) + (1 - p.beta) * b;
      s.push(p.gamma * (y[t] - l) + (1 - p.gamma) * st);
    }
    future = Array.from({ length: horizon }, (_, h) => l + (h + 1) * b + s[n - m + (h % m)]);
  }

  const resid = fitted.map((f, t) => (f == null ? null : y[t] - f)).filter((v): v is number => v != null);
  const sigma = resid.length ? Math.sqrt(mean(resid.map((e) => e * e))) : 0;
  future = future.map((v) => Math.max(0, v));
  return { fitted, future, sigma };
}

/** Holdout accuracy: fit on all but the last `hold` points, compare forecasts with actuals. */
export function evaluate(y: number[], method: Method, p: FcParams, hold = PERIOD) {
  const train = y.slice(0, y.length - hold);
  const actual = y.slice(y.length - hold);
  const pred = forecast(train, method, p, hold).future;
  const err = actual.map((a, i) => a - pred[i]);
  const mae = mean(err.map(Math.abs));
  const rmse = Math.sqrt(mean(err.map((e) => e * e)));
  const mape = mean(err.map((e, i) => (actual[i] ? Math.abs(e / actual[i]) : 0))) * 100;
  return { pred, mae, rmse, mape };
}

/* ───────────────────────── 2. Inventory visibility ───────────────────────── */

export type StockStatus = "Stockout risk" | "Low" | "Healthy" | "Excess";
export function inventory(data: Data, sc: Scenario) {
  const z = invNorm(0.95);
  return data.stock.map((row) => {
    const weekly = row.weekly * shock(sc);
    const lead = Math.max(0, row.leadTime + sc.lead);
    const safety = z * row.sd * Math.sqrt(Math.max(lead, 0.5));
    const rop = weekly * lead + safety;
    const daysCover = weekly > 0 ? (row.onHand / weekly) * 7 : 999;
    const status: StockStatus =
      row.onHand + row.onOrder < weekly * lead ? "Stockout risk" : row.onHand < rop ? "Low" : daysCover > 84 ? "Excess" : "Healthy";
    return { ...row, weekly: Math.round(weekly), lead, rop: Math.round(rop), safety: Math.round(safety), daysCover: Math.round(daysCover), status };
  });
}
export type InvRow = ReturnType<typeof inventory>[number];

/* ───────────────────────── 3. Reorder planning ───────────────────────── */

export function simulateReorder(demand: number[], reorderPoint: number, orderQty: number, leadTime: number, shelfLife: number) {
  const weeks = demand.length;
  let lots = [{ qty: reorderPoint + orderQty, expires: shelfLife }];
  const pipeline: { arrives: number; qty: number }[] = [];
  const rows = [];
  let served = 0, lost = 0, expiredTotal = 0, orders = 0;

  for (let t = 0; t < weeks; t++) {
    pipeline.filter((p) => p.arrives === t).forEach((p) => lots.push({ qty: p.qty, expires: t + shelfLife }));
    const expired = lots.filter((l) => l.expires <= t).reduce((a, l) => a + l.qty, 0);
    lots = lots.filter((l) => l.expires > t).sort((a, b) => a.expires - b.expires);

    let need = demand[t];
    for (const l of lots) { const take = Math.min(l.qty, need); l.qty -= take; need -= take; }
    lots = lots.filter((l) => l.qty > 0);

    const onHand = lots.reduce((a, l) => a + l.qty, 0);
    const position = onHand + pipeline.filter((p) => p.arrives > t).reduce((a, p) => a + p.qty, 0);
    const ordered = position <= reorderPoint;
    if (ordered) { pipeline.push({ arrives: t + leadTime, qty: orderQty }); orders++; }

    served += demand[t] - need; lost += need; expiredTotal += expired;
    rows.push({ t, demand: demand[t], onHand, short: need, expired, ordered });
  }
  const total = sum(demand);
  return { rows, fillRate: total ? served / total : 1, lost, expired: expiredTotal, orders, stockoutWeeks: rows.filter((r) => r.short > 0).length };
}

export function reorder(data: Data, sc: Scenario, p: ReorderParams) {
  const demand = data.simDemand.map((d) => Math.round(d * shock(sc)));
  const lead = Math.max(1, p.lead + sc.lead);
  const life = Math.max(2, p.life + sc.shelf);
  const d = mean(demand), sigma = sd(demand);
  const z = invNorm(p.service / 100);
  const safety = z * sigma * Math.sqrt(lead);
  const recommendedRop = d * lead + safety;
  const annual = d * 52;
  const h = p.unitCost * (p.holdPct / 100);
  const eoq = h > 0 ? Math.sqrt((2 * annual * p.orderCost) / h) : 0;
  const sim = simulateReorder(demand, p.rop, p.qty, lead, life);
  return { demand, lead, life, mean: d, sigma, z, safety: Math.round(safety), recommendedRop: Math.round(recommendedRop), eoq: Math.round(eoq), sim };
}

/* ───────────────────────── 4. Production planning ───────────────────────── */

export const BATCH = [60, 40, 30];
const PLAN_WEEKS = 12;

export function production(data: Data, sc: Scenario, overtime: boolean) {
  const recent = data.history.map((h) => h.slice(-PERIOD));
  const growth = data.history.map((h) => mean(h.slice(-PERIOD)) / Math.max(1, mean(h.slice(-2 * PERIOD, -PERIOD))));
  const req = PRODUCTS.map((_, p) => Array.from({ length: PLAN_WEEKS }, (_, w) => Math.round(recent[p][w % PERIOD] * growth[p] * shock(sc))));
  const baseCap = Math.round((sum(recent.map(mean)) * 1.04) / 10) * 10;
  const cap = Math.round(baseCap * (1 + sc.capacity / 100));
  const otCap = overtime ? Math.round(cap * 0.15) : 0;

  const pos = PRODUCTS.map(() => 0); // + surplus, − backlog
  const weeks = Array.from({ length: PLAN_WEEKS }, (_, w) => {
    const need = PRODUCTS.map((_, p) => req[p][w] - pos[p]);
    const batches = PRODUCTS.map(() => 0);
    let left = cap + otCap;
    for (;;) {
      let best = -1;
      for (let p = 0; p < PRODUCTS.length; p++) if (need[p] > 0 && BATCH[p] <= left && (best < 0 || need[p] > need[best])) best = p;
      if (best < 0) break;
      batches[best]++; need[best] -= BATCH[best]; left -= BATCH[best];
    }
    need.forEach((n, p) => (pos[p] = -n));
    const produced = sum(batches.map((b, p) => b * BATCH[p]));
    return {
      week: w + 1,
      required: sum(req.map((r) => r[w])),
      produced,
      batches,
      overtime: Math.max(0, produced - cap),
      backlog: sum(need.map((n) => Math.max(0, n))),
    };
  });
  const produced = sum(weeks.map((w) => w.produced));
  return { weeks, cap, otCap, baseCap, utilization: produced / (cap * PLAN_WEEKS), backlogEnd: weeks[PLAN_WEEKS - 1].backlog, overtimeWeeks: weeks.filter((w) => w.overtime > 0).length };
}

/* ───────────────────────── 5. Lot expiration (FEFO) ───────────────────────── */

const LOT_WEEKS = 16;
export function lots(data: Data, sc: Scenario) {
  const weekly = data.history.map((h) => mean(h.slice(-PERIOD)) * 0.9 * shock(sc));
  const state = data.lots.map((l) => ({ ...l, shelfLife: Math.max(2, l.shelfLife + sc.shelf), rem: l.qty, allocated: 0, expiredQty: 0 }))
    .map((l) => ({ ...l, expiry: l.mfgWeek + l.shelfLife }));

  for (let w = 0; w < LOT_WEEKS; w++) {
    state.forEach((l) => { if (l.expiry <= w && l.rem > 0) { l.expiredQty += l.rem; l.rem = 0; } });
    PRODUCTS.forEach((_, p) => {
      let need = weekly[p];
      for (const l of state.filter((x) => x.product === p && x.rem > 0).sort((a, b) => a.expiry - b.expiry)) {
        const take = Math.min(l.rem, need); l.rem -= take; l.allocated += take; need -= take;
        if (need <= 0) break;
      }
    });
  }
  const rows = state.map((l) => {
    const status = l.expiry <= 0 ? "Expired" : l.expiredQty > 0.5 ? "At risk" : l.expiry <= 4 ? "Watch" : "On track";
    return { ...l, allocated: Math.round(l.allocated), expiredQty: Math.round(l.expiredQty), rem: Math.round(l.rem), status };
  });
  return { rows, atRiskUnits: sum(rows.filter((r) => r.expiry > 0).map((r) => r.expiredQty)), horizon: LOT_WEEKS, weekly: weekly.map(Math.round) };
}
export type LotRow = ReturnType<typeof lots>["rows"][number];

/* ───────────────────────── 6. MRP ───────────────────────── */

export type BomItem = { id: string; name: string; parent: string | null; qtyPer: number; lead: number; onHand: number; receipts: Record<number, number>; purchased: boolean; level: number };
export const BOM: BomItem[] = [
  { id: "FG", name: "Product A · finished", parent: null, qtyPer: 1, lead: 1, onHand: 80, receipts: { 2: 120 }, purchased: false, level: 0 },
  { id: "C-12", name: "Component C-12", parent: "FG", qtyPer: 1, lead: 2, onHand: 150, receipts: { 1: 100 }, purchased: false, level: 1 },
  { id: "C-31", name: "Component C-31", parent: "FG", qtyPer: 2, lead: 1, onHand: 300, receipts: {}, purchased: true, level: 1 },
  { id: "P-04", name: "Packaging P-04", parent: "FG", qtyPer: 1, lead: 3, onHand: 240, receipts: { 3: 200 }, purchased: true, level: 1 },
  { id: "R-05", name: "Raw material R-05", parent: "C-12", qtyPer: 3, lead: 2, onHand: 400, receipts: { 2: 300 }, purchased: true, level: 2 },
];
export const MRP_WEEKS = 10;

export function mrp(sc: Scenario, mps: number[]) {
  const records = new Map<string, { item: BomItem; lead: number; gross: number[]; receipts: number[]; poh: number[]; net: number[]; por: number[]; release: number[]; pastDue: number }>();
  for (const item of [...BOM].sort((a, b) => a.level - b.level)) {
    const lead = Math.max(0, item.lead + (item.purchased ? sc.lead : 0));
    const gross = item.parent == null
      ? mps.map((q) => Math.round(q * shock(sc)))
      : records.get(item.parent)!.release.map((q) => q * item.qtyPer);
    const receipts = Array.from({ length: MRP_WEEKS }, (_, w) => item.receipts[w + 1] ?? 0);
    const poh: number[] = [], net: number[] = [], por: number[] = new Array(MRP_WEEKS).fill(0), release: number[] = new Array(MRP_WEEKS).fill(0);
    let prev = item.onHand, pastDue = 0;
    for (let w = 0; w < MRP_WEEKS; w++) {
      const avail = prev + receipts[w] - gross[w];
      const n = Math.max(0, -avail);
      net.push(n);
      if (n > 0) {
        por[w] = n;
        if (w - lead >= 0) release[w - lead] += n; else pastDue += n;
      }
      prev = avail + por[w];
      poh.push(prev);
    }
    records.set(item.id, { item, lead, gross, receipts, poh, net, por, release, pastDue });
  }
  return [...records.values()];
}
export type MrpRecord = ReturnType<typeof mrp>[number];

/* ───────────────────────── 7. Shipping ───────────────────────── */

export function shipping(data: Data, sc: Scenario) {
  const rows = data.shipments.map((s) => {
    const plannedEta = s.shipDay + s.transit;
    const arrived = plannedEta + s.delay <= 0;
    const stress = arrived ? 0 : Math.max(0, sc.lead); // one extra transit day per week of lead-time stress
    const eta = plannedEta + s.delay + stress;
    const status = s.shipDay > 0 ? "Planned" : eta <= 0 ? "Delivered" : eta > plannedEta ? "Delayed" : "In transit";
    return { ...s, plannedEta, eta, late: eta - plannedEta, status };
  });
  const onTime = rows.filter((r) => r.late <= 0).length / Math.max(1, rows.length);
  return { rows, onTime };
}
export type ShipRow = ReturnType<typeof shipping>["rows"][number];

/* ───────────────────────── Everything together ───────────────────────── */

export function runAll(data: Data, sc: Scenario, p: Params) {
  const inv = inventory(data, sc);
  const ro = reorder(data, sc, p.reorder);
  const prod = production(data, sc, p.overtime);
  const lot = lots(data, sc);
  const plan = mrp(sc, p.mps);
  const ship = shipping(data, sc);
  return {
    inv, ro, prod, lot, plan, ship,
    kpis: {
      fillRate: ro.sim.fillRate,
      atRisk: inv.filter((r) => r.status === "Stockout risk").length,
      expiring: lot.atRiskUnits,
      utilization: prod.utilization,
      backlog: prod.backlogEnd,
      onTime: ship.onTime,
      pastDue: plan.filter((r) => r.pastDue > 0).length,
    },
  };
}
export type Results = ReturnType<typeof runAll>;

/* ───────────────────────── 9. Decision-assist recommendations ───────────────────────── */

export type Action = { id: string; module: string; tab: string; severity: "High" | "Medium" | "Low"; title: string; why: string };

export function recommend(r: Results): Action[] {
  const out: Action[] = [];

  const risks = r.inv.filter((row) => row.status === "Stockout risk")
    .sort((a, b) => (a.onHand + a.onOrder) / Math.max(1, a.weekly * a.lead) - (b.onHand + b.onOrder) / Math.max(1, b.weekly * b.lead));
  if (risks.length > 4) out.push({
    id: "inv-more", module: "Inventory", tab: "inventory", severity: "Medium",
    title: `Review ${risks.length - 4} more SKU-site positions below lead-time demand`,
    why: `Lower-shortfall positions in the same condition as the four above; filter Inventory visibility by “Stockout risk”.`,
  });
  risks.slice(0, 4).forEach((row) => {
    const donor = r.inv.find((x) => x.sku.id === row.sku.id && x.site !== row.site && x.status === "Excess");
    out.push({
      id: `inv-${row.sku.id}-${row.site}`, module: "Inventory", tab: "inventory", severity: "High",
      title: donor ? `Transfer ${row.sku.id} from ${donor.site} to ${row.site}` : `Expedite replenishment of ${row.sku.id} at ${row.site}`,
      why: `On hand + on order (${row.onHand + row.onOrder}) is below demand over the ${row.lead}-week lead time (${row.weekly * row.lead}).${donor ? ` ${donor.site} holds ${donor.daysCover} days of cover.` : ""}`,
    });
  });

  if (r.ro.sim.fillRate < 0.95) out.push({
    id: "ro-fill", module: "Reorder", tab: "reorder", severity: r.ro.sim.fillRate < 0.85 ? "High" : "Medium",
    title: `Raise the reorder point toward ${r.ro.recommendedRop} units`,
    why: `Simulated fill rate is ${(r.ro.sim.fillRate * 100).toFixed(1)}%, below a 95% target; the service-level formula suggests ${r.ro.recommendedRop}.`,
  });
  if (r.ro.sim.expired > 0) out.push({
    id: "ro-waste", module: "Reorder", tab: "reorder", severity: "Medium",
    title: `Reduce order quantity to limit expiry (${r.ro.sim.expired} units expired)`,
    why: `Orders arrive faster than they are consumed within the ${r.ro.life}-week shelf life.`,
  });

  r.prod.weeks.filter((w) => w.backlog > 0).slice(0, 2).forEach((w) => out.push({
    id: `prod-${w.week}`, module: "Production", tab: "production", severity: w.backlog > r.prod.cap * 0.2 ? "High" : "Medium",
    title: r.prod.otCap ? `Pull batches forward before week ${w.week}` : `Add overtime in week ${w.week}`,
    why: `Requirement plus carried backlog exceeds capacity; ${w.backlog} units remain unmet at the end of week ${w.week}.`,
  }));

  const riskyLots = r.lot.rows.filter((l) => l.status === "At risk").sort((a, b) => b.expiredQty - a.expiredQty);
  if (riskyLots.length > 3) out.push({
    id: "lot-more", module: "Lots", tab: "lots", severity: "Low",
    title: `Watch ${riskyLots.length - 3} more lots with smaller projected expiry`,
    why: `${riskyLots.slice(3).reduce((a, l) => a + l.expiredQty, 0)} further units are projected to expire across these lots.`,
  });
  riskyLots.slice(0, 3).forEach((l) => out.push({
    id: `lot-${l.id}`, module: "Lots", tab: "lots", severity: l.expiredQty > 100 ? "High" : "Medium",
    title: `Prioritize or redeploy lot ${l.id}`,
    why: `First-expiry-first-out allocation still leaves ${l.expiredQty} units of ${PRODUCTS[l.product]} expiring in week ${l.expiry}.`,
  }));

  r.plan.filter((m) => m.pastDue > 0).forEach((m) => out.push({
    id: `mrp-${m.item.id}`, module: "MRP", tab: "mrp", severity: "High",
    title: `Expedite ${m.item.name}`,
    why: `${m.pastDue} units would need to have been released before week 1 to meet the plan with a ${m.lead}-week lead time.`,
  }));

  r.ship.rows.filter((s) => s.status === "Delayed").forEach((s) => out.push({
    id: `ship-${s.id}`, module: "Shipping", tab: "shipping", severity: s.late > 2 ? "Medium" : "Low",
    title: `Notify ${s.to} about ${s.id}`,
    why: `Projected arrival is ${s.late} day${s.late === 1 ? "" : "s"} later than planned.`,
  }));

  const rank = { High: 0, Medium: 1, Low: 2 };
  return out.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

export { HIST, PERIOD };
