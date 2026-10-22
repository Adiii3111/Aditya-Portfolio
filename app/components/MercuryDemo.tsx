"use client";

import "./mercury.css";
import { useMemo, useRef, useState } from "react";
import { generate } from "./mercury/synthetic";
import { BASELINE, recommend, runAll, type Action, type ReorderParams, type Scenario } from "./mercury/models";
import {
  accounts, bakeoff, churn, CHURN_DEFAULT, consolidate, customerActions, monitor, MONITOR_DEFAULT, network,
  SEG_DEFAULT, segment, SPLITS, waste, type ChurnWeights, type MonitorSettings, type SegThresholds, type Split,
} from "./mercury/customers";
import { ForecastPanel, InventoryPanel, ReorderPanel } from "./mercury/panels-plan";
import { ActionsPanel, LotsPanel, MrpPanel, ProductionPanel, ScenarioPanel, ShippingPanel } from "./mercury/panels-ops";
import { BakeoffPanel, ChurnPanel, ConsolidationPanel, MonitorPanel, ProcessPanel, SegmentsPanel, WasteSection } from "./mercury/panels-customers";
import { pct } from "./mercury/ui";

/*
 * Illustrative demo only: planning, operations, and customer modules built on
 * generic textbook methods and randomly generated data. It shares no code,
 * data, logic, or assumptions with the original MERCURY system.
 */

const GROUPS = [
  { id: "plan", label: "Plan", tabs: [
    { id: "forecast", label: "Demand forecasting" },
    { id: "bakeoff", label: "Model bake-off" },
    { id: "inventory", label: "Inventory visibility" },
    { id: "reorder", label: "Reorder planning" },
    { id: "production", label: "Production planning" },
    { id: "mrp", label: "Material requirements" },
  ] },
  { id: "operate", label: "Operate", tabs: [
    { id: "lots", label: "Lot expiry & waste" },
    { id: "shipping", label: "Shipping & operations" },
    { id: "consolidation", label: "Shipment consolidation" },
    { id: "process", label: "Process flow" },
  ] },
  { id: "customers", label: "Customers", tabs: [
    { id: "segments", label: "Account segmentation" },
    { id: "churn", label: "Churn risk" },
    { id: "monitor", label: "Monitoring" },
  ] },
  { id: "decide", label: "Decide", tabs: [
    { id: "scenario", label: "Scenario exploration" },
    { id: "actions", label: "Decision-assist actions" },
  ] },
] as const;
type TabId = (typeof GROUPS)[number]["tabs"][number]["id"];
const ALL = GROUPS.flatMap((g, gi) => g.tabs.map((t) => ({ id: t.id as TabId, label: t.label as string, group: gi })));
const NUM = Object.fromEntries(ALL.map((t, i) => [t.id, String(i + 1).padStart(2, "0")])) as Record<TabId, string>;
const groupOf = (id: TabId) => ALL.find((t) => t.id === id)!.group;
const RANK = { High: 0, Medium: 1, Low: 2 } as const;
const bySeverity = (xs: Action[]) => [...xs].sort((p, q) => RANK[p.severity] - RANK[q.severity]);

const DEFAULT_REORDER: ReorderParams = { rop: 120, qty: 180, lead: 2, life: 8, service: 95, orderCost: 150, holdPct: 20, unitCost: 40 };

export default function MercuryDemo() {
  const [seed, setSeed] = useState(7);
  const [tab, setTab] = useState<TabId>("forecast");
  const [sc, setSc] = useState<Scenario>(BASELINE);
  const [reorderParams, setReorderParams] = useState(DEFAULT_REORDER);
  const [overtime, setOvertime] = useState(false);
  const [mpsEdits, setMpsEdits] = useState<{ seed: number; mps: number[] } | null>(null);
  const [split, setSplit] = useState<Split>(SPLITS[0]);
  const [segTh, setSegTh] = useState<SegThresholds>(SEG_DEFAULT);
  const [churnW, setChurnW] = useState<ChurnWeights>(CHURN_DEFAULT);
  const [monS, setMonS] = useState<MonitorSettings>(MONITOR_DEFAULT);
  const [consWindow, setConsWindow] = useState(3);
  const [consCap, setConsCap] = useState(220);
  const tabRefs = useRef<Partial<Record<TabId, HTMLButtonElement | null>>>({});

  const data = useMemo(() => generate(seed), [seed]);
  const mps = mpsEdits?.seed === seed ? mpsEdits.mps : data.mpsDefault;
  const params = { reorder: reorderParams, mps, overtime };

  const base = useMemo(() => runAll(data, BASELINE, { reorder: reorderParams, mps, overtime }), [data, reorderParams, mps, overtime]);
  const now = useMemo(() => (sc === BASELINE ? base : runAll(data, sc, { reorder: reorderParams, mps, overtime })), [data, sc, base, reorderParams, mps, overtime]);

  // Customer-side modules (independent of the planning scenario).
  const accts = useMemo(() => accounts(seed), [seed]);
  const bake = useMemo(() => bakeoff(accts, split), [accts, split]);
  const seg = useMemo(() => segment(accts, segTh), [accts, segTh]);
  const risk = useMemo(() => churn(accts, churnW), [accts, churnW]);
  const mon = useMemo(() => monitor(accts, monS), [accts, monS]);
  const net = useMemo(() => network(seed), [seed]);
  const cons = useMemo(() => consolidate(net, consWindow, consCap), [net, consWindow, consCap]);
  const wst = useMemo(() => waste(seed, now.lot.atRiskUnits), [seed, now.lot.atRiskUnits]);
  const custActions = useMemo(() => customerActions({ bake, churn: risk, mon, cons, windowDays: consWindow }), [bake, risk, mon, cons, consWindow]);

  const baseActions = useMemo(() => bySeverity([...recommend(base), ...custActions]), [base, custActions]);
  const actions = useMemo(() => (now === base ? baseActions : bySeverity([...recommend(now), ...custActions])), [now, base, baseActions, custActions]);
  const scenarioOn = sc.demand !== 0 || sc.lead !== 0 || sc.capacity !== 0 || sc.shelf !== 0;

  const group = groupOf(tab);
  const tabs = ALL.filter((t) => t.group === group);
  const open = (id: string) => { setTab(id as TabId); requestAnimationFrame(() => tabRefs.current[id as TabId]?.focus()); };
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const n = tabs.length;
    const next = e.key === "ArrowRight" ? (i + 1) % n : e.key === "ArrowLeft" ? (i - 1 + n) % n : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : -1;
    if (next < 0) return;
    e.preventDefault();
    open(tabs[next].id);
  };

  const k = now.kpis, kb = base.kpis;
  const delta = (a: number, b: number, asPct: boolean) => {
    if (!scenarioOn || a === b) return null;
    const d = b - a;
    return <small className="mc-kpi-delta">{d > 0 ? "+" : "−"}{asPct ? `${(Math.abs(d) * 100).toFixed(1)} pts` : Math.round(Math.abs(d))}</small>;
  };
  const kpis = [
    { label: "Fill rate", value: pct(k.fillRate), d: delta(kb.fillRate, k.fillRate, true), tab: "reorder" },
    { label: "Stockout risks", value: String(k.atRisk), d: delta(kb.atRisk, k.atRisk, false), tab: "inventory" },
    { label: "Units expiring", value: String(k.expiring), d: delta(kb.expiring, k.expiring, false), tab: "lots" },
    { label: "Utilization", value: pct(k.utilization, 0), d: delta(kb.utilization, k.utilization, true), tab: "production" },
    { label: "On-time", value: pct(k.onTime, 0), d: delta(kb.onTime, k.onTime, true), tab: "shipping" },
    { label: "High churn risk", value: String(risk.filter((r) => r.tier === "High").length), d: null, tab: "churn" },
    { label: "Trips saved", value: pct(cons.reduction, 0), d: null, tab: "consolidation" },
    { label: "Actions", value: String(actions.length), d: delta(baseActions.length, actions.length, false), tab: "actions" },
  ];

  return (
    <div className="mc">
      <div className="mc-banner" role="note">
        <strong>Illustrative demo — synthetic data. Not the original MERCURY system.</strong>
        <span>Every number here is randomly generated; names are fictional and methods are textbook.</span>
      </div>

      <div className="mc-top">
        <div>
          <p className="mc-eyebrow">Decision-assist planning suite · {ALL.length} modules</p>
          <h3 className="mc-title">Explore the planning problems behind MERCURY</h3>
        </div>
        <div className="mc-top-actions">
          {scenarioOn && <button className="mc-scenario-badge" onClick={() => open("scenario")}>Scenario active · view</button>}
          <button className="mc-btn" onClick={() => setSeed((s) => s + 1)}>Generate a new synthetic scenario ↻</button>
        </div>
      </div>

      <dl className="mc-kpis mc-kpis-8" aria-label={scenarioOn ? "Key measures under the current scenario" : "Key measures"}>
        {kpis.map((x) => (
          <div key={x.label}>
            <button onClick={() => open(x.tab)}>
              <dt>{x.label}</dt>
              <dd>{x.value}{x.d}</dd>
            </button>
          </div>
        ))}
      </dl>

      {/* Two-level navigation: choose a group, then a module inside it. */}
      <div className="mc-groups" role="group" aria-label="Module groups">
        {GROUPS.map((g, gi) => (
          <button key={g.id} className={`mc-group ${gi === group ? "on" : ""}`} aria-pressed={gi === group} onClick={() => setTab(g.tabs[0].id)}>
            {g.label}<span>{g.tabs.length}</span>
          </button>
        ))}
      </div>
      <div className="mc-tabs" role="tablist" aria-label={`${GROUPS[group].label} modules`}>
        {tabs.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => { tabRefs.current[t.id] = el; }}
            role="tab"
            id={`mc-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`mc-panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => setTab(t.id)}
            onKeyDown={(e) => onKey(e, i)}
          >
            <span>{NUM[t.id]}</span>{t.label}
            {t.id === "actions" && actions.length > 0 && <i className="mc-tab-count">{actions.length}</i>}
          </button>
        ))}
      </div>

      <div className="mc-body" role="tabpanel" id={`mc-panel-${tab}`} aria-labelledby={`mc-tab-${tab}`} key={`${tab}-${seed}`}>
        {tab === "forecast" && <ForecastPanel data={data} />}
        {tab === "bakeoff" && <BakeoffPanel b={bake} split={split} setSplit={setSplit} />}
        {tab === "inventory" && <InventoryPanel rows={now.inv} />}
        {tab === "reorder" && <ReorderPanel r={now.ro} params={params.reorder} setParams={setReorderParams} />}
        {tab === "production" && <ProductionPanel prod={now.prod} overtime={overtime} setOvertime={setOvertime} />}
        {tab === "mrp" && <MrpPanel plan={now.plan} mps={mps} setMps={(m) => setMpsEdits({ seed, mps: m })} resetMps={() => setMpsEdits(null)} />}
        {tab === "lots" && <><LotsPanel lot={now.lot} /><WasteSection w={wst} /></>}
        {tab === "shipping" && <ShippingPanel ship={now.ship} />}
        {tab === "consolidation" && <ConsolidationPanel net={net} c={cons} windowDays={consWindow} setWindow={setConsWindow} capacity={consCap} setCapacity={setConsCap} />}
        {tab === "process" && <ProcessPanel />}
        {tab === "segments" && <SegmentsPanel seg={seg} th={segTh} setTh={setSegTh} />}
        {tab === "churn" && <ChurnPanel rows={risk} w={churnW} setW={setChurnW} />}
        {tab === "monitor" && <MonitorPanel m={mon} s={monS} setS={setMonS} />}
        {tab === "scenario" && <ScenarioPanel sc={sc} setSc={setSc} base={kb} now={k} actions={[baseActions.length, actions.length]} />}
        {tab === "actions" && <ActionsPanel actions={actions} open={open} />}
      </div>
    </div>
  );
}
