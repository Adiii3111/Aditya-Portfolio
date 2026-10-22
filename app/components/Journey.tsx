"use client";

import { useEffect, useRef, useState } from "react";
import WorldMap, { NORTH_ATLANTIC, PLANE_PATH, placePercent } from "./WorldMap";
import { chapters } from "../content";
import WillmarArt from "./WillmarArt";

const cityName = { bengaluru: "Bengaluru", boston: "Boston", willmar: "Willmar, MN" } as const;
const SECONDS_PER_LEG = 1.8;

export default function Journey() {
  const [current, setCurrent] = useState(0);
  const items = useRef<(HTMLLIElement | null)[]>([]);
  const mapRef = useRef<HTMLDivElement>(null);
  const planeRef = useRef<SVGGElement>(null);
  const flight = useRef({ at: 0, target: 0, raf: 0, last: 0 });

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setCurrent(Number((e.target as HTMLElement).dataset.index))),
      { rootMargin: "-45% 0px -45% 0px" },
    );
    items.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  const city = chapters[current].city;
  // How far along the route the current chapter has "travelled": 0 = Bengaluru, 1 = Boston, 2 = Willmar.
  const seen = chapters.slice(0, current + 1);
  const target = seen.some((c) => c.city === "willmar") ? 2 : seen.some((c) => c.city === "boston") ? 1 : 0;

  // Fly the plane (and draw the route behind it) toward the target leg.
  useEffect(() => {
    const legs = Array.from(mapRef.current?.querySelectorAll<SVGPathElement>(".map-route") ?? []);
    const plane = planeRef.current;
    if (legs.length < 2 || !plane) return;
    const f = flight.current;
    f.target = target;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const render = () => {
      legs.forEach((leg, i) => { leg.style.strokeDashoffset = String(1 - Math.min(1, Math.max(0, f.at - i))); });
      const i = Math.min(1, Math.floor(f.at === 2 ? 1 : f.at));
      const leg = legs[i];
      const len = leg.getTotalLength();
      const d = Math.min(len, Math.max(0, (f.at - i) * len));
      const p = leg.getPointAtLength(d);
      // Heading: look slightly ahead (or behind at the very end of a leg).
      const q = leg.getPointAtLength(Math.min(len, d + 2));
      const r = d + 2 > len ? leg.getPointAtLength(Math.max(0, d - 2)) : p;
      const angle = d + 2 > len ? Math.atan2(p.y - r.y, p.x - r.x) : Math.atan2(q.y - p.y, q.x - p.x);
      const flying = f.at !== f.target;
      plane.setAttribute("transform", `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${(angle * 180 / Math.PI).toFixed(1)})`);
      plane.classList.toggle("is-flying", flying);
      plane.classList.toggle("is-parked", !flying && f.at > 0);
    };

    if (reduced) { f.at = target; render(); return; }

    const step = (now: number) => {
      const dt = f.last ? (now - f.last) / 1000 : 0;
      f.last = now;
      const dir = Math.sign(f.target - f.at);
      f.at = dir > 0 ? Math.min(f.target, f.at + dt / SECONDS_PER_LEG) : Math.max(f.target, f.at - dt / SECONDS_PER_LEG);
      render();
      if (f.at !== f.target) f.raf = requestAnimationFrame(step);
      else { f.last = 0; f.raf = 0; }
    };
    cancelAnimationFrame(f.raf);
    f.last = 0;
    render();
    if (f.at !== f.target) f.raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(f.raf);
  }, [target]);

  // The photo shown is the most recent chapter (up to the current one) that has one.
  const photoIndex = (() => { for (let i = current; i >= 0; i--) if (chapters[i].photo || chapters[i].art) return i; return 0; })();
  const caption = chapters[photoIndex].photo?.caption ?? chapters[photoIndex].art?.caption;

  return (
    <div className="journey-layout">
      <div className="journey-sticky">
        <div className="journey-map" ref={mapRef}>
          <WorldMap
            bounds={NORTH_ATLANTIC}
            width={1000}
            step={2.4}
            dot={2.3}
            routes={[{ from: "bengaluru", to: "boston" }, { from: "boston", to: "willmar" }]}
            markers={(["bengaluru", "boston", "willmar"] as const).map((at) => ({ at, className: at === city ? "is-current" : "" }))}
          >
            <g ref={planeRef} className="journey-plane" aria-hidden="true">
              <path d={PLANE_PATH} transform="scale(1.35)" />
            </g>
          </WorldMap>
          {(["bengaluru", "boston", "willmar"] as const).map((at) => (
            <span key={at} className={`journey-pin ${at === city ? "is-current" : ""} pin-${at}`} style={placePercent(at, NORTH_ATLANTIC)}>{cityName[at]}</span>
          ))}
        </div>

        <div className="journey-moment">
          <div className="journey-photos">
            {chapters.map((c, i) => (c.photo || c.art) && (
              <figure key={c.title} className={i === photoIndex ? "is-shown" : undefined} aria-hidden={i !== photoIndex}>
                {c.photo ? <img src={c.photo.src} alt={c.photo.alt} style={{ objectPosition: c.photo.position }} loading="lazy" /> : <WillmarArt />}
              </figure>
            ))}
          </div>
          <div className="journey-now" aria-live="polite">
            <span>{chapters[current].when}</span>
            <strong>{chapters[current].place}</strong>
            {caption && <em>{caption}</em>}
          </div>
        </div>
        <p className="map-note">Map shows great-circle paths between places — not travel tracking.</p>
      </div>

      <ol className="chapters">
        {chapters.map((c, i) => (
          <li key={c.title} ref={(el) => { items.current[i] = el; }} data-index={i} className={`chapter ${i === current ? "is-current" : ""}`}>
            <div className="chapter-meta">
              <span>{c.when}</span>
              <span>{c.kind}</span>
            </div>
            <h3>{c.title}</h3>
            <p className="chapter-place">{c.place}</p>
            <p>{c.body}</p>
            {c.art && (
              <figure className="chapter-photo">
                <WillmarArt />
                <figcaption>{c.art.caption}</figcaption>
              </figure>
            )}
            {c.photo && (
              <figure className="chapter-photo">
                <img src={c.photo.src} alt={c.photo.alt} style={{ objectPosition: c.photo.position }} loading="lazy" />
                <figcaption>{c.photo.caption}</figcaption>
              </figure>
            )}
            {c.details && (
              <dl className="chapter-details">
                {c.details.map((d) => <div key={d.label}><dt>{d.label}</dt><dd>{d.value}</dd></div>)}
              </dl>
            )}
            {c.list && (
              <div className="chapter-focus">
                <span>{c.listLabel ?? "Highlights"}</span>
                <ul>{c.list.map((x) => <li key={x}>{x}</li>)}</ul>
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
