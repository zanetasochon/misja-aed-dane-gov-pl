/**
 * HackNation 2026 – Misja AED. Plik dodany do forka portalu dane.gov.pl (GPL-3.0), 2026-11-21.
 * Wspólne funkcje geometrii dla harmonizacji i narzędzia zgodności.
 */

/** Punkt z GeoJSON w komórce, np. {"type":"Point","coordinates":[22.77,49.78]} → [lon, lat]. */
export function punktZGeoJson(v: string): [number, number] | null {
  try {
    const g = JSON.parse(v) as { type?: string; coordinates?: unknown };
    const c = g.coordinates;
    if (g.type === 'Point' && Array.isArray(c) && typeof c[0] === 'number' && typeof c[1] === 'number')
      return [c[0], c[1]];
  } catch {
    return null;
  }
  return null;
}

/** Odległość w metrach (wzór haversine, promień Ziemi 6 371 km). */
export function odlegloscM(a: { szer: number; dlug: number }, b: { szer: number; dlug: number }): number {
  const R = 6371000;
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b.szer - a.szer);
  const dLon = rad(b.dlug - a.dlug);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.szer)) * Math.cos(rad(b.szer)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
