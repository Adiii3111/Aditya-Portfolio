// Synthetic data for the illustrative MERCURY demo.
// Every value here is randomly generated from a seed. Names are fictional and
// the structure is generic textbook supply chain modelling — nothing here is
// derived from the original system, its data, or its logic.

export type Rng = () => number;

/** mulberry32 — small, fast, deterministic (same output on server and client). */
export function rng(seed: number): Rng {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const normal = (r: Rng) => {
  const u = Math.max(r(), 1e-9);
  const v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

const pick = <T,>(r: Rng, xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
const between = (r: Rng, lo: number, hi: number) => lo + r() * (hi - lo);
const int = (r: Rng, lo: number, hi: number) => Math.floor(between(r, lo, hi + 1));

export const PRODUCTS = ["Product A", "Product B", "Product C"] as const;
export const SITES = ["Site North", "Site South", "Site East", "Site West"] as const;
export const REGIONS = ["Region 1", "Region 2", "Region 3", "Region 4", "Region 5", "Region 6"] as const;
export const PERIOD = 13; // seasonal cycle, in weeks
export const HIST = 78; // weeks of synthetic history

export type Sku = { id: string; product: number; pack: string };
export type StockRow = { sku: Sku; site: string; onHand: number; onOrder: number; weekly: number; sd: number; leadTime: number };
export type Lot = { id: string; product: number; qty: number; mfgWeek: number; shelfLife: number };
export type Shipment = { id: string; from: string; to: string; product: number; units: number; shipDay: number; transit: number; delay: number };

export type Data = {
  seed: number;
  history: number[][]; // [product][week]
  stock: StockRow[];
  lots: Lot[];
  shipments: Shipment[];
  simDemand: number[]; // 26 weeks for the reorder simulation, before any scenario shock
  mpsDefault: number[]; // 10-week master production schedule for the MRP module
};

export function generate(seed: number): Data {
  const r = rng(seed * 9973 + 17);

  const history = PRODUCTS.map((_, p) => {
    const level = [120, 80, 52][p] * between(r, 0.85, 1.15);
    const trend = between(r, -0.15, 0.6);
    const amp = between(r, 0.12, 0.28);
    const phase = between(r, 0, Math.PI * 2);
    return Array.from({ length: HIST }, (_, t) => {
      const season = 1 + amp * Math.sin((2 * Math.PI * t) / PERIOD + phase);
      return Math.max(0, Math.round((level + trend * t) * season * (1 + 0.08 * normal(r))));
    });
  });

  const recentMean = (p: number) => history[p].slice(-PERIOD).reduce((a, b) => a + b, 0) / PERIOD;

  const stock: StockRow[] = [];
  PRODUCTS.forEach((name, p) => {
    ["Pack S", "Pack L"].forEach((pack, k) => {
      const sku: Sku = { id: `${name.slice(-1)}-${k ? "L" : "S"}`, product: p, pack };
      SITES.forEach((site) => {
        const weekly = Math.max(4, Math.round((recentMean(p) * (k ? 0.35 : 0.65)) / SITES.length * between(r, 0.6, 1.4)));
        const cover = r() < 0.1 ? between(r, 0.3, 1.2) : r() < 0.12 ? between(r, 12, 20) : between(r, 3, 9);
        stock.push({
          sku,
          site,
          weekly,
          sd: Math.max(1, Math.round(weekly * between(r, 0.15, 0.35))),
          onHand: Math.round(weekly * cover),
          onOrder: r() < 0.45 ? Math.round(weekly * between(r, 2, 5)) : 0,
          leadTime: int(r, 1, 3),
        });
      });
    });
  });

  const lots: Lot[] = Array.from({ length: 12 }, (_, i) => {
    const product = int(r, 0, 2);
    return {
      id: `L-${String(2400 + i * 7 + int(r, 0, 6)).padStart(4, "0")}`,
      product,
      qty: Math.round(between(r, 120, 520) / 10) * 10,
      mfgWeek: -int(r, 1, 22),
      shelfLife: [18, 22, 26][product] + int(r, -2, 2),
    };
  }).sort((a, b) => a.mfgWeek - b.mfgWeek);

  const shipments: Shipment[] = Array.from({ length: 14 }, (_, i) => ({
    id: `SH-${1040 + i * 3 + int(r, 0, 2)}`,
    from: pick(r, SITES),
    to: pick(r, REGIONS),
    product: int(r, 0, 2),
    units: Math.round(between(r, 40, 300) / 5) * 5,
    shipDay: int(r, -12, 9),
    transit: int(r, 2, 6),
    delay: r() < 0.22 ? int(r, 1, 4) : 0,
  })).sort((a, b) => a.shipDay - b.shipDay);

  const simDemand = Array.from({ length: 26 }, (_, t) => {
    const season = 1 + 0.25 * Math.sin((t / 26) * Math.PI * 2 + seed);
    return Math.max(0, Math.round(60 * season * (1 + 0.2 * normal(r))));
  });

  const mpsDefault = Array.from({ length: 10 }, (_, w) => Math.round((recentMean(0) * 0.6 * (1 + 0.2 * Math.sin(w + seed))) / 10) * 10);

  return { seed, history, stock, lots, shipments, simDemand, mpsDefault };
}
