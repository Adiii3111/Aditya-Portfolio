"use client";

import { useEffect, useId, useRef } from "react";
import type { Project } from "../content";

/*
 * Animated, schematic scenes — one per project. Purely illustrative: no real
 * data, layouts, or results are depicted. Animation is SVG SMIL, so each scene
 * restarts whenever a project is selected (the SVG is re-mounted).
 */

const IVORY = "#F4F0E8";
const GOLD = "#C5A572";
const GOLD_L = "#E2CDA4";
const STONE = "#A8A8A2";
const NAVY = "#0B1423";
const PANEL = "#0F1A2C";
const RED = "#D2564C";
const BLUE = "#8FB5FF";
const GREEN = "#7FB28A";

type U = (name: string) => string;

const Label = ({ x, y, children, anchor = "start", fill = STONE }: { x: number; y: number; children: React.ReactNode; anchor?: "start" | "middle" | "end"; fill?: string }) => (
  <text x={x} y={y} textAnchor={anchor} fill={fill} className="pv-mono">{children}</text>
);

/** A looping draw-on for a path that has pathLength={1}. */
const Draw = ({ times, values, dur }: { times: string; values: string; dur: string }) => (
  <animate attributeName="stroke-dashoffset" values={values} keyTimes={times} dur={dur} repeatCount="indefinite" />
);

/* ───────────────────────── 01 MERCURY · decision-assist dashboard ───────────────────────── */

const hist = Array.from({ length: 27 }, (_, i) => [88 + i * 5, 190 - 20 * Math.sin(i / 2.6) - i * 0.9 + (((i * 37) % 11) - 5)] as const);
const last = hist[hist.length - 1];
const fc = Array.from({ length: 14 }, (_, j) => [last[0] + (j + 1) * 5, 190 - 20 * Math.sin((27 + j) / 2.6) - (27 + j) * 0.9] as const);
const line = (pts: readonly (readonly [number, number])[]) => pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");
const fcPath = line([last, ...fc]);
const band = [...[last, ...fc].map(([x, y], j) => [x, y - 4 - j * 1.6] as const), ...[last, ...fc].reverse().map(([x, y], j, a) => [x, y + 4 + (a.length - 1 - j) * 1.6] as const)];
const STATUS = ["#25463C", "#25463C", "#25463C", "#5E4A22", "#25463C", "#24375A", "#25463C", "#5E2A28"];

function Dashboard({ u }: { u: U }) {
  return (
    <g>
      <rect x="16" y="14" width="368" height="232" rx="12" fill={PANEL} stroke={`${IVORY}22`} />
      <path d="M16 38H384" stroke={`${IVORY}18`} />
      {[RED, GOLD, GREEN].map((c, i) => <circle key={c} cx={30 + i * 10} cy="26" r="2.8" fill={c} opacity=".85" />)}
      <Label x={70} y={29}>MERCURY · ILLUSTRATIVE · SYNTHETIC</Label>

      {/* sidebar with a tab highlight walking through modules */}
      {[50, 66, 82, 98, 114, 130, 146, 162, 178].map((y) => <rect key={y} x="24" y={y} width="44" height="10" rx="3" fill={`${IVORY}0f`} />)}
      <rect x="24" y="50" width="44" height="10" rx="3" fill={GOLD} opacity=".5">
        <animate attributeName="y" values="50;50;66;66;82;82;98;98;114;114;50" keyTimes="0;.16;.2;.36;.4;.56;.6;.76;.8;.96;1" dur="10s" repeatCount="indefinite" />
      </rect>

      {/* KPI tiles with live sparklines */}
      {[
        { x: 80, label: "FILL RATE", d: "M88 80l8-3 8 1 8-5 8 1 8-6 8-2 8-1 8-3" },
        { x: 178, label: "ON-TIME", d: "M186 78l8 2 8-4 8 1 8-6 8 3 8-5 8 1 8-4" },
        { x: 276, label: "UTILIZATION", d: "M284 82l8-6 8 2 8-2 8 3 8-7 8 1 8-3 8 2" },
      ].map((k, i) => (
        <g key={k.label}>
          <rect x={k.x} y="48" width="92" height="40" rx="7" fill={`${IVORY}0a`} stroke={`${IVORY}14`} />
          <Label x={k.x + 8} y={60}>{k.label}</Label>
          <path d={k.d} fill="none" stroke={GOLD_L} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1" strokeDashoffset="1">
            <Draw values="1;1;0;0" times={`0;${0.05 + i * 0.05};${0.25 + i * 0.05};1`} dur="8s" />
          </path>
          <circle cx={k.x + 80} cy="73" r="2.4" fill={GOLD_L}>
            <animate attributeName="r" values="2.4;4;2.4" dur="1.6s" begin={`${i * 0.4}s`} repeatCount="indefinite" />
          </circle>
        </g>
      ))}

      {/* forecast chart */}
      <g>
        {[110, 140, 170, 200, 230].map((y) => <path key={y} d={`M84 ${y}H290`} stroke={`${IVORY}0d`} />)}
        <path d="M223 100V234" stroke={`${IVORY}40`} strokeDasharray="2 3" />
        <Label x={226} y={106} fill={`${IVORY}80`}>TODAY</Label>
        <polygon points={band.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ")} fill={GOLD} opacity="0">
          <animate attributeName="opacity" values="0;0;.18;.18;0" keyTimes="0;.42;.52;.92;1" dur="8s" repeatCount="indefinite" />
        </polygon>
        <path d={line(hist)} fill="none" stroke={IVORY} strokeWidth="1.6" strokeLinejoin="round" pathLength={1} strokeDasharray="1" strokeDashoffset="1">
          <Draw values="1;0;0;1" times="0;.32;.94;1" dur="8s" />
        </path>
        <path d={fcPath} fill="none" stroke={GOLD} strokeWidth="1.8" strokeDasharray="1" strokeDashoffset="1" pathLength={1}>
          <Draw values="1;1;0;0;1" times="0;.32;.46;.94;1" dur="8s" />
        </path>
        <Label x={86} y={106}>DEMAND FORECAST</Label>
      </g>

      {/* status heatmap: SKUs × sites, statuses changing live */}
      <Label x={300} y={106}>SKU × SITE</Label>
      {Array.from({ length: 24 }, (_, i) => {
        const cx = 300 + (i % 4) * 20, cy = 112 + Math.floor(i / 4) * 20;
        const seq = [0, 1, 2, 3, 4, 5].map((k) => STATUS[(i * 3 + k * 5) % STATUS.length]).join(";");
        return (
          <rect key={i} x={cx} y={cy} width="16" height="16" rx="3" fill={STATUS[i % STATUS.length]}>
            <animate attributeName="fill" values={seq} dur="9s" begin={`${(i * 0.37) % 3}s`} calcMode="discrete" repeatCount="indefinite" />
          </rect>
        );
      })}
      <circle cx="368" cy="160" r="5" fill="none" stroke={RED} strokeWidth="1.4">
        <animate attributeName="r" values="4;12" dur="1.8s" repeatCount="indefinite" />
        <animate attributeName="opacity" values=".9;0" dur="1.8s" repeatCount="indefinite" />
      </circle>

      {/* decision-assist action sliding in */}
      <g opacity="0">
        <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;.55;.6;.9;.95;1" dur="8s" repeatCount="indefinite" />
        <animateTransform attributeName="transform" type="translate" values="-12 0;-12 0;0 0;0 0" keyTimes="0;.55;.6;1" dur="8s" repeatCount="indefinite" />
        <rect x="88" y="208" width="150" height="20" rx="10" fill={`${RED}33`} stroke={RED} strokeOpacity=".7" />
        <circle cx="100" cy="218" r="3" fill={RED} />
        <Label x={108} y={221} fill={IVORY}>ACTION · EXPEDITE REPLENISHMENT</Label>
      </g>
      <rect x="16" y="14" width="368" height="232" rx="12" fill={u("sheen")} opacity=".5" pointerEvents="none" />
    </g>
  );
}

/* ───────────────────────── 02 Blood supply chain network ───────────────────────── */

type P = readonly [number, number];
const D: P[] = [[46, 62], [38, 130], [46, 198]];
const LAB: P = [138, 130];
const DC: P[] = [[232, 86], [232, 174]];
const H: P[] = [[342, 42], [352, 104], [352, 158], [342, 220]];
const curve = (a: P, b: P) => `C ${a[0] + (b[0] - a[0]) * 0.5} ${a[1]}, ${a[0] + (b[0] - a[0]) * 0.5} ${b[1]}, ${b[0]} ${b[1]}`;
const seg = (a: P, b: P) => `M${a[0]} ${a[1]} ${curve(a, b)}`;
const route = (...pts: P[]) => `M${pts[0][0]} ${pts[0][1]} ` + pts.slice(1).map((p, i) => curve(pts[i], p)).join(" ");
const flows = [route(D[0], LAB, DC[0], H[0]), route(D[1], LAB, DC[0], H[1]), route(D[2], LAB, DC[1], H[3]), route(D[1], LAB, DC[1], H[2]), route(D[0], LAB, DC[0], H[1]), route(D[2], LAB, DC[1], H[2])];
const TRANSFER = `M${H[1][0]} ${H[1][1]} C 392 114, 392 148, ${H[2][0]} ${H[2][1]}`;
const dropPath = (x: number, y: number) => `M${x} ${y - 13} C ${x + 10} ${y - 1}, ${x + 10} ${y + 9}, ${x} ${y + 9} C ${x - 10} ${y + 9}, ${x - 10} ${y - 1}, ${x} ${y - 13}Z`;

function Network({ u }: { u: U }) {
  const edges = [...D.map((d) => seg(d, LAB)), ...DC.map((c) => seg(LAB, c)), seg(DC[0], H[0]), seg(DC[0], H[1]), seg(DC[1], H[2]), seg(DC[1], H[3])];
  return (
    <g>
      {edges.map((d) => (
        <g key={d}>
          <path d={d} fill="none" stroke={`${IVORY}26`} strokeWidth="1.3" />
          <path d={d} fill="none" stroke={RED} strokeOpacity=".55" strokeWidth="1.3" strokeDasharray="3 12">
            <animate attributeName="stroke-dashoffset" values="30;0" dur="1.6s" repeatCount="indefinite" />
          </path>
        </g>
      ))}
      <path d={TRANSFER} fill="none" stroke={GOLD} strokeWidth="1.2" strokeDasharray="3 4" opacity=".8" />

      {/* blood units: fresh red → ageing as they travel */}
      {flows.map((d, i) => (
        <circle key={i} r="3.4" fill={RED} filter={u("glow")} opacity="0">
          <animateMotion dur="5.4s" begin={`${i * 0.9}s`} repeatCount="indefinite" path={d} />
          <animate attributeName="fill" values={`#F06A5E;${RED};#9A7570`} keyTimes="0;.55;1" dur="5.4s" begin={`${i * 0.9}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.06;.9;1" dur="5.4s" begin={`${i * 0.9}s`} repeatCount="indefinite" />
        </circle>
      ))}
      <circle r="3" fill={GOLD_L} filter={u("glow")}>
        <animateMotion dur="3.2s" begin="1.5s" repeatCount="indefinite" path={TRANSFER} />
      </circle>

      {/* donors */}
      {D.map(([x, y], i) => (
        <g key={y}>
          <path d={dropPath(x, y)} fill={u("blood")} />
          <ellipse cx={x - 3} cy={y - 2} rx="1.8" ry="3" fill="#fff" opacity=".45" />
          <animateTransform attributeName="transform" type="translate" values="0 0;0 -2;0 0" dur="2.4s" begin={`${i * 0.5}s`} repeatCount="indefinite" />
        </g>
      ))}
      {/* testing & processing */}
      <g transform={`translate(${LAB[0]} ${LAB[1]})`}>
        <polygon points="0,-19 16.5,-9.5 16.5,9.5 0,19 -16.5,9.5 -16.5,-9.5" fill="#17263C" stroke={`${IVORY}66`} />
        <circle r="10" fill="none" stroke={GOLD} strokeWidth="1.4" strokeDasharray="4 3">
          <animateTransform attributeName="transform" type="rotate" values="0;360" dur="6s" repeatCount="indefinite" />
        </circle>
        <path d="M-2.5 -6h5M-1.5 -6v9a1.5 1.5 0 0 0 3 0v-9" stroke={IVORY} strokeWidth="1.2" fill="none" />
      </g>
      {/* cold-chain storage */}
      {DC.map(([x, y]) => (
        <g key={y} transform={`translate(${x} ${y})`}>
          <rect x="-14" y="-14" width="28" height="28" rx="5" transform="rotate(45)" fill="#132238" stroke={BLUE} strokeOpacity=".6" />
          <path d="M0 -8V8M-7 -4L7 4M-7 4L7 -4" stroke={BLUE} strokeWidth="1.3" strokeLinecap="round" />
        </g>
      ))}
      <Label x={232} y={130} anchor="middle" fill={`${BLUE}cc`}>2–6 °C</Label>
      {/* hospitals with arrival pulses */}
      {H.map(([x, y], i) => (
        <g key={y} transform={`translate(${x} ${y})`}>
          <circle r="13" fill="none" stroke={RED} strokeWidth="1.2">
            <animate attributeName="r" values="12;22" dur="2.2s" begin={`${0.6 + i * 0.55}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values=".7;0" dur="2.2s" begin={`${0.6 + i * 0.55}s`} repeatCount="indefinite" />
          </circle>
          <rect x="-12" y="-12" width="24" height="24" rx="6" fill={IVORY} />
          <path d="M0 -6.5V6.5M-6.5 0H6.5" stroke={RED} strokeWidth="3" strokeLinecap="round" />
        </g>
      ))}
      {[["COLLECT", 44], ["TEST", 138], ["STORE", 232], ["TRANSFUSE", 346]].map(([t, x]) => <Label key={t} x={x as number} y={250} anchor="middle">{t}</Label>)}
    </g>
  );
}

/* ───────────────────────── 03 Electric three-wheeler side-tipper (rear view, CAD) ───────────────────────── */

const TIP = "0 0;0 0;40 0;40 0;0 0;0 0";
const TIP_TIMES = "0;.18;.42;.68;.92;1";

function Tipper({ u }: { u: U }) {
  const binPts = "110,168 290,168 300,118 100,118";
  return (
    <g>
      <Label x={22} y={28}>REAR VIEW</Label>
      <Label x={22} y={40}>SIDE-TIPPER</Label>
      <Label x={22} y={52} fill={`${BLUE}bb`}>FEA · ILLUSTRATIVE</Label>
      {/* centre line + ground */}
      <path d="M200 60V230" stroke={`${BLUE}55`} strokeDasharray="10 3 2 3" />
      <path d="M30 216H370" stroke={`${IVORY}55`} />
      {Array.from({ length: 17 }, (_, i) => <path key={i} d={`M${36 + i * 20} 216l-8 8`} stroke={`${IVORY}22`} />)}

      {/* falling load (synced with the tip) */}
      {Array.from({ length: 9 }, (_, i) => (
        <circle key={i} r={2 + (i % 3) * 0.7} fill={GOLD} opacity="0">
          <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes={`0;${0.36 + i * 0.012};${0.38 + i * 0.012};.6;.66;1`} dur="7s" repeatCount="indefinite" />
          <animateMotion dur="7s" repeatCount="indefinite" keyPoints="0;0;1;1" keyTimes={`0;${0.37 + i * 0.012};${0.6};1`} calcMode="linear" path={`M${326 + (i % 4) * 4} ${132 + (i % 3) * 5} Q ${348 + i * 3} ${140 + i * 2} ${344 + i * 4} ${212 - (i % 3) * 2}`} />
        </circle>
      ))}
      <path d="M336 216 q 20 -14 44 0z" fill={GOLD} opacity="0">
        <animate attributeName="opacity" values="0;0;.8;.8;0;0" keyTimes="0;.5;.62;.88;.95;1" dur="7s" repeatCount="indefinite" />
      </path>

      {/* hydraulic ram: base fixed on chassis, rod follows bin corner */}
      <line x1="148" y1="182" x2="112" y2="168" stroke={`${IVORY}aa`} strokeWidth="6" strokeLinecap="round">
        <animate attributeName="x2" values="112;112;152;152;112;112" keyTimes={TIP_TIMES} dur="7s" repeatCount="indefinite" />
        <animate attributeName="y2" values="168;168;52;52;168;168" keyTimes={TIP_TIMES} dur="7s" repeatCount="indefinite" />
      </line>
      <line x1="148" y1="182" x2="112" y2="168" stroke={GOLD} strokeWidth="2.2" strokeLinecap="round">
        <animate attributeName="x2" values="112;112;152;152;112;112" keyTimes={TIP_TIMES} dur="7s" repeatCount="indefinite" />
        <animate attributeName="y2" values="168;168;52;52;168;168" keyTimes={TIP_TIMES} dur="7s" repeatCount="indefinite" />
      </line>

      {/* tipping body with FEA colouring and mesh */}
      <g>
        <animateTransform attributeName="transform" type="rotate" values={TIP.split(";").map((v) => `${v.split(" ")[0]} 290 168`).join(";")} keyTimes={TIP_TIMES} dur="7s" repeatCount="indefinite" />
        <polygon points={binPts} fill={u("stress")} stroke={IVORY} strokeOpacity=".7" strokeWidth="1.2" />
        <g clipPath={u("bin")} stroke={`${NAVY}66`} strokeWidth=".7">
          {Array.from({ length: 11 }, (_, i) => <path key={`v${i}`} d={`M${100 + i * 20} 116V170`} />)}
          {Array.from({ length: 3 }, (_, i) => <path key={`h${i}`} d={`M96 ${130 + i * 13}H304`} />)}
        </g>
        <path d="M108 124 q 92 -20 184 0" fill={GOLD} opacity=".85">
          <animate attributeName="opacity" values=".85;.85;0;0;.85;.85" keyTimes="0;.36;.5;.9;.96;1" dur="7s" repeatCount="indefinite" />
        </path>
        <circle cx="290" cy="168" r="3.5" fill={NAVY} stroke={GOLD_L} />
      </g>

      {/* chassis & rear wheels */}
      <rect x="104" y="168" width="192" height="14" rx="3" fill="#17263C" stroke={`${IVORY}88`} />
      {[118, 256].map((x) => (
        <g key={x}>
          <rect x={x} y="176" width="26" height="40" rx="7" fill={NAVY} stroke={`${IVORY}99`} />
          <g clipPath={u(`tyre${x}`)}>
            {Array.from({ length: 7 }, (_, i) => <path key={i} d={`M${x + 3} ${170 + i * 8}h20`} stroke={`${IVORY}33`} strokeWidth="2" />)}
            <animateTransform attributeName="transform" type="translate" values="0 0;0 8" dur=".5s" repeatCount="indefinite" />
          </g>
        </g>
      ))}

      {/* dimensions */}
      <g stroke={`${BLUE}99`} fill="none" strokeWidth=".9">
        <path d="M100 236H300M100 231v10M300 231v10" />
        <path d="M84 118V168M79 118h10M79 168h10" />
      </g>
      <Label x={200} y={250} anchor="middle" fill={`${BLUE}cc`}>BODY WIDTH</Label>
      <Label x={72} y={146} anchor="end" fill={`${BLUE}cc`}>H</Label>
      {/* tip-angle arc */}
      <path d="M314 168 A 24 24 0 0 0 311 156" fill="none" stroke={GOLD_L} strokeWidth="1.2" />
      <Label x={318} y={162} fill={GOLD_L}>θ 35–45°</Label>

      {/* electric drive */}
      <g transform="translate(316 26)">
        <rect width="50" height="20" rx="4" fill="none" stroke={`${IVORY}88`} />
        <rect x="50" y="6" width="3" height="8" rx="1" fill={`${IVORY}88`} />
        <rect x="3" y="3" width="4" height="14" rx="2" fill={GREEN}>
          <animate attributeName="width" values="4;44;44;4" keyTimes="0;.7;.95;1" dur="4s" repeatCount="indefinite" />
        </rect>
        <path d="M27 3l-6 8h5l-3 7 7-9h-5z" fill={GOLD_L} />
      </g>
    </g>
  );
}

/* ───────────────────────── 04 Vehicle routing on a city map ───────────────────────── */

const DEPOT: P = [200, 132];
const STOPS: P[] = [[92, 62], [152, 44], [262, 48], [330, 84], [346, 158], [298, 214], [192, 218], [98, 190], [54, 122]];
const NAIVE = line([DEPOT, STOPS[4], STOPS[0], STOPS[6], STOPS[2], STOPS[8], STOPS[5], STOPS[1], STOPS[7], STOPS[3], DEPOT]);
const BEST = line([DEPOT, ...STOPS, DEPOT]);

function Routing({ u }: { u: U }) {
  return (
    <g>
      {/* city: river, blocks, arterials */}
      <path d="M-10 196 C 80 166, 150 236, 238 192 S 360 150, 410 170" fill="none" stroke="#3E5F8F" strokeOpacity=".35" strokeWidth="16" />
      <path d="M-10 196 C 80 166, 150 236, 238 192 S 360 150, 410 170" fill="none" stroke={BLUE} strokeOpacity=".25" strokeWidth="1" />
      {Array.from({ length: 10 }, (_, i) => <path key={`v${i}`} d={`M${20 + i * 40} 0V260`} stroke={`${IVORY}0c`} />)}
      {Array.from({ length: 7 }, (_, i) => <path key={`h${i}`} d={`M0 ${12 + i * 40}H400`} stroke={`${IVORY}0c`} />)}
      <path d="M0 92 L400 132" stroke={`${IVORY}1c`} strokeWidth="3" />
      <path d="M140 0 L176 260" stroke={`${IVORY}1c`} strokeWidth="3" />

      <path d={NAIVE} fill="none" stroke={STONE} strokeOpacity=".45" strokeWidth="1.2" strokeDasharray="3 4" pathLength={1}>
        <animate attributeName="opacity" values="0;1;1;.25;.25;0" keyTimes="0;.08;.18;.3;.92;1" dur="10s" repeatCount="indefinite" />
      </path>
      <path d={BEST} fill="none" stroke={GOLD} strokeWidth="2.4" strokeLinejoin="round" pathLength={1} strokeDasharray="1" strokeDashoffset="1" filter={u("glow")}>
        <Draw values="1;1;0;0;1" times="0;.2;.45;.94;1" dur="10s" />
      </path>

      {STOPS.map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <g transform="scale(0)">
            <animateTransform attributeName="transform" type="scale" values="0;1.3;1;1;0" keyTimes={`0;${0.02 + i * 0.012};${0.05 + i * 0.012};.95;1`} dur="10s" repeatCount="indefinite" />
            <path d="M0 0 C -7 -9, -7 -16, 0 -17 C 7 -16, 7 -9, 0 0Z" fill={GOLD_L} />
            <circle cy="-11" r="2.6" fill={NAVY} />
          </g>
        </g>
      ))}
      <g transform={`translate(${DEPOT[0]} ${DEPOT[1]})`}>
        <circle r="14" fill="none" stroke={GOLD} strokeOpacity=".5">
          <animate attributeName="r" values="10;20" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values=".8;0" dur="2s" repeatCount="indefinite" />
        </circle>
        <rect x="-8" y="-8" width="16" height="16" rx="3" fill={GOLD} />
        <path d="M-4 1h8v4h-8zM-3 1v-3h6v3" fill={NAVY} />
      </g>

      {/* the van drives the optimized route */}
      <g opacity="0">
        <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;.44;.46;.93;.95;1" dur="10s" repeatCount="indefinite" />
        <animateMotion dur="10s" repeatCount="indefinite" rotate="auto" keyPoints="0;0;1;1" keyTimes="0;.46;.93;1" calcMode="linear" path={BEST} />
        <rect x="-8" y="-4.5" width="12" height="9" rx="1.5" fill={IVORY} />
        <path d="M4 -3.5h3.5l2.5 3v4h-6z" fill={GOLD_L} />
      </g>

      <rect x="12" y="214" width="124" height="38" rx="8" fill={`${NAVY}d9`} stroke={`${IVORY}22`} />
      <path d="M22 228h16" stroke={STONE} strokeDasharray="3 3" />
      <Label x={44} y={231}>VISIT ORDER</Label>
      <path d="M22 242h16" stroke={GOLD} strokeWidth="2.4" />
      <Label x={44} y={245} fill={GOLD_L}>OPTIMIZED · 2-OPT</Label>
    </g>
  );
}

/* ───────────────────────── 05 Library redesign · isometric + AR scan ───────────────────────── */

const iso = (x: number, y: number, z = 0): P => [200 + (x - y) * 8.66, 58 + (x + y) * 5 - z * 10];
const pts = (...p: P[]) => p.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(" ");
function Box({ x, y, w, d, h, glass }: { x: number; y: number; w: number; d: number; h: number; glass?: boolean }) {
  const top = pts(iso(x, y, h), iso(x + w, y, h), iso(x + w, y + d, h), iso(x, y + d, h));
  const left = pts(iso(x, y + d, 0), iso(x + w, y + d, 0), iso(x + w, y + d, h), iso(x, y + d, h));
  const right = pts(iso(x + w, y, 0), iso(x + w, y + d, 0), iso(x + w, y + d, h), iso(x + w, y, h));
  const s = { stroke: `${IVORY}40`, strokeWidth: 0.8 };
  return glass ? (
    <g>
      <polygon points={left} fill={GOLD} fillOpacity=".1" {...s} />
      <polygon points={right} fill={GOLD} fillOpacity=".16" {...s} />
      <polygon points={top} fill={GOLD} fillOpacity=".22" {...s} />
    </g>
  ) : (
    <g>
      <polygon points={left} fill="#1A2940" {...s} />
      <polygon points={right} fill="#121E31" {...s} />
      <polygon points={top} fill="#25364F" {...s} />
      {/* shelf lines on the front face */}
      {[1, 2].map((z) => <polyline key={z} points={pts(iso(x, y + d, z), iso(x + w, y + d, z))} stroke={`${GOLD}66`} strokeWidth=".8" fill="none" />)}
    </g>
  );
}
const scan = (t: number) => pts(iso(t, 0, 0), iso(t, 16, 0), iso(t, 16, 4.2), iso(t, 0, 4.2));

function Library() {
  const pins: { at: P; label: string; t: number }[] = [
    { at: iso(5, 5.5, 3.6), label: "BROWSE", t: 0.3 },
    { at: iso(11.5, 4.5, 2.2), label: "COLLABORATE", t: 0.68 },
    { at: iso(12.5, 12, 3.2), label: "STUDY", t: 0.76 },
  ];
  return (
    <g>
      <polygon points={pts(iso(0, 0), iso(16, 0), iso(16, 16), iso(0, 16))} fill={`${IVORY}06`} stroke={`${IVORY}2a`} />
      {Array.from({ length: 7 }, (_, i) => (
        <g key={i} stroke={`${IVORY}10`}>
          <polyline points={pts(iso((i + 1) * 2, 0), iso((i + 1) * 2, 16))} fill="none" />
          <polyline points={pts(iso(0, (i + 1) * 2), iso(16, (i + 1) * 2))} fill="none" />
        </g>
      ))}
      {[2, 5, 8, 11].map((y) => <Box key={y} x={2} y={y} w={6} d={1} h={3} />)}
      {/* collaboration table + seats */}
      <ellipse cx={iso(12, 5)[0]} cy={iso(12, 5, 1)[1]} rx="22" ry="12" fill="#25364F" stroke={`${IVORY}40`} />
      {[[10, 3.4], [14, 3.4], [10, 6.6], [14, 6.6]].map(([x, y]) => <Box key={`${x}${y}`} x={x - 0.5} y={y - 0.5} w={1} d={1} h={0.8} />)}
      {/* glass study pods */}
      <Box x={10.5} y={10} w={2.5} d={4} h={2.6} glass />
      <Box x={13.5} y={10} w={2} d={4} h={2.6} glass />

      {/* AR scan plane sweeping the floor */}
      <polygon points={scan(0)} fill={BLUE} fillOpacity=".12" stroke={BLUE} strokeOpacity=".7" strokeWidth="1">
        <animate attributeName="points" values={`${scan(0)};${scan(16)};${scan(16)}`} keyTimes="0;.85;1" dur="6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;1;0" keyTimes="0;.85;1" dur="6s" repeatCount="indefinite" />
      </polygon>
      {pins.map((p) => (
        <g key={p.label} opacity="0">
          <animate attributeName="opacity" values="0;0;1;1;0" keyTimes={`0;${p.t};${p.t + 0.04};.94;1`} dur="6s" repeatCount="indefinite" />
          <line x1={p.at[0]} y1={p.at[1]} x2={p.at[0]} y2={p.at[1] - 18} stroke={BLUE} strokeOpacity=".8" />
          <circle cx={p.at[0]} cy={p.at[1]} r="3" fill={BLUE} />
          <rect x={p.at[0] - 40} y={p.at[1] - 32} width="80" height="15" rx="7.5" fill={NAVY} stroke={BLUE} strokeOpacity=".8" />
          <Label x={p.at[0]} y={p.at[1] - 21.5} anchor="middle" fill={IVORY}>{p.label}</Label>
        </g>
      ))}
      {/* phone viewfinder corners */}
      <g stroke={IVORY} strokeOpacity=".6" strokeWidth="1.5" fill="none">
        <path d="M22 40V24h16M378 40V24h-16M22 220v16h16M378 220v16h-16" />
      </g>
      <Label x={30} y={232}>AR · REDESIGN PREVIEW</Label>
    </g>
  );
}

/* ───────────────────────── 06 Lean · value stream map ───────────────────────── */

const BOXES = [{ x: 30, t: "RECEIVE" }, { x: 122, t: "INSPECT" }, { x: 214, t: "STORE" }, { x: 306, t: "ISSUE" }];
const FLOW_PATH = "M14 134 H390";
const frac = (x: number) => ((x - 14) / 376).toFixed(3);

function Lean({ u }: { u: U }) {
  const stops = [60, 106, 152, 198, 244, 290, 336];
  const kp = ["0", ...stops.flatMap((x) => [frac(x), frac(x)]), "1"].join(";");
  // dwell longer in the inventory triangles (waiting = waste) than in process steps
  const kt = "0;.05;.1;.18;.34;.4;.46;.52;.72;.78;.84;.88;.92;.95;.98;1";
  return (
    <g>
      {/* supplier → plan → customer information flow */}
      <path d="M22 50 v-14 l8 6 v-6 l8 6 v-6 l8 6 v14z" fill="none" stroke={`${IVORY}88`} />
      <path d="M354 50 v-14 l8 6 v-6 l8 6 v-6 l8 6 v14z" fill="none" stroke={`${IVORY}88`} />
      <rect x="170" y="22" width="60" height="22" rx="4" fill="#17263C" stroke={`${IVORY}55`} />
      <Label x={200} y={36} anchor="middle" fill={IVORY}>PLANNING</Label>
      <path d="M170 33 H 52 M230 33 H 350" stroke={`${IVORY}44`} strokeDasharray="4 3" fill="none" />
      <path d="M200 44 V 98" stroke={`${IVORY}33`} strokeDasharray="4 3" />

      {/* process boxes */}
      {BOXES.map((b, i) => (
        <g key={b.t}>
          <rect x={b.x} y="104" width="64" height="62" rx="5" fill="#132238" stroke={i === 2 ? RED : `${IVORY}55`} strokeWidth={i === 2 ? 1.4 : 1} />
          <rect x={b.x} y="104" width="64" height="15" rx="5" fill={i === 2 ? `${RED}44` : `${GOLD}33`} />
          <Label x={b.x + 32} y={115} anchor="middle" fill={IVORY}>{b.t}</Label>
          <rect x={b.x + 8} y="154" width="48" height="4" rx="2" fill={`${IVORY}14`} />
          <rect x={b.x + 8} y="154" width="4" height="4" rx="2" fill={i === 2 ? RED : GOLD}>
            <animate attributeName="width" values="4;48;4" dur={`${i === 2 ? 3.4 : 1.6 + i * 0.2}s`} repeatCount="indefinite" />
          </rect>
        </g>
      ))}
      {/* inventory between steps */}
      {[106, 198, 290].map((x, i) => (
        <g key={x}>
          <path d={`M${x - 8} 152 L${x} 138 L${x + 8} 152Z`} fill={i === 1 ? `${RED}55` : `${GOLD}33`} stroke={i === 1 ? RED : GOLD} strokeWidth="1" />
          <Label x={x} y={150} anchor="middle" fill={IVORY}>I</Label>
        </g>
      ))}
      {/* kaizen burst on the bottleneck */}
      <g transform="translate(284 96)">
        <polygon points="0,-14 4,-5 13,-8 8,0 14,7 4,6 2,15 -3,7 -12,10 -7,1 -14,-5 -4,-5" fill={RED} opacity=".85">
          <animateTransform attributeName="transform" type="scale" values="1;1.18;1" dur="1.8s" repeatCount="indefinite" />
        </polygon>
      </g>

      {/* work items flowing, queueing at inventory */}
      {Array.from({ length: 6 }, (_, i) => (
        <rect key={i} x="-4" y="-4" width="8" height="8" rx="2" fill={GOLD_L} filter={u("glow")} opacity="0">
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.04;.95;1" dur="9s" begin={`${i * 1.5}s`} repeatCount="indefinite" />
          <animateMotion dur="9s" begin={`${i * 1.5}s`} repeatCount="indefinite" path={FLOW_PATH} keyPoints={kp} keyTimes={kt} calcMode="linear" />
        </rect>
      ))}

      {/* timeline ladder: value-added vs waiting */}
      <path d="M30 222 H94 V204 H122 V222 H186 V204 H214 V222 H278 V204 H306 V222 H370" fill="none" stroke={`${IVORY}66`} strokeWidth="1.2" />
      <path d="M30 222 H94 V204 H122 V222 H186 V204 H214 V222 H278 V204 H306 V222 H370" fill="none" stroke={GOLD} strokeWidth="2" pathLength={1} strokeDasharray="1" strokeDashoffset="1">
        <Draw values="1;0;0;1" times="0;.6;.95;1" dur="9s" />
      </path>
      <Label x={30} y={240}>VALUE-ADDED</Label>
      <Label x={370} y={240} anchor="end">WAITING</Label>
    </g>
  );
}

/* ───────────────────────── 07 Healthcare patient flow ───────────────────────── */

const BAYS = [52, 112, 172];
const CHAIRS = [84, 106, 128, 150, 172, 194];

function Queue({ u }: { u: U }) {
  return (
    <g>
      <g transform="translate(0 24)">
      {/* entrance */}
      <path d="M16 170 V134 a14 14 0 0 1 28 0 V170" fill="none" stroke={`${IVORY}88`} strokeWidth="1.4" />
      <Label x={30} y={186} anchor="middle">ARRIVE</Label>
      {/* waiting room */}
      <rect x="70" y="122" width="138" height="54" rx="8" fill={`${IVORY}06`} stroke={`${IVORY}22`} strokeDasharray="3 3" />
      <Label x={139} y={192} anchor="middle">WAIT</Label>
      {CHAIRS.map((x) => <rect key={x} x={x - 7} y="152" width="14" height="10" rx="3" fill="#1A2940" stroke={`${IVORY}33`} />)}

      {/* treatment bays with monitors */}
      {BAYS.map((y, i) => (
        <g key={y}>
          <rect x="236" y={y - 22} width="92" height="44" rx="7" fill="#132238" stroke={`${IVORY}44`} />
          <rect x="246" y={y + 2} width="34" height="10" rx="3" fill="#25364F" />
          <rect x="246" y={y - 2} width="10" height="6" rx="2" fill={`${IVORY}55`} />
          <path d={`M288 ${y - 4} h8 l3 -8 l4 14 l3 -10 l2 4 h14`} fill="none" stroke={GREEN} strokeWidth="1.3" strokeDasharray="44" strokeDashoffset="44">
            <animate attributeName="stroke-dashoffset" values="44;0;-44" dur={`${1.2 + i * 0.15}s`} repeatCount="indefinite" />
          </path>
          <circle cx="318" cy={y + 10} r="6" fill="none" stroke={`${IVORY}22`} strokeWidth="2" />
          <circle cx="318" cy={y + 10} r="6" fill="none" stroke={GOLD} strokeWidth="2" pathLength={1} strokeDasharray="1" transform={`rotate(-90 318 ${y + 10})`}>
            <animate attributeName="stroke-dashoffset" values="1;0" dur={`${3 + i * 0.6}s`} repeatCount="indefinite" />
          </circle>
        </g>
      ))}
      <Label x={282} y={214} anchor="middle">TREAT</Label>
      {/* exit */}
      <path d="M352 76 H376 M352 112 H384 M352 148 H376" stroke={`${IVORY}22`} />
      <path d="M372 104 l8 8 l-8 8" fill="none" stroke={`${IVORY}88`} strokeWidth="1.4" />
      <Label x={368} y={186} anchor="middle">DISCHARGE</Label>

      {/* patients: arrive → wait in a chair → bay → leave */}
      {Array.from({ length: 6 }, (_, i) => {
        const cx = CHAIRS[i], by = BAYS[i % 3];
        const p = `M30 160 L${cx} 146 L${cx} 146 L262 ${by - 6} L262 ${by - 6} L390 ${by - 6}`;
        return (
          <g key={i} opacity="0">
            <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.05;.94;1" dur="10.8s" begin={`${i * 1.8}s`} repeatCount="indefinite" />
            <animateMotion dur="10.8s" begin={`${i * 1.8}s`} repeatCount="indefinite" path={p} keyPoints="0;.18;.18;.62;.62;1" keyTimes="0;.12;.42;.52;.84;1" calcMode="linear" />
            <circle r="5.5" fill={IVORY} filter={u("glow")} />
            <circle r="8" fill="none" stroke={GOLD} strokeOpacity=".7" />
          </g>
        );
      })}
      </g>

      {/* live queue-length trace */}
      <rect x="16" y="16" width="150" height="60" rx="8" fill={`${NAVY}cc`} stroke={`${IVORY}22`} />
      <Label x={26} y={30}>QUEUE LENGTH · LIVE</Label>
      <g clipPath={u("trace")}>
        <g>
          <animateTransform attributeName="transform" type="translate" values="0 0;-120 0" dur="6s" repeatCount="indefinite" />
          <path d="M20 64 L32 60 L44 62 L56 52 L68 56 L80 46 L92 50 L104 58 L116 54 L128 48 L140 52 L152 44 L164 50 L176 58 L188 54 L200 46 L212 52 L224 56 L236 50 L248 60 L260 56 L272 52 L284 60" fill="none" stroke={GOLD_L} strokeWidth="1.5" />
        </g>
      </g>
    </g>
  );
}

/* ───────────────────────── shell ───────────────────────── */

export default function ProjectVisual({ kind }: { kind: Project["visual"] }) {
  const id = "pv" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const ref = useRef<SVGSVGElement>(null);
  const u: U = (name) => `url(#${id}-${name})`;

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) ref.current?.pauseAnimations();
  }, []);

  return (
    <svg ref={ref} className={`pv pv-${kind}`} viewBox="0 0 400 260" aria-hidden="true">
      <defs>
        <pattern id={`${id}-grid`} width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" stroke={`${IVORY}0b`} />
        </pattern>
        <radialGradient id={`${id}-vignette`} cx="55%" cy="40%" r="75%">
          <stop offset="0" stopColor="#1C3150" />
          <stop offset="1" stopColor={NAVY} />
        </radialGradient>
        <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".06" />
          <stop offset=".4" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-blood`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F06A5E" />
          <stop offset="1" stopColor="#8E2424" />
        </linearGradient>
        <linearGradient id={`${id}-stress`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2E5A9C" />
          <stop offset=".45" stopColor="#3F8A8A" />
          <stop offset=".75" stopColor="#C5A572" />
          <stop offset="1" stopColor="#C8634A" />
        </linearGradient>
        <filter id={`${id}-glow`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.2" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <clipPath id={`${id}-bin`}><polygon points="110,168 290,168 300,118 100,118" /></clipPath>
        <clipPath id={`${id}-tyre118`}><rect x="118" y="176" width="26" height="40" rx="7" /></clipPath>
        <clipPath id={`${id}-tyre256`}><rect x="256" y="176" width="26" height="40" rx="7" /></clipPath>
        <clipPath id={`${id}-trace`}><rect x="20" y="36" width="140" height="36" /></clipPath>
      </defs>
      <rect width="400" height="260" fill={u("vignette")} />
      <rect width="400" height="260" fill={u("grid")} />
      {kind === "dashboard" && <Dashboard u={u} />}
      {kind === "network" && <Network u={u} />}
      {kind === "tipper" && <Tipper u={u} />}
      {kind === "routing" && <Routing u={u} />}
      {kind === "library" && <Library />}
      {kind === "lean" && <Lean u={u} />}
      {kind === "queue" && <Queue u={u} />}
    </svg>
  );
}
