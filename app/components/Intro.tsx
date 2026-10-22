"use client";

import { useEffect } from "react";
import WorldMap, { PLANE_PATH, WORLD, placePercent } from "./WorldMap";
import { distanceKm, formatCoord, greatCircle, places, routePath } from "../lib/geo";

const KM = Math.round(distanceKm(places.bengaluru, places.boston) / 10) * 10;
const kmLabel = KM.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const ROUTE = routePath(greatCircle(places.bengaluru, places.boston), WORLD, 1400);

export function finishIntro() {
  document.documentElement.dataset.intro = "done";
  try { sessionStorage.setItem("aks-intro", "1"); } catch {}
}

/**
 * A ~2.8s opening sequence. It never blocks the page: it fades out on its own
 * (via CSS even without JavaScript), and any click, key, scroll, or the Skip
 * button dismisses it immediately. Returning visitors and reduced-motion users
 * never see it (see the inline script in layout.tsx).
 */
export default function Intro() {
  useEffect(() => {
    if (document.documentElement.dataset.intro === "done") return;
    const t = setTimeout(finishIntro, 3300);
    const skip = () => finishIntro();
    window.addEventListener("wheel", skip, { passive: true, once: true });
    window.addEventListener("touchmove", skip, { passive: true, once: true });
    window.addEventListener("keydown", skip, { once: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener("wheel", skip);
      window.removeEventListener("touchmove", skip);
      window.removeEventListener("keydown", skip);
    };
  }, []);

  return (
    <div className="intro" onClick={finishIntro} aria-label="Opening sequence: Bengaluru, India to Boston, Massachusetts">
      <div className="intro-map">
        <WorldMap className="intro-svg" routes={[{ from: "bengaluru", to: "boston" }]} markers={[{ at: "bengaluru", className: "m-origin" }, { at: "boston", className: "m-dest" }]}>
          {/* Flies the route in step with the line drawing (same timing and easing as .intro .map-route). */}
          <g className="intro-plane" opacity="0">
            <path d={PLANE_PATH} transform="scale(1.6)" />
            <set attributeName="opacity" to="1" begin="0.55s" />
            <animateMotion dur="1.45s" begin="0.55s" fill="freeze" rotate="auto" path={ROUTE} calcMode="spline" keyPoints="0;1" keyTimes="0;1" keySplines=".65 0 .35 1" />
          </g>
        </WorldMap>
        <div className="intro-label intro-origin" style={placePercent("bengaluru")}>
          <strong>Bengaluru, India</strong>
          <span>{formatCoord(places.bengaluru)}</span>
        </div>
        <div className="intro-label intro-dest" style={placePercent("boston")}>
          <strong>Boston, Massachusetts</strong>
          <span>{formatCoord(places.boston)}</span>
        </div>
      </div>
      <p className="intro-caption">≈ {kmLabel} km by great circle · one continuing journey</p>
      <button className="intro-skip" onClick={(e) => { e.stopPropagation(); finishIntro(); }}>Skip intro →</button>
    </div>
  );
}
