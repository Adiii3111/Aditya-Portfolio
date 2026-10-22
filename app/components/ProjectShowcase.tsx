"use client";

import { useState } from "react";
import { projects, type Project } from "../content";
import ProjectVisual from "./ProjectVisual";

function Detail({ p, open, onToggle }: { p: Project; open: boolean; onToggle: () => void }) {
  return (
    <div className="project-detail" key={p.id}>
      <div className="project-visual"><ProjectVisual kind={p.visual} /></div>
      <p className="project-year">{p.year}</p>
      <h3>{p.title}</h3>
      <dl className="project-facts">
        <div><dt>Context</dt><dd>{p.context}</dd></div>
        <div><dt>Challenge</dt><dd>{p.challenge}</dd></div>
        <div><dt>My role</dt><dd>{p.role}</dd></div>
        {p.outcome && <div><dt>Outcome</dt><dd>{p.outcome}</dd></div>}
      </dl>
      <ul className="chips">{p.tools.map((t) => <li key={t}>{t}</li>)}</ul>
      {p.note && <p className="project-note">{p.note}</p>}
      <button className="case-toggle" aria-expanded={open} onClick={onToggle}>{open ? "Hide case study −" : "Case study +"}</button>
      {open && <ol className="case-steps">{p.caseStudy.map((s, i) => <li key={s}><span>{String(i + 1).padStart(2, "0")}</span>{s}</li>)}</ol>}
      {p.id === "mercury" && <a className="text-link" href="#mercury-demo">Try the illustrative demo →</a>}
    </div>
  );
}

export default function ProjectShowcase() {
  const [active, setActive] = useState(projects[0].id);
  const [caseOpen, setCaseOpen] = useState(false);
  const current = projects.find((p) => p.id === active)!;
  const select = (id: string) => { setActive(id); setCaseOpen(false); };

  return (
    <div className="showcase">
      <ol className="project-index" role="tablist" aria-label="Projects">
        {projects.map((p, i) => (
          <li key={p.id}>
            <button role="tab" aria-selected={p.id === active} aria-controls="project-panel" onClick={() => select(p.id)}>
              <span className="pi-num">{String(i + 1).padStart(2, "0")}</span>
              <span className="pi-title">{p.title}</span>
              <span className="pi-cat">{p.category}</span>
            </button>
            {/* On small screens the detail opens inline, like an accordion. */}
            {p.id === active && <div className="inline-detail"><Detail p={p} open={caseOpen} onToggle={() => setCaseOpen(!caseOpen)} /></div>}
          </li>
        ))}
      </ol>
      <div className="project-panel" id="project-panel" role="tabpanel" aria-live="polite">
        <Detail p={current} open={caseOpen} onToggle={() => setCaseOpen(!caseOpen)} />
      </div>
    </div>
  );
}
