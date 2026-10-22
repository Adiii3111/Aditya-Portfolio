"use client";

import { useMemo, useState } from "react";
import { HIST, PERIOD, PRODUCTS, SITES, type Data } from "./synthetic";
import { evaluate, forecast, METHODS, type FcParams, type InvRow, type Method, type ReorderParams, type Results, type StockStatus } from "./models";
import { Chip, fmt, niceTicks, Panel, pct, scale, Select, Slider, Stat } from "./ui";

/* ───────────────────────── 1. Demand forecasting ───────────────────────── */

const FW = 720, FH = 280, FP = { l: 44, r: 14, t: 18, b: 30 };

export function ForecastPanel({ data }: { data: Data }) {
  const [product, setProduct] = useState(0);
  const [method, setMethod] = useState<Method>("hw");
  const [params, setParams] = useState<FcParams>({ window: 6, alpha: 0.35, beta: 0.08, gamma: 0.3 });
  const [horizon, setHorizon] = useState(13);
  const set = (k: keyof FcParams) => (v: number) => setParams((p) => ({ ...p, [k]: v }));

  const y = data.history[product];
  const fit = useMemo(() => forecast(y, method, params, horizon), [y, method, params, horizon]);
  const ev = useMemo(() => evaluate(y, method, params), [y, method, params]);
  const league = useMemo(() => METHODS.map((m) => ({ ...m, ...evaluate(y, m.id, params) })).sort((a, b) => a.mape - b.mape), [y, params]);

  const total = HIST + horizon;
  const bandAt = (h: number) => 1.96 * fit.sigma * Math.sqrt(h);
  const maxY = Math.max(...y, ...fit.future.map((v, h) => v + bandAt(h + 1))) * 1.08;
  const x = scale(0, total - 1, FP.l, FW - FP.r);
  const yy = scale(0, maxY, FH - FP.b, FP.t);
  const line = (pts: [number, number][]) => pts.map(([t, v], i) => `${i ? "L" : "M"}${x(t).toFixed(1)} ${yy(v).toFixed(1)}`).join("");
  const histLine = line(y.map((v, t) => [t, v]));
  const fittedLine = line(fit.fitted.map((v, t) => [t, v] as [number, number | null]).filter((p): p is [number, number] => p[1] != null));
  const futurePts: [number, number][] = [[HIST - 1, y[HIST - 1]], ...fit.future.map((v, h) => [HIST + h, v] as [number, number])];
  const band = [
    ...fit.future.map((v, h) => `${x(HIST + h).toFixed(1)},${yy(v + bandAt(h + 1)).toFixed(1)}`),
    ...fit.future.map((v, h) => `${x(HIST + h).toFixed(1)},${yy(Math.max(0, v - bandAt(h + 1))).toFixed(1)}`).reverse(),
  ].join(" ");
  const holdStart = HIST - PERIOD;
  const holdLine = line([[holdStart - 1, y[holdStart - 1]], ...ev.pred.map((v, i) => [holdStart + i, v] as [number, number])]);

  return (
    <Panel
      intro="Fit a classical forecasting method to 78 weeks of synthetic demand, then check it against the last 13 weeks it never saw."
      controls={<>
        <Select label="Product" value={String(product)} options={PRODUCTS.map((p, i) => ({ id: String(i), label: p }))} onChange={(v) => setProduct(Number(v))} />
        <Select label="Method" value={method} options={METHODS} onChange={setMethod} />
        {method === "ma" && <Slider label="Window" value={params.window} min={2} max={26} unit="wk" onChange={set("window")} />}
        {method !== "ma" && <Slider label="Level smoothing α" value={params.alpha} min={0.05} max={0.95} step={0.05} format={(v) => v.toFixed(2)} onChange={set("alpha")} />}
        {(method === "holt" || method === "hw") && <Slider label="Trend smoothing β" value={params.beta} min={0.01} max={0.5} step={0.01} format={(v) => v.toFixed(2)} onChange={set("beta")} />}
        {method === "hw" && <Slider label="Season smoothing γ" value={params.gamma} min={0.05} max={0.95} step={0.05} format={(v) => v.toFixed(2)} onChange={set("gamma")} />}
        <Slider label="Forecast horizon" value={horizon} min={4} max={26} unit="wk" onChange={setHorizon} />
        <button className="mc-link" onClick={() => setMethod(league[0].id)} disabled={league[0].id === method}>
          {league[0].id === method ? "This is the most accurate method here" : `Switch to the most accurate: ${league[0].label} →`}
        </button>
      </>}
    >
      <dl className="mc-stats">
        <Stat label="Holdout MAPE" value={`${ev.mape.toFixed(1)}%`} tone={ev.mape < 10 ? "good" : ev.mape < 18 ? "warn" : "bad"} />
        <Stat label="Holdout MAE" value={`${ev.mae.toFixed(1)}`} sub="units / week" />
        <Stat label="Next-week forecast" value={fmt(fit.future[0])} sub={`± ${fmt(bandAt(1))} (≈95%)`} />
        <Stat label={`${horizon}-week total`} value={fmt(fit.future.reduce((a, b) => a + b, 0))} sub="units" />
      </dl>
      <div className="mc-chart-wrap">
        <svg className="mc-chart" viewBox={`0 0 ${FW} ${FH}`} role="img" aria-label={`${PRODUCTS[product]}: ${METHODS.find((m) => m.id === method)!.label} forecast. Holdout error ${ev.mape.toFixed(1)} percent.`}>
          {niceTicks(maxY / 1.08).map((v) => (
            <g key={v}><line className="mc-grid" x1={FP.l} x2={FW - FP.r} y1={yy(v)} y2={yy(v)} /><text className="mc-axis" x={FP.l - 8} y={yy(v) + 4} textAnchor="end">{v}</text></g>
          ))}
          <rect className="mc-hold-zone" x={x(holdStart)} y={FP.t} width={x(HIST - 1) - x(holdStart)} height={FH - FP.t - FP.b} />
          <text className="mc-axis" x={x(holdStart) + 6} y={FP.t + 12}>holdout</text>
          <line className="mc-today" x1={x(HIST - 1)} x2={x(HIST - 1)} y1={FP.t} y2={FH - FP.b} />
          <text className="mc-axis" x={x(HIST - 1) + 6} y={FP.t + 12}>today</text>
          <polygon className="mc-band" points={band} />
          <path className="mc-fitted" d={fittedLine} />
          <path className="mc-line-ivory" d={histLine} />
          <path className="mc-line-dash" d={holdLine} />
          <path className="mc-line-gold" d={line(futurePts)} />
          {[0, 26, 52, 78].filter((t) => t < total).map((t) => <text key={t} className="mc-axis" x={x(t)} y={FH - 8} textAnchor="middle">{t === 78 ? "W78" : `W${t + 1}`}</text>)}
        </svg>
      </div>
      <ul className="mc-legend">
        <li><i className="mc-lg-ivory" />Synthetic history</li>
        <li><i className="mc-lg-fitted" />In-sample fit</li>
        <li><i className="mc-lg-dash" />Holdout forecast</li>
        <li><i className="mc-lg-gold" />Forecast</li>
        <li><i className="mc-lg-band" />Approx. 95% band</li>
      </ul>
      <table className="mc-table mc-league">
        <caption>Method comparison on the 13-week holdout</caption>
        <thead><tr><th scope="col">Method</th><th scope="col">MAPE</th><th scope="col">MAE</th><th scope="col">RMSE</th></tr></thead>
        <tbody>{league.map((m, i) => (
          <tr key={m.id} className={m.id === method ? "mc-row-on" : undefined}>
            <th scope="row">{m.label}{i === 0 && <Chip tone="good">best</Chip>}</th><td>{m.mape.toFixed(1)}%</td><td>{m.mae.toFixed(1)}</td><td>{m.rmse.toFixed(1)}</td>
          </tr>
        ))}</tbody>
      </table>
    </Panel>
  );
}

/* ───────────────────────── 2. Inventory visibility ───────────────────────── */

const statusTone: Record<StockStatus, "bad" | "warn" | "good" | "info"> = { "Stockout risk": "bad", Low: "warn", Healthy: "good", Excess: "info" };
type SortKey = "sku" | "site" | "onHand" | "onOrder" | "weekly" | "daysCover" | "rop" | "status";
const statusOrder: StockStatus[] = ["Stockout risk", "Low", "Healthy", "Excess"];

export function InventoryPanel({ rows }: { rows: InvRow[] }) {
  const [site, setSite] = useState("all");
  const [status, setStatus] = useState<"all" | StockStatus>("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "daysCover", dir: 1 });

  const counts = statusOrder.map((s) => ({ s, n: rows.filter((r) => r.status === s).length }));
  const skus = [...new Map(rows.map((r) => [r.sku.id, r.sku])).values()];
  const shown = rows
    .filter((r) => (site === "all" || r.site === site) && (status === "all" || r.status === status))
    .sort((a, b) => {
      const k = sort.key;
      const va = k === "sku" ? a.sku.id : k === "status" ? statusOrder.indexOf(a.status) : k === "site" ? a.site : a[k];
      const vb = k === "sku" ? b.sku.id : k === "status" ? statusOrder.indexOf(b.status) : k === "site" ? b.site : b[k];
      return (va < vb ? -1 : va > vb ? 1 : 0) * sort.dir;
    });
  const head = (key: SortKey, label: string) => (
    <th scope="col" aria-sort={sort.key === key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : 1 }))}>{label}{sort.key === key ? (sort.dir === 1 ? " ↑" : " ↓") : ""}</button>
    </th>
  );

  return (
    <Panel intro="Every fictional SKU at every fictional site — on hand, on order, and how many days the stock will last. Click a status or a grid cell to filter.">
      <div className="mc-status-row" role="group" aria-label="Filter by status">
        <button className={status === "all" ? "mc-pill on" : "mc-pill"} onClick={() => setStatus("all")}>All · {rows.length}</button>
        {counts.map(({ s, n }) => <button key={s} className={`mc-pill mc-pill-${statusTone[s]} ${status === s ? "on" : ""}`} onClick={() => setStatus(status === s ? "all" : s)}>{s} · {n}</button>)}
      </div>

      <div className="mc-heat-wrap">
        <table className="mc-heat" aria-label="Days of cover by SKU and site">
          <thead><tr><th scope="col">SKU</th>{SITES.map((s) => <th key={s} scope="col"><button className={site === s ? "on" : ""} onClick={() => setSite(site === s ? "all" : s)}>{s.replace("Site ", "")}</button></th>)}</tr></thead>
          <tbody>{skus.map((sku) => (
            <tr key={sku.id}>
              <th scope="row">{sku.id}<small>{PRODUCTS[sku.product]} · {sku.pack}</small></th>
              {SITES.map((s) => {
                const r = rows.find((x) => x.sku.id === sku.id && x.site === s)!;
                return <td key={s} className={`mc-heat-${statusTone[r.status]}`} title={`${r.status}: ${r.daysCover} days of cover`}>{r.daysCover}<small>days</small></td>;
              })}
            </tr>
          ))}</tbody>
        </table>
      </div>

      <div className="mc-table-wrap">
        <table className="mc-table">
          <caption>{shown.length} of {rows.length} SKU-site positions{site !== "all" && ` · ${site}`}</caption>
          <thead><tr>{head("sku", "SKU")}{head("site", "Site")}{head("onHand", "On hand")}{head("onOrder", "On order")}{head("weekly", "Weekly demand")}{head("daysCover", "Days of cover")}{head("rop", "Reorder point")}{head("status", "Status")}</tr></thead>
          <tbody>{shown.map((r) => (
            <tr key={r.sku.id + r.site}>
              <th scope="row">{r.sku.id}</th><td>{r.site}</td><td>{fmt(r.onHand)}</td><td>{fmt(r.onOrder)}</td><td>{fmt(r.weekly)}</td><td>{r.daysCover}</td><td>{fmt(r.rop)}</td>
              <td><Chip tone={statusTone[r.status]}>{r.status}</Chip></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </Panel>
  );
}

/* ───────────────────────── 3. Reorder planning ───────────────────────── */

const RW = 720, RH = 260, RP = { l: 40, r: 12, t: 16, b: 28 };

export function ReorderPanel({ r, params, setParams }: { r: Results["ro"]; params: ReorderParams; setParams: (p: ReorderParams) => void }) {
  const set = (k: keyof ReorderParams) => (v: number) => setParams({ ...params, [k]: v });
  const { sim } = r;
  const weeks = sim.rows.length;
  const maxY = Math.max(params.rop, ...sim.rows.map((x) => Math.max(x.onHand, x.demand)), 1) * 1.15;
  const x = (t: number) => RP.l + (t / (weeks - 1)) * (RW - RP.l - RP.r);
  const y = scale(0, maxY, RH - RP.b, RP.t);
  const bw = ((RW - RP.l - RP.r) / weeks) * 0.55;
  const line = sim.rows.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)} ${y(p.onHand).toFixed(1)}`).join("");

  return (
    <Panel
      intro="Size safety stock, the reorder point, and the order quantity — then simulate 26 weeks of a perishable product under that policy."
      controls={<>
        <Slider label="Reorder point" value={params.rop} min={0} max={400} step={10} unit="units" onChange={set("rop")} />
        <Slider label="Order quantity" value={params.qty} min={20} max={500} step={10} unit="units" onChange={set("qty")} />
        <Slider label="Lead time" value={params.lead} min={1} max={6} unit="wk" onChange={set("lead")} />
        <Slider label="Shelf life" value={params.life} min={3} max={16} unit="wk" onChange={set("life")} />
        <p className="mc-subhead">Policy economics</p>
        <Slider label="Target service level" value={params.service} min={80} max={99.5} step={0.5} unit="%" onChange={set("service")} />
        <Slider label="Cost per order" value={params.orderCost} min={20} max={500} step={10} format={(v) => `$${v}`} onChange={set("orderCost")} />
        <Slider label="Unit cost" value={params.unitCost} min={5} max={200} step={5} format={(v) => `$${v}`} onChange={set("unitCost")} />
        <Slider label="Annual holding cost" value={params.holdPct} min={5} max={40} unit="%" onChange={set("holdPct")} />
        <button className="mc-btn" onClick={() => setParams({ ...params, rop: Math.min(400, Math.round(r.recommendedRop / 10) * 10), qty: Math.max(20, Math.min(500, Math.round(r.eoq / 10) * 10)) })}>
          Apply recommended policy
        </button>
      </>}
    >
      <dl className="mc-stats">
        <Stat label="Fill rate" value={pct(sim.fillRate)} tone={sim.fillRate >= 0.97 ? "good" : sim.fillRate >= 0.9 ? "warn" : "bad"} />
        <Stat label="Units expired" value={fmt(sim.expired)} tone={sim.expired === 0 ? "good" : "warn"} />
        <Stat label="Orders placed" value={String(sim.orders)} />
        <Stat label="Stockout weeks" value={String(sim.stockoutWeeks)} tone={sim.stockoutWeeks === 0 ? "good" : "bad"} />
      </dl>
      <dl className="mc-formula">
        <div><dt>Safety stock</dt><dd>{fmt(r.safety)}</dd><dd className="mc-eq">z({params.service}%) {r.z.toFixed(2)} × σ {r.sigma.toFixed(1)} × √{r.lead}</dd></div>
        <div><dt>Recommended reorder point</dt><dd>{fmt(r.recommendedRop)}</dd><dd className="mc-eq">d̄ {r.mean.toFixed(1)} × L {r.lead} + SS</dd></div>
        <div><dt>Economic order quantity</dt><dd>{fmt(r.eoq)}</dd><dd className="mc-eq">√(2·D·S / H)</dd></div>
      </dl>
      <div className="mc-chart-wrap">
        <svg className="mc-chart" viewBox={`0 0 ${RW} ${RH}`} role="img" aria-label={`26-week synthetic simulation: fill rate ${pct(sim.fillRate)}, ${sim.expired} units expired, ${sim.orders} orders.`}>
          {niceTicks(maxY / 1.15).map((v) => <g key={v}><line className="mc-grid" x1={RP.l} x2={RW - RP.r} y1={y(v)} y2={y(v)} /><text className="mc-axis" x={RP.l - 8} y={y(v) + 4} textAnchor="end">{v}</text></g>)}
          {sim.rows.map((p) => <rect key={p.t} className="mc-bar-demand" x={x(p.t) - bw / 2} y={y(p.demand)} width={bw} height={y(0) - y(p.demand)} rx="1.5" />)}
          {sim.rows.filter((p) => p.short > 0).map((p) => <rect key={`s${p.t}`} className="mc-bar-short" x={x(p.t) - bw / 2} y={y(p.demand)} width={bw} height={y(0) - y(p.short)} rx="1.5" />)}
          <line className="mc-rop" x1={RP.l} x2={RW - RP.r} y1={y(params.rop)} y2={y(params.rop)} />
          <text className="mc-rop-label" x={RP.l + 6} y={y(params.rop) - 6}>reorder point</text>
          <path className="mc-line-ivory mc-thick" d={line} />
          {sim.rows.filter((p) => p.ordered).map((p) => <path key={`o${p.t}`} className="mc-mark-order" d={`M${x(p.t)} ${RH - RP.b + 3}l5 8h-10z`} />)}
          {sim.rows.filter((p) => p.expired > 0).map((p) => <circle key={`e${p.t}`} className="mc-mark-expired" cx={x(p.t)} cy={y(p.onHand)} r="4.5" />)}
          {[0, 5, 10, 15, 20, 25].map((t) => <text key={t} className="mc-axis" x={x(t)} y={RH - 4} textAnchor="middle">W{t + 1}</text>)}
        </svg>
      </div>
      <ul className="mc-legend">
        <li><i className="mc-lg-ivory" />On-hand inventory</li>
        <li><i className="mc-lg-demand" />Weekly demand</li>
        <li><i className="mc-lg-short" />Unmet demand</li>
        <li><i className="mc-lg-order" />Order placed</li>
        <li><i className="mc-lg-expired" />Lot expired</li>
      </ul>
    </Panel>
  );
}
