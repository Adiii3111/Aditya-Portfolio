"use client";

import { useState } from "react";
import { certifications, toolkit } from "../content";

/** Skills by domain; picking one shows where it was used. */
export default function Toolkit() {
  const [group, setGroup] = useState<string>("All");
  const [picked, setPicked] = useState({ group: toolkit[0].group, skill: toolkit[0].skills[0] });
  const shown = group === "All" ? toolkit : toolkit.filter((g) => g.group === group);
  const total = toolkit.reduce((n, g) => n + g.skills.length, 0);

  return (
    <div className="tk">
      <div className="tk-filters" role="group" aria-label="Filter skills by area">
        {["All", ...toolkit.map((g) => g.group)].map((g) => (
          <button key={g} className={g === group ? "is-on" : undefined} aria-pressed={g === group} onClick={() => setGroup(g)}>
            {g}
            <span>{g === "All" ? total : toolkit.find((t) => t.group === g)!.skills.length}</span>
          </button>
        ))}
      </div>

      <div className="tk-body">
        <div className="tk-groups">
          {shown.map((g) => (
            <div key={g.group} className="tk-group">
              <h3>{g.group}</h3>
              <ul>
                {g.skills.map((s) => {
                  const on = picked.skill.name === s.name;
                  return (
                    <li key={s.name}>
                      <button className={on ? "is-on" : undefined} aria-pressed={on} onClick={() => setPicked({ group: g.group, skill: s })}>{s.name}</button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <aside className="tk-detail" aria-live="polite">
          <p className="tk-detail-group">{picked.group}</p>
          <p className="tk-detail-name" key={picked.skill.name}>{picked.skill.name}</p>
          <p className="tk-detail-label">Where I’ve used it</p>
          <ul>{picked.skill.used.map((u) => <li key={u}>{u}</li>)}</ul>
          <p className="tk-hint">Pick any skill to see where it shows up in my work.</p>
        </aside>
      </div>

      <div className="tk-certs">
        <p className="tk-detail-label">Certifications</p>
        <ul>
          {certifications.map((c) => (
            <li key={c.name}>
              <span className="tk-seal" aria-hidden="true">✦</span>
              <strong>{c.name}</strong>
              <span>{c.issuer}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
