"use client";

import { useEffect, useRef } from "react";

/*
 * Slow, quiet centrepieces for the opening and closing chapters.
 *  - "helix": a DNA double helix (healthcare / life sciences) whose rungs are supply
 *    links, with gold shipments travelling along it. It lives in the gap between the
 *    hero text and the portrait.
 *  - "sphere": a rotating molecular lattice (a cell) whose nodes are hospitals (crimson)
 *    and warehouses (gold), with shipments moving between them. It lives in the free
 *    space beside the contact details, below the headline.
 * Placement is measured from the real text on screen, so it never overlaps words.
 */

const GOLD = [197, 165, 114];
const GOLD_L = [226, 205, 164];
const RED = [214, 103, 95];
const rgba = (c: number[], a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`;

function seeded(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

type Area = { x: number; y: number; w: number; h: number } | null;

type Icon = "factory" | "snow" | "flask" | "truck" | "cross" | "heart" | "vial" | "box" | "drop" | "pill" | "gear" | "chart" | "people" | "note" | "runner";
const ICON_PATHS: Record<Icon, string> = {
  factory: "M-8 7V-2l4.5 2.6v-2.6L1 .6v-2.6L5.5.6V-7h2.5V7Z",
  snow: "M0-8V8M-7-4 7 4M-7 4 7-4M-2-6l2 2 2-2M-2 6l2-2 2 2",
  flask: "M-3-8h6M-2-8v5.5l-5.5 9a1.8 1.8 0 0 0 1.6 2.7h11.8a1.8 1.8 0 0 0 1.6-2.7L2-2.5V-8M-4.6 3h9.2",
  truck: "M-9-4.5h10v8h-10ZM1-1.5h4.5L8 1v2.5H1M-4 6a1.5 1.5 0 1 0 -.1 0M5 6a1.5 1.5 0 1 0 -.1 0",
  cross: "M-2.4-7.5h4.8v5.1h5.1v4.8H2.4v5.1h-4.8V2.4h-5.1v-4.8h5.1Z",
  heart: "M0 6.5C-8.5.8-8.4-5.6-4.3-7-2-7.8 0-5.8 0-4.3 0-5.8 2-7.8 4.3-7 8.4-5.6 8.5.8 0 6.5Z",
  vial: "M-3.6-8h7.2M-2.7-8v13a2.7 2.7 0 0 0 5.4 0V-8M-2.7 0h5.4",
  box: "M-7.5-3.8 0-7.5l7.5 3.7v8.3L0 8.2l-7.5-3.7ZM-7.5-3.8 0-.1l7.5-3.7M0-.1v8.3",
  drop: "M0-8C4.6-2.6 6.5.2 6.5 2.8a6.5 6.5 0 0 1-13 0C-6.5.2-4.6-2.6 0-8Z",
  pill: "M-6.2 1.8a3.6 3.6 0 0 1 0-5.1l2.9-2.9a3.6 3.6 0 0 1 5.1 5.1L-1.1 1.8a3.6 3.6 0 0 1-5.1 0ZM-4.8-4.8l3.6 3.6",
  gear: "M-1.3-8h2.6l.5 2.2 1.6.7 1.9-1.2 1.8 1.8-1.2 1.9.7 1.6 2.2.5v2.6l-2.2.5-.7 1.6 1.2 1.9-1.8 1.8-1.9-1.2-1.6.7-.5 2.2h-2.6l-.5-2.2-1.6-.7-1.9 1.2-1.8-1.8 1.2-1.9-.7-1.6L-8 1.3v-2.6l2.2-.5.7-1.6-1.2-1.9 1.8-1.8 1.9 1.2 1.6-.7ZM0-2.8a2.8 2.8 0 1 0 .1 0",
  chart: "M-8 7.5H8M-6 7.5V2M-2 7.5V-2M2 7.5V0M6 7.5V-5M-6.5-1.5-2-5.5l4 2.5 4.5-5",
  people: "M-3-5.5a2.8 2.8 0 1 0 .1 0M-8.5 7c0-3.2 2.4-5.2 5.5-5.2S2.5 3.8 2.5 7M4.3-4.5a2.3 2.3 0 1 0 .1 0M4 1c2.6 0 4.5 2 4.5 5",
  note: "M-3.5 4.5a2.6 2.6 0 1 0-.1 0M-.9 4.5V-6.5l7.5-1.8V2.5M6.6 2.5a2.6 2.6 0 1 0-.1 0M-.9-3.2l7.5-1.8",
  runner: "M2.6-8.2a1.9 1.9 0 1 0 .1 0M-6.5-.5l3.2-3.3 4.3.8 2.4 3.4h3.2M.9-3-1.8 2.4l3.3 2.2-1.6 4.4M-1.8 2.4-7.2 4.2",
};
const ICON_COLOR: Record<Icon, number[]> = {
  factory: [226, 205, 164], snow: [156, 192, 255], flask: [226, 205, 164], truck: [226, 205, 164], box: [226, 205, 164],
  cross: [224, 119, 111], heart: [224, 119, 111], drop: [224, 119, 111], vial: [226, 205, 164], pill: [224, 119, 111],
  gear: [226, 205, 164], chart: [226, 205, 164], people: [226, 205, 164], note: [226, 205, 164], runner: [224, 119, 111],
};
const iconCache: Partial<Record<Icon, Path2D>> = {};
const iconPath = (k: Icon) => (iconCache[k] ??= new Path2D(ICON_PATHS[k]));

/** A small instrument-style disc with a stroked icon. */
function drawBadge(ctx: CanvasRenderingContext2D, x: number, y: number, k: Icon, alpha: number, size = 1) {
  const c = ICON_COLOR[k];
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);
  ctx.fillStyle = `rgba(15,27,46,${(0.92 * alpha).toFixed(3)})`;
  ctx.strokeStyle = rgba(c, 0.75 * alpha);
  ctx.lineWidth = 1.1 / size;
  ctx.beginPath(); ctx.arc(0, 0, 15, 0, 7); ctx.fill(); ctx.stroke();
  ctx.lineWidth = 1.35 / size;
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.strokeStyle = rgba(c, 0.95 * alpha);
  ctx.stroke(iconPath(k));
  ctx.restore();
}

function rectIn(el: Element | null, host: DOMRect) {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { left: r.left - host.left, top: r.top - host.top, right: r.right - host.left, bottom: r.bottom - host.top };
}

/** Width of the actual inked text inside a block (not the block's full width). */
function textRight(el: Element | null, host: DOMRect) {
  if (!el) return 0;
  const range = document.createRange();
  range.selectNodeContents(el);
  let right = 0;
  for (const r of Array.from(range.getClientRects())) right = Math.max(right, r.right - host.left);
  return right;
}

function helixArea(section: HTMLElement): Area {
  const host = section.getBoundingClientRect();
  const text = section.querySelector(".hero-text");
  const portrait = rectIn(section.querySelector(".portrait-frame"), host);
  if (!text || !portrait) return null;
  const right = Math.max(...Array.from(text.children).map((c) => textRight(c, host)));
  const pulse = rectIn(section.querySelector(".pulse-chain"), host);
  const gap = portrait.left - right;
  if (gap < 150) return null; // stacked (mobile) or too tight
  const top = 84, bottom = (pulse ? pulse.top : host.height) - 26;
  return { x: right + 40, y: top, w: gap - 80, h: bottom - top };
}

function sphereArea(section: HTMLElement): Area {
  const host = section.getBoundingClientRect();
  if (host.width < 900) return null;
  // Centre the globe beyond the corner so a large, gently curved arc shows in the top-right.
  const off = Math.min(260, host.width * 0.16);
  const cx = host.width + off, cy = -off;
  // Distance from the corner to the nearest piece of text (using real ink for the headline).
  const boxes = [".chapter-label", ".contact-title", ".contact .lede", ".contact-actions > *", ".contact-emails > div"]
    .flatMap((sel) => Array.from(section.querySelectorAll(sel)))
    .map((el) => {
      const b = rectIn(el, host)!;
      return el.matches(".contact-title, .lede, .chapter-label") ? { ...b, right: textRight(el, host) } : b;
    });
  const dist = Math.min(...boxes.map((b) => Math.hypot(Math.max(0, cx - b.right), Math.max(0, b.top - cy, cy - b.bottom))));
  const R = Math.min(900, dist - 40);
  if (R < off + 160) return null;
  return { x: cx - R, y: cy - R, w: 2 * R, h: 2 * R };
}

/** What Aditya represents — one per point on the helix (same order as the strip under the hero). */
const DISCIPLINES: { icon: Icon; label: string }[] = [
  { icon: "gear", label: "ENGINEERING" },
  { icon: "cross", label: "HEALTHCARE" },
  { icon: "truck", label: "SUPPLY CHAINS" },
  { icon: "flask", label: "RESEARCH" },
  { icon: "chart", label: "ANALYTICS" },
  { icon: "people", label: "LEADERSHIP" },
  { icon: "note", label: "CREATIVITY" },
  { icon: "runner", label: "RUNNING" },
];

export default function LivingCanvas({ mode }: { mode: "helix" | "sphere" }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    const section = cv?.closest("section") as HTMLElement | null;
    if (!cv || !section) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let area: Area = null, W = 0, H = 0, raf = 0, visible = true, last = 0, time = 0;

    // ── sphere model (Fibonacci points + nearest-neighbour bonds)
    const N = 420;
    const pts = Array.from({ length: N }, (_, i) => {
      const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = i * 2.399963;
      return [Math.cos(th) * r, y, Math.sin(th) * r];
    });
    const edges: [number, number][] = [];
    pts.forEach((p, i) => {
      pts.map((q, j) => [j, (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2] as const)
        .filter(([j]) => j > i).sort((a, b) => a[1] - b[1]).slice(0, 3)
        .forEach(([j, d]) => d < 0.12 && edges.push([i, j]));
    });
    const adj = pts.map((_, i) => edges.flatMap(([a, b]) => (a === i ? [b] : b === i ? [a] : [])));
    const rand = seeded(11);
    // Facilities on the dome: every so often a lattice point becomes a labelled icon.
    const KINDS: Icon[] = ["cross", "truck", "vial", "snow", "factory", "heart", "box", "drop", "pill", "flask"];
    const badges = new Map<number, Icon>();
    // Spread facilities evenly over the globe: greedy picks that keep a minimum distance apart.
    for (const i of pts.map((_, k) => (k * 97) % N)) {
      const q = pts[i];
      if ([...badges.keys()].every((j) => (pts[j][0] - q[0]) ** 2 + (pts[j][1] - q[1]) ** 2 + (pts[j][2] - q[2]) ** 2 > 0.07)) badges.set(i, KINDS[badges.size % KINDS.length]);
      if (badges.size >= 80) break;
    }
    const ships = Array.from({ length: 14 }, () => { const a = Math.floor(rand() * N); return { a, b: adj[a][0] ?? 0, t: rand() }; });


    const layout = () => {
      const r = section.getBoundingClientRect();
      W = r.width; H = r.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      cv.style.width = `${W}px`; cv.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      area = mode === "helix" ? helixArea(section) : sphereArea(section);
      draw(0);
    };

    const drawHelix = () => {
      if (!area) return;
      const cx = area.x + area.w / 2, r = Math.min(74, area.w / 2 - 16);
      const top = area.y, len = area.h, steps = Math.round(len / 9);
      const turns = len / 260, rot = time * 0.12;
      const at = (t: number, s: number) => {
        const a = t * turns * Math.PI * 2 + rot + s * Math.PI;
        return { x: cx + r * Math.cos(a), y: top + t * len, z: Math.sin(a) };
      };
      const edge = (t: number) => Math.min(1, t / 0.12, (1 - t) / 0.12);
      // rungs (supply links)
      for (let i = 0; i <= steps; i += 3) {
        const t = i / steps, A = at(t, 0), B = at(t, 1), e = edge(t);
        ctx.strokeStyle = rgba(GOLD, 0.16 * e);
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
        ctx.fillStyle = rgba(GOLD, 0.22 * e);
        ctx.beginPath(); ctx.arc((A.x + B.x) / 2, A.y, 1.2, 0, 7); ctx.fill();
      }
      // strands
      for (const s of [0, 1]) {
        for (let i = 0; i <= steps; i++) {
          const t = i / steps, P = at(t, s), d = (P.z + 1) / 2, e = edge(t);
          ctx.fillStyle = rgba(s ? RED : GOLD, (0.18 + 0.7 * d) * e);
          ctx.beginPath(); ctx.arc(P.x, P.y, 0.9 + 1.6 * d, 0, 7); ctx.fill();
        }
      }
      // discipline icons, each sitting on a point of the helix and turning with it
      const placed = DISCIPLINES.map((dsc, i) => {
        const t = 0.07 + (i / (DISCIPLINES.length - 1)) * 0.86;
        return { dsc, P: at(t, i % 2) };
      }).sort((a, b) => a.P.z - b.P.z);
      ctx.font = "600 8.5px var(--font-sans), Manrope, sans-serif";
      ctx.textAlign = "center";
      for (const { dsc, P } of placed) {
        const d = (P.z + 1) / 2;
        drawBadge(ctx, P.x, P.y, dsc.icon, 0.45 + 0.55 * d, 0.72 + 0.32 * d);
        const ly = P.y + 27 + 4 * d, lw = ctx.measureText(dsc.label).width + 12;
        ctx.fillStyle = `rgba(11,20,35,${(0.55 + 0.4 * d).toFixed(3)})`;
        ctx.beginPath(); ctx.roundRect(P.x - lw / 2, ly - 9, lw, 13, 6.5); ctx.fill();
        ctx.fillStyle = rgba([214, 209, 199], 0.3 + 0.65 * d);
        ctx.fillText(dsc.label, P.x, ly);
      }
    };

    const drawSphere = (dt: number) => {
      if (!area) return;
      const R = area.w / 2, cx = area.x + R, cy = area.y + R;
      const spin = time * 0.07, tilt = 0.35;
      const cs = Math.cos(spin), sn = Math.sin(spin), ct = Math.cos(tilt), st = Math.sin(tilt);
      const proj = pts.map(([x, y, z]) => {
        const x1 = x * cs + z * sn, z1 = -x * sn + z * cs;
        const y2 = y * ct - z1 * st, z2 = y * st + z1 * ct;
        return { x: cx + x1 * R, y: cy - y2 * R, d: (z2 + 1) / 2 };
      });
      const halo = ctx.createRadialGradient(cx, cy, R * 0.3, cx, cy, R * 1.3);
      halo.addColorStop(0, rgba(GOLD, 0.08)); halo.addColorStop(1, rgba(GOLD, 0));
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(cx, cy, R * 1.3, 0, 7); ctx.fill();
      ctx.strokeStyle = rgba(GOLD, 0.22); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke();
      ctx.lineWidth = 0.8;
      for (const [a, b] of edges) {
        const d = (proj[a].d + proj[b].d) / 2;
        ctx.strokeStyle = rgba(GOLD, 0.05 + 0.26 * d);
        ctx.beginPath(); ctx.moveTo(proj[a].x, proj[a].y); ctx.lineTo(proj[b].x, proj[b].y); ctx.stroke();
      }
      proj.forEach((pt, i) => {
        if (badges.has(i)) return;
        ctx.fillStyle = rgba(GOLD_L, 0.1 + 0.5 * pt.d);
        ctx.beginPath(); ctx.arc(pt.x, pt.y, 0.8 + 1.1 * pt.d, 0, 7); ctx.fill();
      });
      for (const sh of ships) {
        sh.t += dt * 0.42;
        if (sh.t >= 1) { sh.a = sh.b; const n = adj[sh.a]; sh.b = n[Math.floor(rand() * n.length)] ?? sh.a; sh.t = 0; }
        const A = proj[sh.a], B = proj[sh.b];
        const x = A.x + (B.x - A.x) * sh.t, y = A.y + (B.y - A.y) * sh.t, d = A.d + (B.d - A.d) * sh.t;
        const g = ctx.createRadialGradient(x, y, 0, x, y, 7);
        g.addColorStop(0, rgba(GOLD_L, 0.85 * (0.3 + 0.7 * d))); g.addColorStop(1, rgba(GOLD_L, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill();
      }
      [...badges.entries()].map(([i, k]) => ({ pt: proj[i], k })).sort((a, b) => a.pt.d - b.pt.d).forEach(({ pt, k }) => {
        if (pt.d < 0.3) return;
        drawBadge(ctx, pt.x, pt.y, k, Math.min(1, (pt.d - 0.3) / 0.25), 0.85 + 0.5 * pt.d);
      });
    };

    const draw = (dt: number) => {
      ctx.clearRect(0, 0, W, H);
      if (mode === "helix") drawHelix(); else drawSphere(dt);
    };

    const loop = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now; time += dt;
      draw(dt);
      raf = visible ? requestAnimationFrame(loop) : 0;
    };

    layout();
    document.fonts?.ready.then(layout);
    const ro = new ResizeObserver(layout);
    ro.observe(section);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf && !reduced) { last = 0; raf = requestAnimationFrame(loop); }
    });
    io.observe(section);
    if (!reduced) raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
  }, [mode]);

  return <canvas ref={ref} className="living-canvas" aria-hidden="true" />;
}
