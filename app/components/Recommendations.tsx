"use client";

import { useState } from "react";
import { recommendations } from "../content";

export default function Recommendations() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="quotes">
        {recommendations.map((r) => (
          <figure key={r.name} className="quote reveal">
            <blockquote>“{r.quote}”</blockquote>
            <figcaption>
              <strong>{r.name}</strong>
              <span>{r.title}</span>
              {open && <p className="quote-context">{r.context}</p>}
              <a href={r.link} target="_blank" rel="noreferrer">LinkedIn profile ↗</a>
            </figcaption>
          </figure>
        ))}
      </div>
      <button className="quiet-button" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? "Hide context −" : "Read the context behind these words +"}
      </button>
    </>
  );
}
