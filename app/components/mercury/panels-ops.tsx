"use client";

import { useState } from "react";
import { PRODUCTS } from "./synthetic";
import { BATCH, BOM, MRP_WEEKS, type Action, type Results, type Scenario } from "./models";
import { Chip, fmt, niceTicks, Panel, pct, scale, Slider, Stat, Toggle } from "./ui";

/* ───────────────────────── 4. Production planning ───────────────────────── */

const PW = 720, PH = 240, PP = { l: 44, r: 12, t: 18, b: 28 };

export function ProductionPanel({ prod, overtime, setOvertime }: { prod: Results["prod"]; overtime: boolean; setOvertime: (v: boolean) => void }) {
  const n = prod.weeks.length;
  const maxY = Math.max(prod.cap + prod.otCap, ...prod.weeks.map((w) => Math.max(w.required, w.produced))) * 1.15;
  const y = scale(0, maxY, PH - PP.b, PP.t);
  const slot = (PW - PP.l - PP.r) / n;
  const bx = (i: number) => PP.l + i * slot;
  const bw = slot * 0.32;

  return (
    <Panel
      intro="Schedule whole batches of three fictional products into weekly capacity. Unmet requirement carries forward as backlog."
      controls={<>
        <Toggle label="Allow overtime (+15% capacity)" checked={overtime} onChange={setOvertime} />
        <p className="mc-note">Change base capacity, demand, or lead time in <strong>Scenario exploration</strong> — this plan updates instantly.</p>
        <table className="mc-table mc-mini">
          <caption>Batch sizes</caption>
          <tbody>{PRODUCTS.map((p, i) => <tr key={p}><th scope="row">{p}</th><td>{BATCH[i]} units</td></tr>)}</tbody>
        </table>
      </>}
    >
      <dl className="mc-stats">
        <Stat label="Capacity / week" value={fmt(prod.cap)} sub={prod.otCap ? `+ ${fmt(prod.otCap)} overtime` : "no overtime"} />
        <Stat label="Utilization" value={pct(prod.utilization, 0)} tone={prod.utilization > 1 ? "bad" : prod.utilization > 0.92 ? "warn" : "good"} />
        <Stat label="Overtime weeks" value={String(prod.overtimeWeeks)} />
        <Stat label="Backlog at week 12" value={fmt(prod.backlogEnd)} tone={prod.backlogEnd ? "bad" : "good"} />
      </dl>
      <div className="mc-chart-wrap">
        <svg className="mc-chart" viewBox={`0 0 ${PW} ${PH}`} role="img" aria-label={`12-week plan: capacity ${prod.cap} per week, backlog ${prod.backlogEnd} units at the end.`}>
          {niceTicks(maxY / 1.15).map((v) => <g key={v}><line className="mc-grid" x1={PP.l} x2={PW - PP.r} y1={y(v)} y2={y(v)} /><text className="mc-axis" x={PP.l - 8} y={y(v) + 4} textAnchor="end">{v}</text></g>)}
          {prod.weeks.map((w, i) => (
            <g key={w.week}>
              <rect className="mc-bar-demand" x={bx(i) + slot / 2 - bw - 1} y={y(w.required)} width={bw} height={y(0) - y(w.required)} rx="1.5" />
              <rect className={w.overtime ? "mc-bar-gold mc-bar-ot" : "mc-bar-gold"} x={bx(i) + slot / 2 + 1} y={y(w.produced)} width={bw} height={y(0) - y(w.produced)} rx="1.5" />
              {w.backlog > 0 && <text className="mc-backlog" x={bx(i) + slot / 2} y={y(Math.max(w.required, w.produced)) - 6} textAnchor="middle">−{w.backlog}</text>}
              <text className="mc-axis" x={bx(i) + slot / 2} y={PH - 8} textAnchor="middle">W{w.week}</text>
            </g>
          ))}
          <line className="mc-rop" x1={PP.l} x2={PW - PP.r} y1={y(prod.cap)} y2={y(prod.cap)} />
          <text className="mc-rop-label" x={PW - PP.r} y={y(prod.cap) - 6} textAnchor="end">capacity</text>
          {prod.otCap > 0 && <line className="mc-ot-line" x1={PP.l} x2={PW - PP.r} y1={y(prod.cap + prod.otCap)} y2={y(prod.cap + prod.otCap)} />}
        </svg>
      </div>
      <ul className="mc-legend">
        <li><i className="mc-lg-demand" />Requirement</li>
        <li><i className="mc-lg-gold-bar" />Scheduled production</li>
        <li><i className="mc-lg-ot" />Uses overtime</li>
        <li><span className="mc-backlog-key">−n</span>Backlog carried</li>
      </ul>
      <div className="mc-table-wrap">
        <table className="mc-gantt" aria-label="Batches scheduled per product and week">
          <thead><tr><th scope="col">Product</th>{prod.weeks.map((w) => <th key={w.week} scope="col">W{w.week}</th>)}</tr></thead>
          <tbody>{PRODUCTS.map((p, pi) => (
            <tr key={p}>
              <th scope="row">{p}</th>
              {prod.weeks.map((w) => (
                <td key={w.week} title={`${w.batches[pi]} batch${w.batches[pi] === 1 ? "" : "es"}`}>
                  <span className="mc-batches">{Array.from({ length: w.batches[pi] }, (_, k) => <i key={k} className={`mc-batch mc-batch-${pi}`} />)}</span>
                </td>
              ))}
            </tr>
          ))}</tbody>
        </table>
      </div>
    </Panel>
  );
}

/* ───────────────────────── 5. Lot-expiration awareness ───────────────────────── */

const LW = 720, LP = { l: 70, r: 14, t: 24, b: 26 }, ROW = 22;
const lotTone = { Expired: "bad", "At risk": "warn", Watch: "info", "On track": "good" } as const;

export function LotsPanel({ lot }: { lot: Results["lot"] }) {
  const [focus, setFocus] = useState<string | null>(null);
  const rows = lot.rows;
  const LH = LP.t + rows.length * ROW + LP.b;
  const x = scale(-24, 30, LP.l, LW - LP.r);
  const selected = rows.find((r) => r.id === focus);

  return (
    <Panel intro={`Synthetic lots allocated first-expiry-first-out against ${lot.horizon} weeks of demand. Anything still on the shelf at its expiry date is flagged.`}>
      <dl className="mc-stats">
        <Stat label="Lots tracked" value={String(rows.length)} />
        <Stat label="Units projected to expire" value={fmt(lot.atRiskUnits)} tone={lot.atRiskUnits ? "warn" : "good"} />
        <Stat label="Lots already expired" value={String(rows.filter((r) => r.status === "Expired").length)} />
        <Stat label="Weekly demand covered" value={lot.weekly.map(fmt).join(" / ")} sub="A / B / C" />
      </dl>
      <div className="mc-chart-wrap">
        <svg className="mc-chart" viewBox={`0 0 ${LW} ${LH}`} role="img" aria-label="Timeline of each lot from manufacture to expiry, with the allocation horizon shaded.">
          <rect className="mc-hold-zone" x={x(0)} y={LP.t - 8} width={x(lot.horizon) - x(0)} height={rows.length * ROW + 8} />
          {[-24, -16, -8, 0, 8, 16, 24].map((w) => (
            <g key={w}><line className="mc-grid" x1={x(w)} x2={x(w)} y1={LP.t - 8} y2={LH - LP.b} /><text className="mc-axis" x={x(w)} y={LH - 8} textAnchor="middle">{w === 0 ? "now" : w > 0 ? `+${w}w` : `${w}w`}</text></g>
          ))}
          <line className="mc-today" x1={x(0)} x2={x(0)} y1={LP.t - 8} y2={LH - LP.b} />
          {rows.map((r, i) => {
            const y0 = LP.t + i * ROW;
            const tone = lotTone[r.status as keyof typeof lotTone];
            return (
              <g key={r.id} className={`mc-lot mc-lot-${tone} ${focus === r.id ? "on" : ""}`} onClick={() => setFocus(focus === r.id ? null : r.id)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setFocus(focus === r.id ? null : r.id)} tabIndex={0} role="button" aria-label={`Lot ${r.id}, ${PRODUCTS[r.product]}, ${r.status}, expires week ${r.expiry}`}>
                <text className="mc-axis mc-lot-id" x={LP.l - 8} y={y0 + 14} textAnchor="end">{r.id}</text>
                <rect className="mc-lot-bar" x={x(Math.max(-24, r.mfgWeek))} y={y0 + 4} width={Math.max(2, x(Math.min(30, r.expiry)) - x(Math.max(-24, r.mfgWeek)))} height={ROW - 8} rx="3" />
                <circle className="mc-lot-end" cx={x(Math.min(30, r.expiry))} cy={y0 + ROW / 2} r="4" />
              </g>
            );
          })}
        </svg>
      </div>
      <ul className="mc-legend">
        <li><Chip tone="good">On track</Chip></li><li><Chip tone="info">Watch · expires ≤ 4 wk</Chip></li><li><Chip tone="warn">At risk</Chip></li><li><Chip tone="bad">Expired</Chip></li>
        <li><i className="mc-lg-zone" />Allocation horizon</li>
      </ul>
      {selected && (
        <p className="mc-callout" aria-live="polite">
          <strong>{selected.id}</strong> · {PRODUCTS[selected.product]} · {fmt(selected.qty)} units made in week {selected.mfgWeek}, shelf life {selected.shelfLife} weeks →
          expires week {selected.expiry}. FEFO allocates {fmt(selected.allocated)}; {selected.expiredQty ? `${fmt(selected.expiredQty)} projected to expire.` : "nothing projected to expire."}
        </p>
      )}
      <div className="mc-table-wrap">
        <table className="mc-table">
          <thead><tr><th scope="col">Lot</th><th scope="col">Product</th><th scope="col">Quantity</th><th scope="col">Made</th><th scope="col">Expires</th><th scope="col">Allocated</th><th scope="col">Projected expiry</th><th scope="col">Status</th></tr></thead>
          <tbody>{[...rows].sort((a, b) => a.expiry - b.expiry).map((r) => (
            <tr key={r.id} className={focus === r.id ? "mc-row-on" : undefined}>
              <th scope="row">{r.id}</th><td>{PRODUCTS[r.product]}</td><td>{fmt(r.qty)}</td><td>W{r.mfgWeek}</td><td>{r.expiry > 0 ? `W+${r.expiry}` : `W${r.expiry}`}</td><td>{fmt(r.allocated)}</td><td>{fmt(r.expiredQty)}</td>
              <td><Chip tone={lotTone[r.status as keyof typeof lotTone]}>{r.status}</Chip></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </Panel>
  );
}

/* ───────────────────────── 6. Material requirements planning ───────────────────────── */

export function MrpPanel({ plan, mps, setMps, resetMps }: { plan: Results["plan"]; mps: number[]; setMps: (m: number[]) => void; resetMps: () => void }) {
  const [item, setItem] = useState(BOM[0].id);
  const rec = plan.find((p) => p.item.id === item)!;
  const rowsDef: [string, number[]][] = [
    ["Gross requirements", rec.gross], ["Scheduled receipts", rec.receipts], ["Projected on hand", rec.poh],
    ["Net requirements", rec.net], ["Planned order receipts", rec.por], ["Planned order releases", rec.release],
  ];

  return (
    <Panel
      intro="Edit the master production schedule and watch requirements explode through a fictional two-level bill of materials (lot-for-lot, lead-time offset)."
      controls={<>
        <p className="mc-subhead">Master production schedule · Product A</p>
        <div className="mc-mps">
          {mps.map((q, w) => (
            <label key={w}><span>W{w + 1}</span>
              <input type="number" min={0} max={999} step={10} value={q} onChange={(e) => { const next = [...mps]; next[w] = Math.max(0, Math.min(999, Number(e.target.value) || 0)); setMps(next); }} />
            </label>
          ))}
        </div>
        <button className="mc-link" onClick={resetMps}>Reset schedule</button>
        <p className="mc-subhead">Bill of materials</p>
        <ul className="mc-bom" role="list">
          {BOM.map((b) => {
            const p = plan.find((x) => x.item.id === b.id)!;
            return (
              <li key={b.id} style={{ paddingLeft: `${b.level * 18}px` }}>
                <button className={item === b.id ? "on" : ""} onClick={() => setItem(b.id)} aria-pressed={item === b.id}>
                  <span>{b.level > 0 && "└ "}{b.name}</span>
                  <small>{b.parent ? `×${b.qtyPer} · ` : ""}LT {p.lead} wk{p.pastDue > 0 ? " · past due" : ""}</small>
                </button>
              </li>
            );
          })}
        </ul>
      </>}
    >
      <dl className="mc-stats">
        <Stat label="Item" value={rec.item.id} sub={rec.item.name} />
        <Stat label="Lead time" value={`${rec.lead} wk`} sub={rec.item.purchased ? "purchased" : "made in-house"} />
        <Stat label="Planned orders" value={String(rec.por.filter((q) => q > 0).length)} />
        <Stat label="Past due" value={fmt(rec.pastDue)} tone={rec.pastDue ? "bad" : "good"} sub={rec.pastDue ? "release before week 1" : "on time"} />
      </dl>
      <div className="mc-table-wrap">
        <table className="mc-table mc-mrp">
          <caption>MRP record · {rec.item.name} · on hand {fmt(rec.item.onHand)}</caption>
          <thead><tr><th scope="col">Week</th>{Array.from({ length: MRP_WEEKS }, (_, w) => <th key={w} scope="col">{w + 1}</th>)}</tr></thead>
          <tbody>{rowsDef.map(([label, vals]) => (
            <tr key={label} className={label.startsWith("Planned order releases") ? "mc-row-gold" : label.startsWith("Net") ? "mc-row-net" : undefined}>
              <th scope="row">{label}</th>
              {vals.map((v, w) => <td key={w} className={v < 0 ? "mc-neg" : v === 0 ? "mc-zero" : undefined}>{v ? fmt(v) : "·"}</td>)}
            </tr>
          ))}</tbody>
        </table>
      </div>
      <p className="mc-note">Select a component in the bill of materials to see its record. Gross requirements for each component are its parent’s planned releases × quantity per.</p>
    </Panel>
  );
}

/* ───────────────────────── 7. Shipping & operational visibility ───────────────────────── */

const SW = 720, SP = { l: 64, r: 14, t: 22, b: 26 }, SROW = 24;
const shipTone = { Delivered: "good", "In transit": "info", Delayed: "bad", Planned: "muted" } as const;

export function ShippingPanel({ ship }: { ship: Results["ship"] }) {
  const [filter, setFilter] = useState<"All" | keyof typeof shipTone>("All");
  const rows = ship.rows.filter((r) => filter === "All" || r.status === filter);
  const SH = SP.t + Math.max(1, rows.length) * SROW + SP.b;
  const x = scale(-14, 22, SP.l, SW - SP.r);
  const count = (s: string) => ship.rows.filter((r) => r.status === s).length;

  return (
    <Panel intro="Fictional shipments from four sites to six regions — planned transit against projected arrival, relative to today.">
      <dl className="mc-stats">
        <Stat label="On-time (projected)" value={pct(ship.onTime, 0)} tone={ship.onTime >= 0.9 ? "good" : ship.onTime >= 0.75 ? "warn" : "bad"} />
        <Stat label="In transit" value={String(count("In transit") + count("Delayed"))} />
        <Stat label="Delayed" value={String(count("Delayed"))} tone={count("Delayed") ? "bad" : "good"} />
        <Stat label="Delivered" value={String(count("Delivered"))} />
      </dl>
      <div className="mc-status-row" role="group" aria-label="Filter shipments">
        {(["All", "Planned", "In transit", "Delayed", "Delivered"] as const).map((s) => (
          <button key={s} className={`mc-pill ${s !== "All" ? `mc-pill-${shipTone[s]}` : ""} ${filter === s ? "on" : ""}`} onClick={() => setFilter(s)}>{s}{s !== "All" && ` · ${count(s)}`}</button>
        ))}
      </div>
      <div className="mc-chart-wrap">
        <svg className="mc-chart" viewBox={`0 0 ${SW} ${SH}`} role="img" aria-label="Shipment timeline in days relative to today.">
          {[-14, -7, 0, 7, 14, 21].map((d) => <g key={d}><line className="mc-grid" x1={x(d)} x2={x(d)} y1={SP.t - 8} y2={SH - SP.b} /><text className="mc-axis" x={x(d)} y={SH - 8} textAnchor="middle">{d === 0 ? "today" : d > 0 ? `+${d}d` : `${d}d`}</text></g>)}
          <line className="mc-today" x1={x(0)} x2={x(0)} y1={SP.t - 8} y2={SH - SP.b} />
          {rows.map((r, i) => {
            const y0 = SP.t + i * SROW;
            return (
              <g key={r.id} className={`mc-ship mc-ship-${shipTone[r.status as keyof typeof shipTone]}`}>
                <title>{`${r.id}: ${r.from} → ${r.to}, ${r.units} units of ${PRODUCTS[r.product]} — ${r.status}`}</title>
                <text className="mc-axis" x={SP.l - 8} y={y0 + 15} textAnchor="end">{r.id}</text>
                <rect className="mc-ship-bar" x={x(r.shipDay)} y={y0 + 5} width={Math.max(2, x(r.plannedEta) - x(r.shipDay))} height={SROW - 10} rx="3" />
                {r.late > 0 && <rect className="mc-ship-late" x={x(r.plannedEta)} y={y0 + 5} width={x(r.eta) - x(r.plannedEta)} height={SROW - 10} rx="3" />}
                <text className="mc-ship-label" x={x(r.eta) + 6} y={y0 + 15}>{r.to}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <ul className="mc-legend">
        <li><i className="mc-lg-ship" />Planned transit</li>
        <li><i className="mc-lg-late" />Projected delay</li>
      </ul>
      <div className="mc-table-wrap">
        <table className="mc-table">
          <thead><tr><th scope="col">Shipment</th><th scope="col">Lane</th><th scope="col">Product</th><th scope="col">Units</th><th scope="col">Ships</th><th scope="col">ETA</th><th scope="col">Status</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id}>
              <th scope="row">{r.id}</th><td>{r.from.replace("Site ", "")} → {r.to}</td><td>{PRODUCTS[r.product]}</td><td>{fmt(r.units)}</td>
              <td>{r.shipDay === 0 ? "today" : r.shipDay > 0 ? `+${r.shipDay}d` : `${r.shipDay}d`}</td>
              <td>{r.eta === 0 ? "today" : r.eta > 0 ? `+${r.eta}d` : `${r.eta}d`}{r.late > 0 && <small className="mc-late"> (+{r.late}d)</small>}</td>
              <td><Chip tone={shipTone[r.status as keyof typeof shipTone]}>{r.status}</Chip></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </Panel>
  );
}

/* ───────────────────────── 8. Scenario exploration ───────────────────────── */

type Kpis = Results["kpis"];
const KPI_ROWS: { key: keyof Kpis; label: string; fmt: (v: number) => string; better: "up" | "down" }[] = [
  { key: "fillRate", label: "Reorder fill rate", fmt: (v) => pct(v), better: "up" },
  { key: "atRisk", label: "SKU-sites at stockout risk", fmt: (v) => String(v), better: "down" },
  { key: "expiring", label: "Units projected to expire", fmt, better: "down" },
  { key: "utilization", label: "Capacity utilization", fmt: (v) => pct(v, 0), better: "down" },
  { key: "backlog", label: "Production backlog (wk 12)", fmt, better: "down" },
  { key: "onTime", label: "On-time shipments", fmt: (v) => pct(v, 0), better: "up" },
  { key: "pastDue", label: "Past-due MRP items", fmt: (v) => String(v), better: "down" },
];

export function ScenarioPanel({ sc, setSc, base, now, actions }: { sc: Scenario; setSc: (s: Scenario) => void; base: Kpis; now: Kpis; actions: [number, number] }) {
  const set = (k: keyof Scenario) => (v: number) => setSc({ ...sc, [k]: v });
  const presets: { label: string; s: Scenario }[] = [
    { label: "Demand surge", s: { demand: 35, lead: 0, capacity: 0, shelf: 0 } },
    { label: "Supplier disruption", s: { demand: 0, lead: 3, capacity: -10, shelf: 0 } },
    { label: "Shorter shelf life", s: { demand: 0, lead: 0, capacity: 0, shelf: -5 } },
    { label: "Perfect storm", s: { demand: 25, lead: 2, capacity: -20, shelf: -3 } },
  ];
  return (
    <Panel
      intro="Pull the levers. Every module — inventory, reorder, production, lots, MRP, and shipping — re-plans against the scenario, compared with the baseline."
      controls={<>
        <Slider label="Demand shock" value={sc.demand} min={-40} max={60} step={5} format={(v) => `${v > 0 ? "+" : ""}${v}%`} onChange={set("demand")} />
        <Slider label="Supplier lead-time change" value={sc.lead} min={-1} max={4} format={(v) => `${v > 0 ? "+" : ""}${v} wk`} onChange={set("lead")} />
        <Slider label="Production capacity change" value={sc.capacity} min={-40} max={40} step={5} format={(v) => `${v > 0 ? "+" : ""}${v}%`} onChange={set("capacity")} />
        <Slider label="Shelf-life change" value={sc.shelf} min={-8} max={8} format={(v) => `${v > 0 ? "+" : ""}${v} wk`} onChange={set("shelf")} />
        <p className="mc-subhead">Presets</p>
        <div className="mc-presets">
          {presets.map((p) => <button key={p.label} className="mc-pill" onClick={() => setSc(p.s)}>{p.label}</button>)}
        </div>
        <button className="mc-link" onClick={() => setSc({ demand: 0, lead: 0, capacity: 0, shelf: 0 })}>Reset to baseline</button>
      </>}
    >
      <div className="mc-table-wrap">
        <table className="mc-table mc-compare">
          <thead><tr><th scope="col">Measure</th><th scope="col">Baseline</th><th scope="col">Scenario</th><th scope="col">Change</th></tr></thead>
          <tbody>
            {KPI_ROWS.map((k) => {
              const a = base[k.key], b = now[k.key];
              const diff = b - a;
              const good = diff === 0 ? null : (diff > 0) === (k.better === "up");
              return (
                <tr key={k.key}>
                  <th scope="row">{k.label}</th><td>{k.fmt(a)}</td><td><strong>{k.fmt(b)}</strong></td>
                  <td className={good == null ? "mc-zero" : good ? "mc-up" : "mc-down"}>{diff === 0 ? "—" : `${good ? "▲" : "▼"} ${k.key === "fillRate" || k.key === "utilization" || k.key === "onTime" ? `${(Math.abs(diff) * 100).toFixed(1)} pts` : fmt(Math.abs(diff))}`}</td>
                </tr>
              );
            })}
            <tr><th scope="row">Recommended actions</th><td>{actions[0]}</td><td><strong>{actions[1]}</strong></td><td className={actions[1] > actions[0] ? "mc-down" : actions[1] < actions[0] ? "mc-up" : "mc-zero"}>{actions[1] === actions[0] ? "—" : `${actions[1] > actions[0] ? "▼ +" : "▲ −"}${Math.abs(actions[1] - actions[0])}`}</td></tr>
          </tbody>
        </table>
      </div>
      <p className="mc-note">▲ means the scenario is better than baseline on that measure; ▼ means worse. Demand shock scales every synthetic demand stream; lead-time change applies to purchased items, replenishment, and transit; capacity applies to production; shelf life applies to every lot.</p>
    </Panel>
  );
}

/* ───────────────────────── 9. Decision-assist actions ───────────────────────── */

const sevTone = { High: "bad", Medium: "warn", Low: "info" } as const;

export function ActionsPanel({ actions, open }: { actions: Action[]; open: (tab: string) => void }) {
  const [done, setDone] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setDone((d) => { const n = new Set(d); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const remaining = actions.filter((a) => !done.has(a.id)).length;
  return (
    <Panel intro="Decision-assist, not autopilot: every suggestion below is generated from a simple, visible rule applied to the other modules — and the planner decides.">
      <dl className="mc-stats">
        <Stat label="Open actions" value={String(remaining)} tone={remaining ? "warn" : "good"} />
        <Stat label="High priority" value={String(actions.filter((a) => a.severity === "High" && !done.has(a.id)).length)} />
        <Stat label="Modules involved" value={String(new Set(actions.map((a) => a.module)).size)} />
        <Stat label="Reviewed" value={String(actions.length - remaining)} />
      </dl>
      {actions.length === 0 && <p className="mc-callout">No rules are triggered in this scenario. Try a preset in Scenario exploration.</p>}
      <ol className="mc-actions">
        {actions.map((a) => (
          <li key={a.id} className={done.has(a.id) ? "is-done" : undefined}>
            <div className="mc-action-head">
              <Chip tone={sevTone[a.severity]}>{a.severity}</Chip>
              <span className="mc-action-module">{a.module}</span>
            </div>
            <strong>{a.title}</strong>
            <p><span>Why: </span>{a.why}</p>
            <div className="mc-action-btns">
              <button className="mc-link" onClick={() => open(a.tab)}>Open {a.module} →</button>
              <button className="mc-link" onClick={() => toggle(a.id)} aria-pressed={done.has(a.id)}>{done.has(a.id) ? "Reopen" : "Mark reviewed ✓"}</button>
            </div>
          </li>
        ))}
      </ol>
    </Panel>
  );
}
