// Lightweight, dependency-free geography: simplified continent outlines (lon, lat),
// an equirectangular projection, a dotted land texture, and great-circle routes.

type Ring = [number, number][];

const LAND: Ring[] = [
  // North America
  [[-168,66],[-162,70],[-156,71.3],[-140,69.6],[-128,70],[-115,68.5],[-95,72],[-82,73],[-70,67],[-62,60],[-56,52],[-66,45],[-70,43],[-76,38],[-76,35],[-81,31],[-80,25.5],[-82,27],[-84,30],[-90,29.5],[-97,27],[-97.5,22],[-94,18.5],[-88,21],[-87,15.5],[-83,14],[-80,8],[-78,7.5],[-83,8.5],[-86,11.5],[-92,14.5],[-99,16.5],[-105,20],[-109,24],[-112,29],[-114.5,31],[-110,23],[-115,28],[-117,32.5],[-121,35],[-124,40],[-124,47],[-126,51],[-133,56],[-140,60],[-148,61],[-154,58],[-158,56],[-165,54.5],[-160,59],[-165,62],[-168,66]],
  // Canadian Arctic islands
  [[-120,74],[-95,76],[-80,74],[-70,78],[-62,82],[-90,82],[-115,78]],
  // Greenland
  [[-73,78],[-60,82],[-30,83],[-20,80],[-18,75],[-22,70],[-32,68],[-42,60],[-50,62],[-54,67],[-58,74]],
  // Iceland
  [[-24,65.5],[-22,66.4],[-15,66.5],[-13.5,65],[-18,63.4],[-22,63.8]],
  // South America
  [[-80,9],[-72,12],[-62,10.5],[-52,5],[-50,0],[-44,-2],[-35,-5],[-35,-9],[-39,-15],[-41,-22],[-48,-26],[-53,-34],[-58,-38],[-62,-41],[-65,-45],[-68,-51],[-70,-55],[-74,-52],[-74,-44],[-73,-37],[-71,-30],[-70,-18],[-76,-14],[-81,-6],[-80,-1],[-77,4],[-78,7]],
  // Europe
  [[-10,36],[-9,43],[-2,43.5],[-1.5,46.5],[-4.5,48.5],[2,51],[5,53.5],[8.5,57],[10.5,54.5],[12.5,54.3],[18,54.8],[21,56.5],[23.5,59.5],[29,60],[22,60.5],[21.5,63],[25,65.5],[22,65.8],[18,62.5],[17.5,60.5],[19,59.5],[16,56],[12.5,56],[11,58.5],[8,58],[5,59],[5,62],[10,63.5],[14,67],[19,70],[25,71],[31,70],[40,67],[44,68],[60,69],[60,45],[50,45],[47,41],[41,41.5],[37,45],[30,46],[28.5,43],[26,40.5],[23,40],[24,37.5],[21.5,37],[19.5,41.5],[13.5,45.5],[12.5,44],[16,41],[18.5,40],[16,38],[15.5,40],[12,42],[10.5,43.5],[8.5,44.3],[3,43.3],[3.2,42],[0,39.5],[-0.5,38],[-2,36.7],[-5.5,36],[-7,37],[-9,37]],
  // Great Britain & Ireland
  [[-5.5,50],[1.5,51],[1.7,52.8],[0,54],[-2,55.8],[-1.8,57.6],[-3,58.6],[-5,58.6],[-6,56.5],[-5,54.8],[-3,54],[-4.5,53.3],[-4.3,52],[-5.3,51.7],[-3.5,51.4]],
  [[-10,51.5],[-6,52],[-6,54],[-7.5,55.3],[-10,54.2]],
  // Asia (incl. Arabia and the Indian subcontinent)
  [[60,69],[70,73],[80,73.5],[100,78],[113,74],[130,71],[140,72],[160,70],[170,70],[180,68],[180,65],[178,62],[172,60],[163,58],[162,55],[156,51],[156,57],[160,61],[155,59.5],[143,59],[137,54],[140,48],[135,43],[130,42.5],[129,35.5],[126.5,34.5],[126,37.5],[125,39.5],[121,40.5],[122,37],[119,35],[121.5,31],[122,29],[119.5,25],[116,22.7],[110,21],[109,18],[106,20],[108,15],[109,11.5],[105,8.6],[103,10.5],[100.5,13.5],[100,8],[103.5,1.3],[101,3],[98,8],[98.5,16],[94.5,16],[94,19],[92,22],[89,21.8],[86.5,20],[80.5,15.5],[80,10],[77.5,8],[76,10],[73,17],[72.8,21],[70,22.5],[67,24.8],[61.5,25],[57,25.8],[56.3,27],[51.5,27.9],[50,30],[48,29.5],[50.5,25.5],[51.5,24.2],[56,26],[58.5,23.5],[59.8,22.4],[55,17],[52,16],[45,13],[43,13],[42.5,15.5],[39,21],[35,28],[34.5,29.5],[32.5,31.5],[35,32.5],[36,35.5],[36,36.7],[30,36.3],[27,37],[26.5,39.5],[29,41],[41,41.5],[47,41],[50,45],[60,45]],
  // Sri Lanka, Japan, SE Asian islands
  [[80,6],[82,7],[81.5,9],[80,9.8]],
  [[130,31],[132,34],[135,34],[140,35.5],[141.5,38],[142,40],[141,42],[145.5,43.5],[141.5,45.5],[140,42],[139.8,40],[137,37],[133,35.5],[130,33.5]],
  [[95,5.5],[98,4],[104,-1],[106,-6],[102,-4],[96,2]],
  [[109,1.5],[111,-3],[116,-4],[119,1],[117,7],[113,4]],
  [[105,-6],[114,-7],[114,-8.5],[106,-7.5]],
  // Africa & Madagascar
  [[-17,21],[-16.5,15],[-17.5,14.7],[-15,11],[-12,7],[-7.5,4.5],[-2,4.8],[2,6.2],[6,4.3],[9.5,3.9],[9.5,1],[13,-5],[12,-14],[11.8,-17],[15,-27],[18,-33],[20,-35],[26,-34],[32,-28.5],[35.5,-24],[35,-19],[40.5,-15],[40,-10],[39.5,-6],[41,-2],[43.5,2],[48,5.5],[51.2,11.8],[45,10.5],[43.3,11.5],[39,17],[37,21],[35.5,23.5],[34,26.8],[32.5,30],[32.5,31.5],[29,31],[25,31.6],[20,30.8],[19.5,32],[15,32.2],[11.5,33.5],[10,37],[3,36.8],[-2,35.2],[-5.5,35.8],[-9.5,32],[-9.8,29.5],[-13,27.8]],
  [[44,-25],[47,-25],[50.5,-15.5],[49.5,-12],[47.5,-14],[44,-17]],
  // Australia
  [[114,-22],[122,-18],[130,-12],[136,-12],[137,-16],[141,-12],[144,-14],[146,-19],[153,-25],[153,-29],[150,-37],[144,-38.5],[140,-38],[135,-35],[131,-31.5],[124,-34],[115,-34],[114,-26]],
];

const WATER: Ring[] = [
  [[-95,59],[-87,56],[-80,52],[-79,57],[-77,62],[-85,63],[-93,64]], // Hudson Bay
  [[47,45],[53,46.5],[54,41],[53,37],[49,37.5],[49.5,40.5]], // Caspian Sea
];

function inRing(lon: number, lat: number, ring: Ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const isLand = (lon: number, lat: number) => LAND.some((r) => inRing(lon, lat, r)) && !WATER.some((r) => inRing(lon, lat, r));

export type Bounds = { lonMin: number; lonMax: number; latMin: number; latMax: number };

export function projector(b: Bounds, width: number) {
  const height = (width * (b.latMax - b.latMin)) / (b.lonMax - b.lonMin);
  const project = (lon: number, lat: number): [number, number] => [
    ((lon - b.lonMin) / (b.lonMax - b.lonMin)) * width,
    ((b.latMax - lat) / (b.latMax - b.latMin)) * height,
  ];
  return { width, height, project };
}

const f = (n: number) => n.toFixed(1);

const dotCache = new Map<string, string>();

/** A single SVG path containing one small circle for each land grid point. */
export function landDots(b: Bounds, width: number, step: number, r: number) {
  const key = `${b.lonMin},${b.lonMax},${b.latMin},${b.latMax},${width},${step},${r}`;
  const hit = dotCache.get(key);
  if (hit) return hit;
  const { project } = projector(b, width);
  let d = "";
  for (let lat = b.latMax - step / 2; lat > b.latMin; lat -= step) {
    // offset alternate rows for a finer, woven texture
    const offset = Math.round((b.latMax - lat) / step) % 2 ? step / 2 : 0;
    for (let lon = b.lonMin + step / 2 + offset; lon < b.lonMax; lon += step) {
      if (!isLand(lon, lat)) continue;
      const [x, y] = project(lon, lat);
      d += `M${f(x - r)} ${f(y)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
    }
  }
  dotCache.set(key, d);
  return d;
}

const rad = Math.PI / 180;

function toVec(lon: number, lat: number) {
  return [Math.cos(lat * rad) * Math.cos(lon * rad), Math.cos(lat * rad) * Math.sin(lon * rad), Math.sin(lat * rad)];
}

/** Points along the great circle between two places (spherical interpolation). */
export function greatCircle(a: [number, number], b: [number, number], n = 72): [number, number][] {
  const va = toVec(...a);
  const vb = toVec(...b);
  const omega = Math.acos(Math.min(1, va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]));
  const out: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const s1 = Math.sin((1 - t) * omega) / Math.sin(omega);
    const s2 = Math.sin(t * omega) / Math.sin(omega);
    const v = [s1 * va[0] + s2 * vb[0], s1 * va[1] + s2 * vb[1], s1 * va[2] + s2 * vb[2]];
    out.push([Math.atan2(v[1], v[0]) / rad, Math.asin(v[2]) / rad]);
  }
  return out;
}

export function routePath(points: [number, number][], b: Bounds, width: number) {
  const { project } = projector(b, width);
  return points.map(([lon, lat], i) => {
    const [x, y] = project(lon, lat);
    return `${i ? "L" : "M"}${f(x)} ${f(y)}`;
  }).join("");
}

/** Great-circle distance in kilometres. */
export function distanceKm(a: [number, number], b: [number, number]) {
  const va = toVec(...a);
  const vb = toVec(...b);
  return 6371 * Math.acos(va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]);
}

// [lon, lat]
export const places = {
  bengaluru: [77.59, 12.97] as [number, number],
  boston: [-71.06, 42.36] as [number, number],
  willmar: [-95.04, 45.12] as [number, number],
};

export const formatCoord = ([lon, lat]: [number, number]) =>
  `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? "N" : "S"} · ${Math.abs(lon).toFixed(2)}° ${lon >= 0 ? "E" : "W"}`;
