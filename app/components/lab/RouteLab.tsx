"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { Kpi, Range, TryThis, Why, seeded, useInView, useReducedMotion } from "./shared";

type P = { x: number; y: number };
type Stop = P & { id: number; q: number };

const W = 600, H = 400;
const DEPOT: P = { x: 300, y: 200 };
const MAX_STOPS = 26;
const UNIT = 10; // map units per "km"
const COLORS = ["#C5A572", "#E2CDA4", "#8FB3D9", "#D98B6F", "#9FC3A8", "#B9A6D6", "#A8A8A2"];

const d = (a: P, b: P) => Math.hypot(a.x - b.x, a.y - b.y);

function makeStops(seed: number, n = 11): Stop[] {
  const r = seeded(seed);
  const out: Stop[] = [];
  while (out.length < n) {
    const p = { x: 36 + r() * (W - 72), y: 36 + r() * (H - 72) };
    if (d(p, DEPOT) < 55 || out.some((s) => d(s, p) < 34)) continue;
    out.push({ ...p, id: out.length + 1, q: 1 + Math.floor(r() * 4) });
  }
  return out;
}

const routeLen = (route: P[]) => {
  let len = 0;
  let prev = DEPOT;
  for (const p of route) { len += d(prev, p); prev = p; }
  return len + d(prev, DEPOT);
};

/** 2-opt improvement of a closed tour that starts and ends at the depot. */
function twoOpt(route: Stop[]) {
  const r = [...route];
  const at = (i: number) => (i < 0 || i >= r.length ? DEPOT : r[i]);
  for (let pass = 0, improved = true; improved && pass < 60; pass++) {
    improved = false;
    for (let i = 0; i < r.length - 1; i++) {
      for (let k = i + 1; k < r.length; k++) {
        const delta = d(at(i - 1), at(k)) + d(at(i), at(k + 1)) - d(at(i - 1), at(i)) - d(at(k), at(k + 1));
        if (delta < -1e-9) {
          r.splice(i, k - i + 1, ...r.slice(i, k + 1).reverse());
          improved = true;
        }
      }
    }
  }
  return r;
}

function nearestNeighbour(stops: Stop[]) {
  const left = [...stops];
  const route: Stop[] = [];
  let cur: P = DEPOT;
  while (left.length) {
    let best = 0;
    for (let i = 1; i < left.length; i++) if (d(cur, left[i]) < d(cur, left[best])) best = i;
    cur = left[best];
    route.push(left.splice(best, 1)[0]);
  }
  return route;
}

/** Clarke–Wright savings with a vehicle capacity, each route then polished with 2-opt. */
function savings(stops: Stop[], cap: number) {
  let routes: Stop[][] = stops.map((s) => [s]);
  const owner = new Map<number, number>(stops.map((s, i) => [s.id, i]));
  const load = stops.map((s) => s.q);
  const pairs: { i: Stop; j: Stop; s: number }[] = [];
  for (let a = 0; a < stops.length; a++)
    for (let b = a + 1; b < stops.length; b++)
      pairs.push({ i: stops[a], j: stops[b], s: d(DEPOT, stops[a]) + d(DEPOT, stops[b]) - d(stops[a], stops[b]) });
  pairs.sort((x, y) => y.s - x.s);

  for (const { i, j, s } of pairs) {
    if (s <= 0) break;
    const ri = owner.get(i.id)!, rj = owner.get(j.id)!;
    if (ri === rj || load[ri] + load[rj] > cap) continue;
    const A = routes[ri], B = routes[rj];
    const aEnd = A[A.length - 1].id === i.id, aStart = A[0].id === i.id;
    const bStart = B[0].id === j.id, bEnd = B[B.length - 1].id === j.id;
    let merged: Stop[] | null = null;
    if (aEnd && bStart) merged = [...A, ...B];
    else if (aStart && bEnd) merged = [...B, ...A];
    else if (aEnd && bEnd) merged = [...A, ...[...B].reverse()];
    else if (aStart && bStart) merged = [...[...A].reverse(), ...B];
    if (!merged) continue;
    routes[ri] = merged;
    routes[rj] = [];
    load[ri] += load[rj];
    load[rj] = 0;
    B.forEach((st) => owner.set(st.id, ri));
  }
  routes = routes.filter((r) => r.length).map(twoOpt);
  return routes;
}

type Geom = { pts: P[]; cum: number[]; total: number };

function geometry(route: Stop[]): Geom {
  const pts = [DEPOT, ...route, DEPOT];
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + d(pts[i - 1], pts[i]));
  return { pts, cum, total: cum[cum.length - 1] };
}

function posAt(g: Geom, s: number) {
  if (g.total === 0) return { x: DEPOT.x, y: DEPOT.y, a: 0 };
  const t = ((s % g.total) + g.total) % g.total;
  let i = 1;
  while (i < g.cum.length - 1 && g.cum[i] < t) i++;
  const a = g.pts[i - 1], b = g.pts[i];
  const seg = g.cum[i] - g.cum[i - 1] || 1;
  const f = (t - g.cum[i - 1]) / seg;
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, a: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI };
}

const km = (len: number) => (len / UNIT).toFixed(1);

export default function RouteLab() {
  const [seed, setSeed] = useState(4);
  const [stops, setStops] = useState<Stop[]>(() => makeStops(4));
  const [cap, setCap] = useState(10);
  const [method, setMethod] = useState<"tsp" | "savings">("savings");
  const [solved, setSolved] = useState(true);
  const [clock, setClock] = useState(0);
  const nextId = useRef(100);
  const svgRef = useRef<SVGSVGElement>(null);
  const visible = useInView(svgRef);
  const reduced = useReducedMotion();

  const tsp = useMemo(() => twoOpt(nearestNeighbour(stops)), [stops]);
  const cw = useMemo(() => savings(stops, cap), [stops, cap]);
  const tspLen = routeLen(tsp);
  const cwLen = cw.reduce((a, r) => a + routeLen(r), 0);
  const nnLen = useMemo(() => routeLen(nearestNeighbour(stops)), [stops]);
  const routes = useMemo(() => (method === "tsp" ? [tsp] : cw), [method, tsp, cw]);
  const geoms = useMemo(() => routes.map(geometry), [routes]);
  const totalLoad = stops.reduce((a, s) => a + s.q, 0);

  const animate = solved && visible && !reduced && stops.length > 0;
  useEffect(() => {
    if (!animate) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      setClock((c) => c + dt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animate]);

  const change = (next: Stop[]) => { setStops(next); setSolved(false); };

  const addStop = (e: MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm || stops.length >= MAX_STOPS) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(ctm.inverse());
    if (d(p, DEPOT) < 22) return;
    nextId.current += 1;
    change([...stops, { x: p.x, y: p.y, id: nextId.current, q: 1 + (nextId.current % 4) }]);
  };

  const shuffle = () => { const s = seed + 1; setSeed(s); change(makeStops(s, 8 + (s % 7))); };

  const best = Math.min(tspLen, cwLen);

  return (
    <div className="lab-experiment">
      <div className="lab-controls">
        <p className="lab-hint">Click the map to add a delivery stop. Click a stop to remove it. The number on each stop is its order size.</p>
        <div className="lab-seg" role="group" aria-label="Solution method">
          <button aria-pressed={method === "savings"} onClick={() => setMethod("savings")}>Savings (fleet)</button>
          <button aria-pressed={method === "tsp"} onClick={() => setMethod("tsp")}>TSP (one van)</button>
        </div>
        <Range label="Vehicle capacity" value={cap} min={4} max={40} display={`${cap} units`} onChange={(v) => { setCap(v); setSolved(false); }} />
        <div className="lab-buttons">
          <button className="lab-btn lab-btn-gold" onClick={() => setSolved(true)} disabled={!stops.length}>Solve</button>
          <button className="lab-btn" onClick={shuffle}>Shuffle stops</button>
          <button className="lab-btn" onClick={() => change([])}>Clear</button>
        </div>
        <dl className="lab-kpis">
          <Kpi label="Stops · total load" value={`${stops.length} · ${totalLoad}`} />
          <Kpi label="TSP + 2-opt" value={solved ? `${km(tspLen)} km` : "—"} sub={solved && stops.length ? `Nearest neighbour alone: ${km(nnLen)} km` : undefined} tone={solved && tspLen === best && stops.length ? "good" : undefined} />
          <Kpi label="Clarke–Wright savings" value={solved ? `${km(cwLen)} km` : "—"} sub={solved && stops.length ? `${cw.length} vehicle${cw.length === 1 ? "" : "s"} at ≤ ${cap} units` : undefined} tone={solved && cwLen === best && stops.length ? "good" : undefined} />
        </dl>
        <TryThis items={["Drop a tight cluster of stops in one corner and see how Savings groups them.", "Lower the capacity until the fleet splits — the single-van TSP ignores capacity, so it is a lower bound on driving."]} />
      </div>

      <div className="lab-stage">
        <svg ref={svgRef} className="lab-svg lab-map" viewBox={`0 0 ${W} ${H}`} onClick={addStop} role="img" aria-label={`Routing map with ${stops.length} delivery stops around a central depot${solved && stops.length ? `; ${method === "tsp" ? "single tour" : `${cw.length} routes`} totalling ${km(method === "tsp" ? tspLen : cwLen)} km` : ""}.`}>
          <defs>
            <pattern id="lab-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#F4F0E80d" /></pattern>
          </defs>
          <rect width={W} height={H} fill="url(#lab-grid)" />
          {solved && routes.map((r, i) => (
            <polyline key={i} className="lab-route" stroke={COLORS[i % COLORS.length]} points={[DEPOT, ...r, DEPOT].map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")} />
          ))}
          {stops.map((s) => (
            <g key={s.id} className="lab-stop" transform={`translate(${s.x.toFixed(1)} ${s.y.toFixed(1)})`} onClick={(e) => { e.stopPropagation(); change(stops.filter((x) => x.id !== s.id)); }} role="button" aria-label={`Remove stop with order size ${s.q}`}>
              <circle r="10" />
              <text y="3.5">{s.q}</text>
            </g>
          ))}
          <g className="lab-depot" transform={`translate(${DEPOT.x} ${DEPOT.y})`}>
            <rect x="-11" y="-11" width="22" height="22" rx="3" />
            <text y="28">DEPOT</text>
          </g>
          {solved && geoms.map((g, i) => {
            const p = posAt(g, clock * 90 + i * 37);
            return (
              <g key={`t${i}`} className="lab-truck" transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${p.a.toFixed(1)})`}>
                <rect x="-8" y="-4.5" width="11" height="9" rx="1.5" fill={COLORS[i % COLORS.length]} />
                <rect x="3.5" y="-3.5" width="5" height="7" rx="1.5" />
              </g>
            );
          })}
          {!solved && stops.length > 0 && <text className="lab-map-msg" x={W / 2} y={H - 18}>Press Solve to route</text>}
          {!stops.length && <text className="lab-map-msg" x={W / 2} y={H / 2 + 60}>Click anywhere to add stops</text>}
        </svg>
        <p className="lab-caption">Distances are straight-line, in illustrative km on a synthetic map.</p>
      </div>

      <Why>At Nakshatra Agencies (2022) I worked on distribution routing with the Traveling Salesman Problem, the Savings Matrix heuristic, and NEXTMV. This is a pocket version of those ideas.</Why>
    </div>
  );
}
