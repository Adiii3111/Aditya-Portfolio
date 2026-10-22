"use client";

import { useEffect, useRef, useState } from "react";
import { Kpi, Range, TryThis, Why, expo, seeded, useInView, useReducedMotion, type Rng } from "./shared";

/* An animated M/M/c clinic: Poisson arrivals, exponential service, c clinicians, first-come-first-served. */

type Patient = { id: number; arr: number };
type Busy = { id: number; start: number; end: number } | null;

type Sim = {
  rng: Rng;
  t: number;
  nextArrival: number;
  queue: Patient[];
  servers: Busy[];
  nextId: number;
  starts: number;
  served: number;
  waitSum: number;
  qArea: number;
  busyArea: number;
  nextSample: number;
  series: { t: number; q: number }[];
  exits: { id: number; k: number; at: number }[];
};

type View = {
  t: number;
  queue: number[];
  queueLen: number;
  servers: ({ id: number; frac: number } | null)[];
  exits: { id: number; k: number }[];
  served: number;
  avgWait: number;
  avgQ: number;
  util: number;
  series: { t: number; q: number }[];
};

const SAMPLE_EVERY = 5; // sim minutes
const SERIES_MAX = 144;
const SHOWN_QUEUE = 16;

function newSim(seed: number, lambda: number, c: number): Sim {
  const rng = seeded(seed);
  return { rng, t: 0, nextArrival: expo(rng, 60 / lambda), queue: [], servers: Array(c).fill(null), nextId: 1, starts: 0, served: 0, waitSum: 0, qArea: 0, busyArea: 0, nextSample: 0, series: [], exits: [] };
}

function advance(sim: Sim, minutes: number, lambda: number, svc: number, now: number | null) {
  const target = sim.t + minutes;
  const startService = () => {
    for (let k = 0; k < sim.servers.length && sim.queue.length; k++) {
      if (sim.servers[k]) continue;
      const p = sim.queue.shift()!;
      sim.waitSum += sim.t - p.arr;
      sim.starts++;
      sim.servers[k] = { id: p.id, start: sim.t, end: sim.t + expo(sim.rng, svc) };
    }
  };
  const accrue = (to: number) => {
    const busy = sim.servers.filter(Boolean).length;
    sim.qArea += sim.queue.length * (to - sim.t);
    sim.busyArea += busy * (to - sim.t);
    while (sim.nextSample <= to) {
      sim.series.push({ t: sim.nextSample, q: sim.queue.length });
      if (sim.series.length > SERIES_MAX) sim.series.shift();
      sim.nextSample += SAMPLE_EVERY;
    }
    sim.t = to;
  };
  for (;;) {
    let finishK = -1, finishT = Infinity;
    sim.servers.forEach((s, k) => { if (s && s.end < finishT) { finishT = s.end; finishK = k; } });
    const evt = Math.min(sim.nextArrival, finishT);
    if (evt > target) break;
    accrue(evt);
    if (sim.nextArrival <= finishT) {
      sim.queue.push({ id: sim.nextId++, arr: sim.t });
      sim.nextArrival = sim.t + expo(sim.rng, 60 / lambda);
    } else {
      const done = sim.servers[finishK]!;
      sim.servers[finishK] = null;
      sim.served++;
      if (now !== null) sim.exits.push({ id: done.id, k: finishK, at: now });
    }
    startService();
  }
  accrue(target);
}

function snapshot(sim: Sim): View {
  return {
    t: sim.t,
    queue: sim.queue.slice(0, SHOWN_QUEUE).map((p) => p.id),
    queueLen: sim.queue.length,
    servers: sim.servers.map((s) => (s ? { id: s.id, frac: Math.min(1, (sim.t - s.start) / Math.max(0.01, s.end - s.start)) } : null)),
    exits: sim.exits.map((e) => ({ id: e.id, k: e.k })),
    served: sim.served,
    avgWait: sim.starts ? sim.waitSum / sim.starts : 0,
    avgQ: sim.t ? sim.qArea / sim.t : 0,
    util: sim.t ? sim.busyArea / (sim.servers.length * sim.t) : 0,
    series: [...sim.series],
  };
}

/** Erlang-C steady-state results for M/M/c (λ, μ per hour). */
function erlangC(lambda: number, mu: number, c: number) {
  const a = lambda / mu;
  const rho = a / c;
  if (rho >= 1) return { rho, wq: Infinity, lq: Infinity, pWait: 1 };
  let sum = 0, term = 1;
  for (let k = 0; k < c; k++) { if (k > 0) term *= a / k; sum += term; }
  const top = term * (a / c) / (1 - rho); // a^c / c! · 1/(1-ρ)
  const pWait = top / (sum + top);
  const wqHours = pWait / (c * mu - lambda);
  return { rho, wq: wqHours * 60, lq: lambda * wqHours, pWait };
}

const W = 600, H = 230, QY = 112, SX = 430;
const speeds = [5, 15, 30, 60];
const serverY = (k: number, c: number) => QY + (k - (c - 1) / 2) * Math.min(34, 180 / c);
const fmtClock = (min: number) => `${String(Math.floor(min / 60) + 8).padStart(2, "0")}:${String(Math.floor(min % 60)).padStart(2, "0")}`;

export default function PatientFlowLab() {
  const [lambda, setLambda] = useState(14);
  const [c, setC] = useState(3);
  const [svc, setSvc] = useState(11);
  const [speed, setSpeed] = useState(15);
  const [running, setRunning] = useState(true);
  const seedRef = useRef(11);
  const sim = useRef<Sim | null>(null);
  const [view, setView] = useState<View>(() => snapshot(newSim(11, 14, 3)));
  const rootRef = useRef<HTMLDivElement>(null);
  const visible = useInView(rootRef);
  const reduced = useReducedMotion();
  const params = useRef({ lambda, svc, speed });

  useEffect(() => { params.current = { lambda, svc, speed }; }, [lambda, svc, speed]);

  const getSim = () => (sim.current ??= newSim(seedRef.current, params.current.lambda, c));

  const reset = (nl = lambda, nc = c) => {
    seedRef.current += 1;
    sim.current = newSim(seedRef.current, nl, nc);
    setView(snapshot(sim.current));
  };

  const animate = running && visible && !reduced;
  useEffect(() => {
    if (!animate) return;
    let raf = 0, last = performance.now();
    const tick = (now: number) => {
      const s = getSim();
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const { lambda: l, svc: m, speed: sp } = params.current;
      advance(s, dt * sp, l, m, now);
      s.exits = s.exits.filter((e) => now - e.at < 900);
      setView(snapshot(s));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // getSim only reads refs; c changes always go through reset().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animate]);

  const fastForward = () => {
    const s = getSim();
    advance(s, 8 * 60, lambda, svc, null);
    setView(snapshot(s));
  };

  const theory = erlangC(lambda, 60 / svc, c);
  const unstable = theory.rho >= 1;

  const seriesMax = Math.max(4, ...view.series.map((p) => p.q), Number.isFinite(theory.lq) ? theory.lq : 0) * 1.15;
  const t0 = view.series[0]?.t ?? 0;
  const span = Math.max(60, (view.series[view.series.length - 1]?.t ?? 0) - t0);
  const cx = (t: number) => 34 + ((t - t0) / span) * (W - 44);
  const cy = (q: number) => 110 - (q / seriesMax) * 96;
  const line = view.series.map((p, i) => `${i ? "L" : "M"}${cx(p.t).toFixed(1)} ${cy(p.q).toFixed(1)}`).join("");

  const queuePos = (i: number) => ({ x: SX - 70 - i * 16, y: QY });

  return (
    <div className="lab-experiment" ref={rootRef}>
      <div className="lab-controls">
        <Range label="Arrivals per hour (λ)" value={lambda} min={2} max={40} onChange={(v) => { setLambda(v); reset(v, c); }} />
        <Range label="Clinicians on shift · c" value={c} min={1} max={6} onChange={(v) => { setC(v); reset(lambda, v); }} />
        <Range label="Mean consult time" value={svc} min={4} max={40} display={`${svc} min`} onChange={(v) => { setSvc(v); reset(lambda, c); }} />
        <div className="lab-seg" role="group" aria-label="Simulation speed">
          {speeds.map((s) => <button key={s} aria-pressed={speed === s} onClick={() => setSpeed(s)}>{s}×</button>)}
        </div>
        <div className="lab-buttons">
          <button className="lab-btn lab-btn-gold" onClick={() => setRunning(!running)}>{running && !reduced ? "Pause" : "Run"}</button>
          <button className="lab-btn" onClick={fastForward}>Skip ahead 8 hours</button>
          <button className="lab-btn" onClick={() => reset()}>Reset</button>
        </div>
        {reduced && <p className="lab-hint">Animation is off because your device prefers reduced motion — use “Skip ahead” to simulate.</p>}
        {unstable && <p className="lab-warn" role="alert">ρ = {theory.rho.toFixed(2)} ≥ 1: patients arrive faster than clinicians can see them, so the queue will grow without limit.</p>}
        <TryThis items={["Set utilization near 0.9 and watch waits explode — queues are non-linear.", "Add one clinician at λ = 20 and compare the theoretical wait before and after."]} />
      </div>

      <div className="lab-stage">
        <svg className="lab-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Clinic simulation at ${fmtClock(view.t)}: ${view.queueLen} waiting, ${view.servers.filter(Boolean).length} of ${c} clinicians busy.`}>
          <text className="lab-zone" x="24" y="34">ARRIVALS</text>
          <text className="lab-zone" x={SX - 70} y="34" textAnchor="end">WAITING ROOM</text>
          <text className="lab-zone" x={SX + 24} y="34" textAnchor="middle">CLINICIANS</text>
          <text className="lab-zone" x="576" y="34" textAnchor="end">DISCHARGED</text>
          <path className="lab-lane" d={`M24 ${QY} H${SX - 50}`} />
          <text className="lab-clock" x="24" y={H - 12}>{fmtClock(view.t)} · day 1</text>
          {view.servers.map((s, k) => (
            <g key={k} transform={`translate(${SX} ${serverY(k, view.servers.length)})`}>
              <rect className={`lab-server ${s ? "is-busy" : ""}`} x="0" y="-13" width="48" height="26" rx="6" />
              <rect className="lab-progress" x="4" y="9" width={s ? 40 * s.frac : 0} height="2" rx="1" />
            </g>
          ))}
          {view.queue.map((id, i) => {
            const p = queuePos(i);
            return <circle key={id} className="lab-patient" r="5.5" style={{ transform: `translate(${p.x}px, ${p.y}px)` }} />;
          })}
          {view.servers.map((s, k) => s && (
            <circle key={s.id} className="lab-patient is-seen" r="5.5" style={{ transform: `translate(${SX + 24}px, ${serverY(k, view.servers.length)}px)` }} />
          ))}
          {view.exits.map((e) => (
            <circle key={`x${e.id}`} className="lab-patient is-exit" r="5" style={{ ["--x0" as string]: `${SX + 24}px`, ["--y0" as string]: `${serverY(e.k, view.servers.length)}px` }} />
          ))}
          {view.queueLen > SHOWN_QUEUE && <text className="lab-overflow" x={queuePos(SHOWN_QUEUE).x + 4} y={QY + 4} textAnchor="end">+{view.queueLen - SHOWN_QUEUE}</text>}
        </svg>

        <dl className="lab-kpis lab-kpis-4">
          <Kpi label="Avg wait (sim)" value={`${view.avgWait.toFixed(1)} min`} sub={`Theory: ${Number.isFinite(theory.wq) ? `${theory.wq.toFixed(1)} min` : "∞"}`} tone={unstable ? "bad" : undefined} />
          <Kpi label="Waiting now" value={view.queueLen} sub={`Avg ${view.avgQ.toFixed(1)} · theory ${Number.isFinite(theory.lq) ? theory.lq.toFixed(1) : "∞"}`} />
          <Kpi label="Utilization" value={`${(Math.min(view.util, 1) * 100).toFixed(0)}%`} sub={`ρ = λ / cμ = ${theory.rho.toFixed(2)}`} tone={unstable ? "bad" : undefined} />
          <Kpi label="Patients seen" value={view.served} sub={`P(wait) theory ${(Math.min(1, theory.pWait) * 100).toFixed(0)}%`} />
        </dl>

        <svg className="lab-svg lab-chart" viewBox={`0 0 ${W} 128`} role="img" aria-label="Queue length over simulated time, with the Erlang-C average as a dashed line.">
          <text className="lab-axis" x="4" y="18">{Math.round(seriesMax)}</text>
          <text className="lab-axis" x="4" y="112">0</text>
          <path className="lab-chart-base" d={`M34 110 H${W - 10}`} />
          {Number.isFinite(theory.lq) && <path className="lab-chart-theory" d={`M34 ${cy(theory.lq).toFixed(1)} H${W - 10}`} />}
          {line && <path className="lab-chart-line" d={line} />}
          <text className="lab-axis" x={W - 10} y="124" textAnchor="end">patients waiting over time · dashed = Erlang-C average</text>
        </svg>
      </div>

      <Why>Healthcare systems modeling and queueing analysis run through my graduate coursework and my healthcare patient-flow project — this is the same M/M/c logic, made visible.</Why>
    </div>
  );
}
