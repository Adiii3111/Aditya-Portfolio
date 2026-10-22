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
  const title = section.querySelector(".contact-title");
  const footer = rectIn(section.querySelector(".footer"), host);
  if (!title || !footer) return null;
  // Rightmost edge of the copy, buttons, and email links (their real ink/box, not full-width blocks).
  const boxes = Array.from(section.querySelectorAll(".contact-actions > *, .contact-emails > div")).map((el) => rectIn(el, host)!.right);
  const left = Math.max(textRight(section.querySelector(".contact .lede"), host), ...boxes) + 70;
  const titleRect = rectIn(title, host)!;
  const gutter = parseFloat(getComputedStyle(section).paddingLeft) || 24;
  const top = titleRect.bottom + 24, bottom = footer.top - 24;
  const w = host.width - gutter - left, h = bottom - top;
  if (w < 220 || h < 220) return null;
  return { x: left, y: top, w, h };
}

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
    const N = 170;
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
    const ships = Array.from({ length: 12 }, () => { const a = Math.floor(rand() * N); return { a, b: adj[a][0] ?? 0, t: rand() }; });
    const cargo = Array.from({ length: 5 }, (_, i) => ({ t: i / 5, strand: i % 2 }));

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

    const drawHelix = (dt: number) => {
      if (!area) return;
      const cx = area.x + area.w / 2, r = Math.min(64, area.w / 2 - 6);
      const top = area.y, len = area.h, steps = Math.round(len / 9);
      const turns = len / 190, rot = time * 0.16;
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
      // shipments travelling down the strands
      for (const c of cargo) {
        c.t = (c.t + dt * 0.035) % 1;
        const P = at(c.t, c.strand), d = (P.z + 1) / 2, e = edge(c.t);
        const g = ctx.createRadialGradient(P.x, P.y, 0, P.x, P.y, 9);
        g.addColorStop(0, rgba(GOLD_L, 0.9 * e * (0.4 + 0.6 * d)));
        g.addColorStop(1, rgba(GOLD_L, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(P.x, P.y, 9, 0, 7); ctx.fill();
      }
    };

    const drawSphere = (dt: number) => {
      if (!area) return;
      const R = Math.min(230, Math.min(area.w, area.h) / 2 - 8);
      const cx = area.x + area.w / 2, cy = area.y + area.h / 2;
      const ry = time * 0.09, rx = 0.38;
      const cy1 = Math.cos(ry), sy1 = Math.sin(ry), cx1 = Math.cos(rx), sx1 = Math.sin(rx);
      const proj = pts.map(([x, y, z]) => {
        const x1 = x * cy1 + z * sy1, z1 = -x * sy1 + z * cy1;
        const y2 = y * cx1 - z1 * sx1, z2 = y * sx1 + z1 * cx1;
        return { x: cx + x1 * R, y: cy + y2 * R, d: (z2 + 1) / 2 };
      });
      // soft halo
      const halo = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.25);
      halo.addColorStop(0, rgba(GOLD, 0.06)); halo.addColorStop(1, rgba(GOLD, 0));
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(cx, cy, R * 1.25, 0, 7); ctx.fill();
      // bonds
      ctx.lineWidth = 0.8;
      for (const [a, b] of edges) {
        const d = (proj[a].d + proj[b].d) / 2;
        ctx.strokeStyle = rgba(GOLD, 0.05 + 0.22 * d);
        ctx.beginPath(); ctx.moveTo(proj[a].x, proj[a].y); ctx.lineTo(proj[b].x, proj[b].y); ctx.stroke();
      }
      // nodes: hospitals (crimson), warehouses (gold rings), plain lattice points
      proj.forEach((p, i) => {
        const hospital = i % 17 === 3, warehouse = i % 23 === 7;
        if (hospital) {
          ctx.fillStyle = rgba(RED, 0.25 + 0.7 * p.d);
          ctx.beginPath(); ctx.arc(p.x, p.y, 2.2 + 2 * p.d, 0, 7); ctx.fill();
        } else if (warehouse) {
          ctx.strokeStyle = rgba(GOLD_L, 0.25 + 0.65 * p.d); ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(p.x, p.y, 3 + 2 * p.d, 0, 7); ctx.stroke();
        } else {
          ctx.fillStyle = rgba(GOLD_L, 0.12 + 0.55 * p.d);
          ctx.beginPath(); ctx.arc(p.x, p.y, 0.8 + 1.1 * p.d, 0, 7); ctx.fill();
        }
      });
      // shipments walking the lattice
      for (const s of ships) {
        s.t += dt * 0.45;
        if (s.t >= 1) { s.a = s.b; const n = adj[s.a]; s.b = n[Math.floor(rand() * n.length)] ?? s.a; s.t = 0; }
        const A = proj[s.a], B = proj[s.b];
        const x = A.x + (B.x - A.x) * s.t, y = A.y + (B.y - A.y) * s.t, d = A.d + (B.d - A.d) * s.t;
        const g = ctx.createRadialGradient(x, y, 0, x, y, 7);
        g.addColorStop(0, rgba(GOLD_L, 0.85 * (0.3 + 0.7 * d))); g.addColorStop(1, rgba(GOLD_L, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill();
      }
    };

    const draw = (dt: number) => {
      ctx.clearRect(0, 0, W, H);
      if (mode === "helix") drawHelix(dt); else drawSphere(dt);
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
