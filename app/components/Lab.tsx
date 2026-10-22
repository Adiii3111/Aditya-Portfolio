"use client";

import "./lab.css";
import { useRef, useState, type KeyboardEvent } from "react";
import RouteLab from "./lab/RouteLab";
import PatientFlowLab from "./lab/PatientFlowLab";
import BloodBankLab from "./lab/BloodBankLab";
import PaceLab from "./lab/PaceLab";

const EXPERIMENTS = [
  { id: "routes", label: "Route Optimizer", kicker: "Supply chain · Operations research", title: "Plan the delivery run.", lede: "Place stops on a synthetic map and race two classic routing methods against each other.", Component: RouteLab },
  { id: "patients", label: "Patient Flow", kicker: "Healthcare · Queueing", title: "Run a clinic for a day.", lede: "A live M/M/c simulation: patients arrive at random, wait, are seen, and go home. Change the staffing and watch the waiting room respond.", Component: PatientFlowLab },
  { id: "blood", label: "Blood Bank Challenge", kicker: "Healthcare × supply chain", title: "Every unit matters.", lede: "Keep three hospitals supplied with perishable blood for 60 days. Too little and patients go without; too much and units expire.", Component: BloodBankLab },
  { id: "pace", label: "Pace Lab", kicker: "AgileFlowSprinter", title: "Find your Sprint Sync pace.", lede: "Turn one race result into predicted finish times and a kilometre-by-kilometre plan.", Component: PaceLab },
] as const;

export default function Lab() {
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const exp = EXPERIMENTS[active];
  const Current = exp.Component;

  const onKey = (e: KeyboardEvent) => {
    const n = EXPERIMENTS.length;
    const next = e.key === "ArrowRight" ? (active + 1) % n : e.key === "ArrowLeft" ? (active - 1 + n) % n : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : -1;
    if (next < 0) return;
    e.preventDefault();
    setActive(next);
    tabs.current[next]?.focus();
  };

  return (
    <div className="lab">
      <div className="lab-tabs" role="tablist" aria-label="Lab experiments" onKeyDown={onKey}>
        {EXPERIMENTS.map((x, i) => (
          <button
            key={x.id}
            ref={(el) => { tabs.current[i] = el; }}
            role="tab"
            id={`lab-tab-${x.id}`}
            aria-selected={i === active}
            aria-controls={`lab-panel-${x.id}`}
            tabIndex={i === active ? 0 : -1}
            className="lab-tab"
            onClick={() => setActive(i)}
          >
            <span>{String(i + 1).padStart(2, "0")}</span>{x.label}
          </button>
        ))}
      </div>

      <div className="lab-panel" role="tabpanel" id={`lab-panel-${exp.id}`} aria-labelledby={`lab-tab-${exp.id}`} key={exp.id}>
        <header className="lab-head">
          <p className="lab-kicker">{exp.kicker}</p>
          <h3>{exp.title}</h3>
          <p className="lab-lede">{exp.lede}</p>
        </header>
        {/* Only the visible experiment is mounted, so hidden ones never animate. */}
        <Current />
      </div>
    </div>
  );
}
