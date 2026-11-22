/**
 * HackNation 2026 – Misja AED. Plik dodany do forka portalu dane.gov.pl (GPL-3.0), 2026-11-21.
 * Odległość między punktami (wyszukiwanie w pobliżu, wykrywanie duplikatów).
 */

/** Odległość w metrach (wzór haversine, promień Ziemi 6 371 km). */
export function odlegloscM(a: { szer: number; dlug: number }, b: { szer: number; dlug: number }): number {
  const R = 6371000;
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b.szer - a.szer);
  const dLon = rad(b.dlug - a.dlug);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.szer)) * Math.cos(rad(b.szer)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
