"use client";

import { useState } from "react";
import {
  FACTOR_LABELS, MODELS, MONTHS, PROCESS, REGION_NAMES, SEGMENTS, SPLITS, TODAY, WASTE_REASONS,
  type bakeoff, type churn, type ChurnWeights, type consolidate, type monitor, type MonitorSettings, type network,
  type Segment, type segment, type SegThresholds, type Split, type waste,
} from "./customers";
import { Chip, Panel, Slider, Stat, fmt, niceTicks, pct, scale } from "./ui";

const SEG_TONE: Record<Segment, "good" | "info" | "warn" | "bad" | "muted"> = { Stable: "good", Rising: "info", Declining: "warn", Inconsistent: "bad", Sporadic: "muted" };
const spark = (y: number[], w: number, h: number) => {
  const max = Math.max(1, ...y), x = scale(0, y.length - 1, 0, w), v = scale(0, max, h, 2);
  return y.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${v(p).toFixed(1)}`).join("");
};
const day = (d: number) => (d === TODAY ? "today" : d < TODAY ? `${TODAY - d} d ago` : `in ${d - TODAY} d`);

/* ───────────────────────── Model bake-off ───────────────────────── */

export function BakeoffPanel({ b, split, setSplit }: { b: ReturnType<typeof bakeoff>; split: Split; setSplit: (s: Split) => void }) {
  const [pick, setPick] = useState(0);
  const row = b.rows[Math.min(pick, b.rows.length - 1)];
  const W = 720, H = 240, P = { l: 40, r: 14, t: 14, b: 26 };
  const y = [...row.train, ...row.test];
  const max = Math.max(...y, ...row.scores.flatMap((s) => s.forecast)) * 1.1;
  const x = scale(0, y.length - 1, P.l, W - P.r), v = scale(0, max, H - P.b, P.t);
  const best = row.scores.find((s) => s.model === row.best)!;
  return (
    <Panel
      intro="Seven textbook forecasting models compete on each fictional account: fit on the training months, then scored on test months they never saw. Watch how the winner changes from account to account."
      controls={<>
        <div className="mc-field"><span className="mc-field-label">Train / test split (months)</span>
          <div className="mc-pills" role="group" aria-label="Train and test split">
            {SPLITS.map((s) => <button key={s.train} className={`mc-pill ${s.train === split.train ? "on" : ""}`} aria-pressed={s.train === split.train} onClick={() => setSplit(s)}>{s.train} / {s.test}</button>)}
          </div>
        </div>
        <div className="mc-field"><span className="mc-field-label">Account</span>
          <div className="mc-pills" role="group" aria-label="Account">
            {b.rows.map((r, i) => <button key={r.account.id} className={`mc-pill ${i === pick ? "on" : ""}`} aria-pressed={i === pick} onClick={() => setPick(i)}>{r.account.id.replace("Account ", "#")}</button>)}
          </div>
        </div>
        <p className="mc-callout"><strong>{b.distinctWinners} different models</strong> win across {b.rows.length} accounts, and {b.unreliable} account{b.unreliable === 1 ? "" : "s"} still miss by more than 20% MAPE with the best model. No single model is reliable enough to drive production directly, which is why the demo pivots to <em>monitoring</em>.</p>
      </>}
    >
      <dl className="mc-stats">
        <Stat label="Best model here" value={MODELS.find((m) => m.id === row.best)!.label.split(" (")[0]} />
        <Stat label="Best MAPE" value={pct(row.bestMape)} tone={row.bestMape > 0.2 ? "warn" : "good"} />
        <Stat label="Best MAE" value={fmt(best.mae)} sub="units / month" />
        <Stat label="Distinct winners" value={`${b.distinctWinners} of 7`} />
      </dl>
      <div className="mc-chart-wrap">
        <svg className="mc-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${row.account.id}: actual monthly demand with the forecasts of all seven models over the test months.`}>
          {niceTicks(max).map((t) => <g key={t}><line className="mc-grid" x1={P.l} x2={W - P.r} y1={v(t)} y2={v(t)} /><text className="mc-axis" x={P.l - 6} y={v(t) + 3} textAnchor="end">{fmt(t)}</text></g>)}
          <rect className="mc-hold-zone" x={x(split.train - 0.5)} y={P.t} width={x(y.length - 1) - x(split.train - 0.5)} height={H - P.t - P.b} />
          <text className="mc-axis" x={x(split.train - 0.5) + 6} y={P.t + 12}>test</text>
          {row.scores.filter((s) => s.model !== row.best).map((s) => (
            <path key={s.model} className="mc-bo-other" d={[row.train[row.train.length - 1], ...s.forecast].map((p, i) => `${i ? "L" : "M"}${x(split.train - 1 + i).toFixed(1)} ${v(p).toFixed(1)}`).join("")} />
          ))}
          <path className="mc-line-ivory" d={y.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${v(p).toFixed(1)}`).join("")} />
          <path className="mc-line-gold mc-thick" d={[row.train[row.train.length - 1], ...best.forecast].map((p, i) => `${i ? "L" : "M"}${x(split.train - 1 + i).toFixed(1)} ${v(p).toFixed(1)}`).join("")} />
        </svg>
      </div>
      <ul className="mc-legend"><li><i className="mc-lg-ivory" />Synthetic actuals</li><li><i className="mc-lg-gold" />Best model</li><li><i className="mc-lg-dash" />Other six models</li></ul>
      <div className="mc-table-wrap">
        <table className="mc-table mc-league">
          <caption>Test-period MAPE by account (lower is better)</caption>
          <thead><tr><th scope="col">Account</th>{MODELS.map((m) => <th key={m.id} scope="col" title={m.label}>{m.label.split(" (")[0].split(",")[0]}</th>)}</tr></thead>
          <tbody>{b.rows.map((r, i) => (
            <tr key={r.account.id} className={i === pick ? "mc-row-on" : undefined} onClick={() => setPick(i)}>
              <th scope="row">{r.account.id}</th>
              {r.scores.map((s) => <td key={s.model} className={s.model === r.best ? "mc-row-gold" : undefined}>{pct(s.mape, 0)}</td>)}
            </tr>
          ))}</tbody>
          <tfoot><tr><th scope="row">Wins</th>{b.wins.map((w) => <td key={w.model}>{w.wins}</td>)}</tr></tfoot>
        </table>
      </div>
    </Panel>
  );
}

/* ───────────────────────── Account segmentation ───────────────────────── */

export function SegmentsPanel({ seg, th, setTh }: { seg: ReturnType<typeof segment>; th: SegThresholds; setTh: (t: SegThresholds) => void }) {
  const [focus, setFocus] = useState(seg[0]?.account.id ?? "");
  const sel = seg.find((s) => s.account.id === focus) ?? seg[0];
  const W = 640, H = 300, P = { l: 46, r: 16, t: 14, b: 34 };
  const x = scale(0, 150, P.l, W - P.r), y = scale(-60, 60, H - P.b, P.t);
  const cx = (v: number) => x(Math.min(150, v)), cy = (v: number) => y(Math.max(-60, Math.min(60, v)));
  const counts = SEGMENTS.map((s) => seg.filter((a) => a.segment === s).length);
  return (
    <Panel
      intro="Five years of synthetic monthly orders per fictional account, summarised by variability (coefficient of variation, CV%) and trend (% change per year). Move the thresholds and watch accounts change segment."
      controls={<>
        <Slider label="Inconsistent if CV% ≥" value={th.cv} min={20} max={120} step={5} unit="%" onChange={(cv) => setTh({ ...th, cv })} />
        <Slider label="Rising / declining if |trend| ≥" value={th.trend} min={4} max={40} unit="%/yr" onChange={(trend) => setTh({ ...th, trend })} />
        <Slider label="Sporadic if zero-order months ≥" value={th.zeros} min={10} max={70} step={5} unit="%" onChange={(zeros) => setTh({ ...th, zeros })} />
        <ul className="mc-seg-list">{SEGMENTS.map((s, i) => <li key={s}><Chip tone={SEG_TONE[s]}>{s}</Chip><strong>{counts[i]}</strong></li>)}</ul>
        <p className="mc-note">Segment names are illustrative labels for this demo.</p>
      </>}
    >
      <div className="mc-chart-wrap">
        <svg className="mc-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Scatter plot of accounts by variability and trend, with segment thresholds.">
          <rect className="mc-seg-zone mc-seg-bad" x={x(th.cv)} y={P.t} width={W - P.r - x(th.cv)} height={H - P.t - P.b} />
          <rect className="mc-seg-zone mc-seg-info" x={P.l} y={P.t} width={x(th.cv) - P.l} height={y(th.trend) - P.t} />
          <rect className="mc-seg-zone mc-seg-warn" x={P.l} y={y(-th.trend)} width={x(th.cv) - P.l} height={H - P.b - y(-th.trend)} />
          {[0, 30, 60, 90, 120, 150].map((t) => <g key={t}><line className="mc-grid" x1={x(t)} x2={x(t)} y1={P.t} y2={H - P.b} /><text className="mc-axis" x={x(t)} y={H - P.b + 14} textAnchor="middle">{t}{t === 150 ? "+" : ""}%</text></g>)}
          {[-60, -30, 0, 30, 60].map((t) => <g key={t}><line className={t === 0 ? "mc-grid mc-zero" : "mc-grid"} x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} /><text className="mc-axis" x={P.l - 6} y={y(t) + 3} textAnchor="end">{t > 0 ? "+" : ""}{t}%</text></g>)}
          <text className="mc-axis" x={W - P.r} y={H - 4} textAnchor="end">variability (CV%) →</text>
          <text className="mc-axis" x={P.l + 4} y={P.t + 10}>↑ trend per year</text>
          {seg.map((s) => (
            <g key={s.account.id} className={`mc-dot mc-dot-${SEG_TONE[s.segment]} ${s.account.id === sel.account.id ? "on" : ""}`} transform={`translate(${cx(s.cv).toFixed(1)} ${cy(s.trend).toFixed(1)})`}
              tabIndex={0} role="button" aria-label={`${s.account.id}: ${s.segment}, CV ${s.cv.toFixed(0)}%, trend ${s.trend.toFixed(0)}% per year`}
              onClick={() => setFocus(s.account.id)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setFocus(s.account.id)}>
              <circle r={s.segment === "Sporadic" ? 6 : 5.5} />
            </g>
          ))}
        </svg>
      </div>
      {sel && (
        <div className="mc-seg-detail" aria-live="polite">
          <div><strong>{sel.account.id}</strong> <Chip tone={SEG_TONE[sel.segment]}>{sel.segment}</Chip></div>
          <span>CV {sel.cv.toFixed(0)}% · trend {sel.trend > 0 ? "+" : ""}{sel.trend.toFixed(0)}%/yr · {sel.zeros.toFixed(0)}% zero months · avg {fmt(sel.mean)}/month</span>
          <svg viewBox={`0 0 ${MONTHS * 6} 48`} className="mc-spark" role="img" aria-label={`${sel.account.id} monthly orders over five years`}><path d={spark(sel.account.monthly, MONTHS * 6, 46)} /></svg>
        </div>
      )}
    </Panel>
  );
}

/* ───────────────────────── Churn risk ───────────────────────── */

export function ChurnPanel({ rows, w, setW }: { rows: ReturnType<typeof churn>; w: ChurnWeights; setW: (w: ChurnWeights) => void }) {
  const keys = Object.keys(FACTOR_LABELS) as (keyof ChurnWeights)[];
  return (
    <Panel
      intro="A transparent churn-risk score: four signals from each fictional account's order history, each scaled 0–1, combined with weights you control. Nothing is hidden in a model; every score can be explained."
      controls={<>
        {keys.map((k) => <Slider key={k} label={`Weight · ${FACTOR_LABELS[k]}`} value={w[k]} min={0} max={5} onChange={(v) => setW({ ...w, [k]: v })} />)}
        <p className="mc-note"><strong>Recency</strong> is days since the last order. <strong>Frequency</strong> and <strong>size</strong> compare the last 12 months with the 12 before. <strong>Gap</strong> compares the current silence with the account’s usual interval.</p>
      </>}
    >
      <dl className="mc-stats">
        <Stat label="High risk" value={String(rows.filter((r) => r.tier === "High").length)} tone="bad" />
        <Stat label="Medium risk" value={String(rows.filter((r) => r.tier === "Medium").length)} tone="warn" />
        <Stat label="Low risk" value={String(rows.filter((r) => r.tier === "Low").length)} tone="good" />
        <Stat label="Accounts scored" value={String(rows.length)} />
      </dl>
      <ol className="mc-churn">
        {rows.slice(0, 10).map((r) => (
          <li key={r.account.id}>
            <div className="mc-churn-head">
              <strong>{r.account.id}</strong>
              <Chip tone={r.tier === "High" ? "bad" : r.tier === "Medium" ? "warn" : "good"}>{r.tier}</Chip>
              <span className="mc-churn-score">{r.score.toFixed(0)}</span>
            </div>
            <div className="mc-churn-bar" aria-hidden="true"><i style={{ width: `${r.score}%` }} /></div>
            <ul className="mc-churn-factors">
              {keys.map((k) => <li key={k} className={k === r.top ? "top" : undefined}><span>{FACTOR_LABELS[k]}</span><i style={{ width: `${r.factors[k] * 100}%` }} /></li>)}
            </ul>
            <p>Driven mostly by <strong>{FACTOR_LABELS[r.top].toLowerCase()}</strong> · last order {r.daysSince} days ago (usual gap ≈ {r.usual} days)</p>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

/* ───────────────────────── Monitoring ───────────────────────── */

export function MonitorPanel({ m, s, setS }: { m: ReturnType<typeof monitor>; s: MonitorSettings; setS: (s: MonitorSettings) => void }) {
  const [view, setView] = useState<"fill" | "shift" | "gap">("fill");
  const flaggedShifts = m.shifts.filter((x) => x.flagged);
  const badGaps = m.gaps.filter((g) => g.status === "Late" || g.status === "Not shipped");
  const W = 720, rowH = 22, gapRows = m.gaps.filter((g) => g.status !== "On time").slice(0, 14);
  const gx = scale(TODAY - 120, TODAY + 5, 110, W - 16);
  return (
    <Panel
      intro="When no forecast is trustworthy enough to plan from, watch the signals instead: is each account ordering on its usual cadence, has its demand shifted, and is anything waiting too long to ship?"
      controls={<>
        <div className="mc-pills" role="group" aria-label="Monitoring view">
          {([["fill", "Fill dates"], ["shift", "Demand shifts"], ["gap", "Shipping gaps"]] as const).map(([id, label]) => (
            <button key={id} className={`mc-pill ${view === id ? "on" : ""}`} aria-pressed={view === id} onClick={() => setView(id)}>{label}</button>
          ))}
        </div>
        <Slider label="Overdue after (days past due)" value={s.tolerance} min={0} max={30} unit="d" onChange={(tolerance) => setS({ ...s, tolerance })} />
        <Slider label="Flag demand shifts beyond" value={s.shift} min={10} max={80} step={5} unit="%" onChange={(shift) => setS({ ...s, shift })} />
        <Slider label="Shipping gap if order-to-ship exceeds" value={s.lag} min={3} max={20} unit="d" onChange={(lag) => setS({ ...s, lag })} />
      </>}
    >
      <dl className="mc-stats">
        <Stat label="Overdue orders" value={String(m.fill.filter((f) => f.status === "Overdue").length)} tone="warn" />
        <Stat label="Due now" value={String(m.fill.filter((f) => f.status === "Due now").length)} />
        <Stat label="Demand shifts" value={String(flaggedShifts.length)} tone={flaggedShifts.length ? "warn" : "good"} />
        <Stat label="Shipping gaps" value={String(badGaps.length)} tone={badGaps.length ? "bad" : "good"} sub="last 120 days" />
      </dl>

      {view === "fill" && (
        <div className="mc-table-wrap">
          <table className="mc-table">
            <caption>Expected next order from each account’s usual cadence</caption>
            <thead><tr><th scope="col">Account</th><th scope="col">Last order</th><th scope="col">Usual interval</th><th scope="col">Next expected</th><th scope="col">Status</th></tr></thead>
            <tbody>{m.fill.slice(0, 14).map((f) => (
              <tr key={f.account.id}><th scope="row">{f.account.id}</th><td>{day(f.last)}</td><td>{f.usual} d</td><td>{day(f.due)}</td>
                <td><Chip tone={f.status === "Overdue" ? "bad" : f.status === "Due now" ? "warn" : "good"}>{f.status}{f.status === "Overdue" ? ` · ${f.late} d` : ""}</Chip></td></tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {view === "shift" && (
        <ul className="mc-shifts">
          {m.shifts.slice(0, 12).map((x) => (
            <li key={x.account.id} className={x.flagged ? "flag" : undefined}>
              <strong>{x.account.id}</strong>
              <span className="mc-shift-bar" aria-hidden="true"><i className={x.change >= 0 ? "up" : "down"} style={{ width: `${Math.min(50, Math.abs(x.change) * 50)}%` }} /></span>
              <span className={x.change >= 0 ? "mc-up" : "mc-down"}>{x.change >= 0 ? "+" : "−"}{Math.abs(x.change * 100).toFixed(0)}%</span>
              <small>{fmt(x.base)} → {fmt(x.recent)} / month</small>
              {x.flagged && <Chip tone="warn">Shift</Chip>}
            </li>
          ))}
        </ul>
      )}

      {view === "gap" && (
        <div className="mc-chart-wrap">
          <svg className="mc-chart" viewBox={`0 0 ${W} ${gapRows.length * rowH + 40}`} role="img" aria-label="Recent orders whose shipment was late or is still outstanding.">
            {[-120, -90, -60, -30, 0].map((d) => <g key={d}><line className="mc-grid" x1={gx(TODAY + d)} x2={gx(TODAY + d)} y1={8} y2={gapRows.length * rowH + 14} /><text className="mc-axis" x={gx(TODAY + d)} y={gapRows.length * rowH + 30} textAnchor="middle">{d === 0 ? "today" : `${d} d`}</text></g>)}
            {gapRows.map((g, i) => {
              const yy = 18 + i * rowH, end = g.shipDay ?? TODAY;
              const tone = g.status === "Late" || g.status === "Not shipped" ? "bad" : "warn";
              return (
                <g key={`${g.account.id}-${g.orderDay}`}>
                  <text className="mc-axis" x={104} y={yy + 4} textAnchor="end">{g.account.id}</text>
                  <line className={`mc-gap-line mc-gap-${tone}`} x1={gx(g.orderDay)} x2={gx(end)} y1={yy} y2={yy} />
                  <circle className="mc-gap-order" cx={gx(g.orderDay)} cy={yy} r="4" />
                  {g.shipDay !== null ? <circle className={`mc-gap-ship mc-gap-${tone}`} cx={gx(end)} cy={yy} r="4" /> : <text className="mc-axis mc-gap-open" x={gx(end) + 6} y={yy + 4}>not shipped · {g.lag} d</text>}
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </Panel>
  );
}

/* ───────────────────────── Shipment consolidation ───────────────────────── */

export function ConsolidationPanel({ net, c, windowDays, setWindow, capacity, setCapacity }: {
  net: ReturnType<typeof network>; c: ReturnType<typeof consolidate>; windowDays: number; setWindow: (v: number) => void; capacity: number; setCapacity: (v: number) => void;
}) {
  const [region, setRegion] = useState(0);
  const locs = net.locations.map((l, li) => ({ ...l, li })).filter((l) => l.region === region);
  const W = 720, rowH = 26, tx = scale(0, 89, 92, W - 14);
  return (
    <Panel
      intro="Ninety days of synthetic deliveries to fictional locations. Same-destination shipments that fall inside the consolidation window, and fit on one truck, merge into a single delivery."
      controls={<>
        <Slider label="Consolidation window" value={windowDays} min={0} max={14} unit="days" onChange={setWindow} />
        <Slider label="Truck capacity" value={capacity} min={60} max={400} step={20} unit="units" onChange={setCapacity} />
        <p className="mc-callout">With a {windowDays}-day window, <strong>{fmt(c.before)}</strong> deliveries become <strong>{fmt(c.after)}</strong>, which is <strong>{pct(c.reduction)}</strong> fewer trips. {fmt(c.redundant)} deliveries landed within 3 days of another to the same place.</p>
      </>}
    >
      <dl className="mc-stats">
        <Stat label="Deliveries before" value={fmt(c.before)} />
        <Stat label="After consolidation" value={fmt(c.after)} tone="good" />
        <Stat label="Reduction" value={pct(c.reduction)} tone={c.reduction > 0 ? "good" : undefined} />
        <Stat label="Locations" value={String(net.locations.length)} sub={`${REGION_NAMES.length} regions`} />
      </dl>
      <div className="mc-regions" role="group" aria-label="Regions">
        {REGION_NAMES.map((name, g) => {
          const pr = c.perRegion[g];
          return (
            <button key={name} className={`mc-region ${g === region ? "on" : ""}`} aria-pressed={g === region} onClick={() => setRegion(g)}>
              <span>Region {name}</span>
              <strong>{pr.before} → {pr.after}</strong>
              <i style={{ width: `${pr.before ? (pr.after / pr.before) * 100 : 0}%` }} />
            </button>
          );
        })}
      </div>
      <div className="mc-chart-wrap">
        <svg className="mc-chart" viewBox={`0 0 ${W} ${locs.length * rowH + 36}`} role="img" aria-label={`Deliveries over 90 days to locations in Region ${REGION_NAMES[region]}, with consolidated groups bracketed.`}>
          {[0, 30, 60, 89].map((d) => <g key={d}><line className="mc-grid" x1={tx(d)} x2={tx(d)} y1={6} y2={locs.length * rowH + 10} /><text className="mc-axis" x={tx(d)} y={locs.length * rowH + 26} textAnchor="middle">day {d + 1}</text></g>)}
          {locs.map((l, i) => {
            const yy = 18 + i * rowH;
            return (
              <g key={l.id}>
                <text className="mc-axis" x={84} y={yy + 4} textAnchor="end">Loc {l.id}</text>
                {c.groups[l.li].map((g) => <rect key={`${g.start}-${g.end}`} className={g.count > 1 ? "mc-cons-group merged" : "mc-cons-group"} x={tx(g.start) - 4} y={yy - 8} width={Math.max(8, tx(g.end) - tx(g.start) + 8)} height="16" rx="8" />)}
                {net.deliveries.filter((d) => d.loc === l.li).map((d) => <circle key={d.id} className="mc-cons-dot" cx={tx(d.day)} cy={yy} r="2.6" />)}
              </g>
            );
          })}
        </svg>
      </div>
      <ul className="mc-legend"><li><i className="mc-lg-ivory" />Original delivery</li><li><i className="mc-lg-gold-bar" />Merged into one trip</li></ul>
    </Panel>
  );
}

/* ───────────────────────── Process flow ───────────────────────── */

export function ProcessPanel() {
  const [stage, setStage] = useState(0);
  const W = 720, H = 220, colW = W / 3;
  return (
    <Panel intro="A generic schematic of how a biological product moves from culture to a packed, released lot. These are textbook stages, not the actual process. Select a stage to read about it.">
      <div className="mc-chart-wrap">
        <svg className="mc-chart mc-process" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Schematic flow: fermentation, then downstream processing, then blending and bottling.">
          <path id="mc-flow-path" className="mc-flow-line" d={`M20 ${H / 2} H${W - 20}`} />
          {PROCESS.map((p, i) => {
            const x0 = i * colW + 12;
            return (
              <g key={p.id} className={`mc-stage ${i === stage ? "on" : ""}`} tabIndex={0} role="button" aria-pressed={i === stage} aria-label={p.name}
                onClick={() => setStage(i)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setStage(i)}>
                <rect className="mc-stage-box" x={x0} y="18" width={colW - 24} height={H - 36} rx="12" />
                <text className="mc-stage-title" x={x0 + 14} y="40">{String(i + 1).padStart(2, "0")} · {p.name}</text>
                {p.steps.map((s, k) => (
                  <g key={s} transform={`translate(${x0 + 14} ${58 + k * 36})`}>
                    <rect className="mc-step" width={colW - 52} height="26" rx="6" />
                    <circle className="mc-step-dot" cx="13" cy="13" r="4">
                      <animate attributeName="opacity" values=".3;1;.3" dur="2.4s" begin={`${i * 0.8 + k * 0.2}s`} repeatCount="indefinite" />
                    </circle>
                    <text className="mc-step-text" x="26" y="17">{s}</text>
                  </g>
                ))}
              </g>
            );
          })}
          {[0, 1, 2].map((k) => (
            <circle key={k} className="mc-flow-token" r="5" opacity="0">
              {/* hidden until its staggered start, so it never sits at the SVG origin */}
              <set attributeName="opacity" to="1" begin={`${k * 2.5}s`} />
              <animateMotion dur="7.5s" begin={`${k * 2.5}s`} repeatCount="indefinite"><mpath href="#mc-flow-path" /></animateMotion>
            </circle>
          ))}
        </svg>
      </div>
      <p className="mc-callout" aria-live="polite"><strong>{PROCESS[stage].name}.</strong> {PROCESS[stage].text}</p>
      <p className="mc-note">Schematic only: generic stage names, no process parameters, recipes or proprietary detail.</p>
    </Panel>
  );
}

/* ───────────────────────── Waste analysis (shown under Lots) ───────────────────────── */

export function WasteSection({ w }: { w: ReturnType<typeof waste> }) {
  const W = 720, H = 200, P = { l: 40, r: 14, t: 12, b: 26 };
  const max = Math.max(...w.trend.map((t) => t.expired + t.other)) * 1.15;
  const x = scale(0, w.trend.length, P.l, W - P.r), v = scale(0, max, H - P.b, P.t), bw = (W - P.l - P.r) / w.trend.length * 0.6;
  const rmax = Math.max(...w.byReason);
  return (
    <section className="mc-waste" aria-label="Waste analysis">
      <h4 className="mc-subhead">Waste analysis</h4>
      <div className="mc-waste-grid">
        <ul className="mc-reasons">
          {WASTE_REASONS.map((r, i) => (
            <li key={r}><span>{r}</span><i style={{ width: `${(w.byReason[i] / rmax) * 100}%` }} className={i === 0 ? "exp" : undefined} /><strong>{fmt(w.byReason[i])}</strong></li>
          ))}
          <li className="mc-reason-total"><span>Total units wasted</span><strong>{fmt(w.total)}</strong></li>
        </ul>
        <div className="mc-chart-wrap">
          <svg className="mc-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Weekly waste over the last 12 weeks, split into expired and other reasons.">
            {niceTicks(max).map((t) => <g key={t}><line className="mc-grid" x1={P.l} x2={W - P.r} y1={v(t)} y2={v(t)} /><text className="mc-axis" x={P.l - 6} y={v(t) + 3} textAnchor="end">{t}</text></g>)}
            {w.trend.map((t, i) => (
              <g key={t.week}>
                <rect className="mc-bar-short" x={x(i) + bw * 0.3} y={v(t.expired)} width={bw} height={v(0) - v(t.expired)} rx="2" />
                <rect className="mc-bar-demand" x={x(i) + bw * 0.3} y={v(t.expired + t.other)} width={bw} height={v(t.expired) - v(t.expired + t.other)} rx="2" />
                <text className="mc-axis" x={x(i) + bw * 0.8} y={H - 8} textAnchor="middle">{t.week === 0 ? "now" : `${t.week}w`}</text>
              </g>
            ))}
          </svg>
        </div>
      </div>
      <ul className="mc-legend"><li><i className="mc-lg-short" />Expired</li><li><i className="mc-lg-demand" />Other reasons</li></ul>
      <p className="mc-note">“Expired on shelf” uses this scenario’s projected lot expiry; the other reasons and the weekly trend are synthetic.</p>
    </section>
  );
}
