export type Country = {
  code: string | null;
  name: string;
  /** polígonos -> anéis -> [lon, lat, lon, lat, ...] (primeiro anel é o externo, demais são furos) */
  polygons: number[][][];
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const countries = require('../data/countries.json') as Country[];

export const DEG = Math.PI / 180;

/** lat/lon (graus) -> ponto na esfera de raio r. Compatível com o mapeamento UV da SphereGeometry do three. */
export function latLonToXYZ(lat: number, lon: number, r = 1): [number, number, number] {
  const la = lat * DEG;
  const lo = lon * DEG;
  return [r * Math.cos(la) * Math.cos(lo), r * Math.sin(la), -r * Math.cos(la) * Math.sin(lo)];
}

/** Inverso de latLonToXYZ (o vetor precisa estar no espaço local do globo). */
export function xyzToLatLon(x: number, y: number, z: number) {
  const r = Math.sqrt(x * x + y * y + z * z) || 1;
  return { lat: Math.asin(y / r) / DEG, lon: Math.atan2(-z, x) / DEG };
}

type Bounds = [number, number, number, number];
const boundsCache = new Map<number[][], Bounds>();

function polyBounds(poly: number[][]): Bounds {
  let b = boundsCache.get(poly);
  if (b) return b;
  const outer = poly[0];
  let minX = 180, maxX = -180, minY = 90, maxY = -90;
  for (let i = 0; i < outer.length; i += 2) {
    if (outer[i] < minX) minX = outer[i];
    if (outer[i] > maxX) maxX = outer[i];
    if (outer[i + 1] < minY) minY = outer[i + 1];
    if (outer[i + 1] > maxY) maxY = outer[i + 1];
  }
  b = [minX, minY, maxX, maxY];
  boundsCache.set(poly, b);
  return b;
}

function inRing(ring: number[], x: number, y: number) {
  let inside = false;
  for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
    const xi = ring[i], yi = ring[i + 1], xj = ring[j], yj = ring[j + 1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function inPolygon(poly: number[][], lon: number, lat: number) {
  const [minX, minY, maxX, maxY] = polyBounds(poly);
  if (lon < minX || lon > maxX || lat < minY || lat > maxY) return false;
  if (!inRing(poly[0], lon, lat)) return false;
  for (let h = 1; h < poly.length; h++) if (inRing(poly[h], lon, lat)) return false;
  return true;
}

export function findCountry(lat: number, lon: number): Country | null {
  for (const c of countries) {
    for (const poly of c.polygons) if (inPolygon(poly, lon, lat)) return c;
  }
  return null;
}

export function getCountryByCode(code: string): Country | undefined {
  return countries.find((c) => c.code === code);
}

export function flagEmoji(code: string | null | undefined) {
  if (!code || code.length !== 2) return '🌐';
  return String.fromCodePoint(...code.toUpperCase().split('').map((ch) => 127397 + ch.charCodeAt(0)));
}
