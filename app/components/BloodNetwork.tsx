// Conceptual schematic of a multi-echelon blood supply chain. Not model output.

const collection = [90, 210, 330].map((y) => [90, y] as const);
const processing = [330, 210] as const;
const dcs = [[560, 130], [560, 290]] as const;
const hospitals = [50, 130, 210, 290, 370].map((y) => [800, y] as const);
const servedBy = [0, 0, 0, 1, 1];

const seg = (a: readonly [number, number], b: readonly [number, number]) => `M${a[0]} ${a[1]} L${b[0]} ${b[1]}`;

const journeys = [
  [collection[0], processing, dcs[0], hospitals[0]],
  [collection[1], processing, dcs[0], hospitals[2]],
  [collection[2], processing, dcs[1], hospitals[4]],
  [collection[1], processing, dcs[1], hospitals[3]],
  [collection[0], processing, dcs[0], hospitals[1]],
].map((pts) => pts.map((p, i) => `${i ? "L" : "M"}${p[0]} ${p[1]}`).join(""));

const transfers = [0, 1, 2, 3].map((i) => {
  const [x, y1] = hospitals[i];
  const y2 = hospitals[i + 1][1];
  return `M${x} ${y1} C ${x + 55} ${y1 + 15}, ${x + 55} ${y2 - 15}, ${x} ${y2}`;
});

export default function BloodNetwork() {
  return (
    <figure className="blood-network">
      <svg viewBox="0 0 900 420" role="img" aria-label="Schematic: blood flows from collection sites to a processing and testing center, then to distribution centers and hospitals, with transshipment links between hospitals.">
        <g className="bn-heads">
          <text x="90" y="16">Collection</text>
          <text x="330" y="16">Processing &amp; testing</text>
          <text x="560" y="16">Distribution</text>
          <text x="800" y="16">Hospitals</text>
        </g>
        <g className="bn-edges">
          {collection.map((c) => <path key={c[1]} d={seg(c, processing)} />)}
          {dcs.map((d) => <path key={d[1]} d={seg(processing, d)} />)}
          {hospitals.map((h, i) => <path key={h[1]} d={seg(dcs[servedBy[i]], h)} />)}
        </g>
        <g className="bn-transfers">{transfers.map((d) => <path key={d} d={d} />)}</g>

        <g className="bn-units">
          {journeys.map((d, i) => (
            <circle key={i} r="5">
              <animateMotion dur="6s" begin={`${i * 1.2}s`} repeatCount="indefinite" path={d} />
              <animate attributeName="opacity" values="0;1;1;0.35" keyTimes="0;0.08;0.75;1" dur="6s" begin={`${i * 1.2}s`} repeatCount="indefinite" />
            </circle>
          ))}
          <circle r="4" className="bn-transfer-unit">
            <animateMotion dur="4s" begin="2s" repeatCount="indefinite" path={transfers[1]} />
          </circle>
        </g>

        <g className="bn-nodes">
          {collection.map(([x, y]) => <path key={y} className="bn-drop" d={`M${x} ${y - 16} C ${x + 12} ${y - 2}, ${x + 12} ${y + 12}, ${x} ${y + 12} C ${x - 12} ${y + 12}, ${x - 12} ${y - 2}, ${x} ${y - 16}Z`} />)}
          <rect className="bn-center" x={processing[0] - 30} y={processing[1] - 22} width="60" height="44" rx="8" />
          {dcs.map(([x, y]) => <rect key={y} className="bn-dc" x={x - 20} y={y - 20} width="40" height="40" rx="4" transform={`rotate(45 ${x} ${y})`} />)}
          {hospitals.map(([x, y]) => (
            <g key={y} className="bn-hospital">
              <rect x={x - 16} y={y - 16} width="32" height="32" rx="5" />
              <path d={`M${x} ${y - 8} v16 M${x - 8} ${y} h16`} />
            </g>
          ))}
        </g>
      </svg>
      <figcaption>
        <span><i className="lg-flow" />Flow of blood units</span>
        <span><i className="lg-transfer" />Inter-hospital transshipment</span>
        <em>Conceptual schematic of the system studied — illustrative only, not simulation output or findings.</em>
      </figcaption>
    </figure>
  );
}
