/**
 * HackNation 2026 – Misja AED. Plik dodany do forka portalu dane.gov.pl (GPL-3.0), 2026-11-22.
 *
 * Link do trasy pieszej w Google Maps (Maps URLs, bez klucza API). Cel – współrzędne AED. Punkt startowy:
 * podana lokalizacja (w wersji pokazowej przykładowa, w promieniu 250 m), a bez niej – bieżąca lokalizacja
 * w aplikacji lub przeglądarce. Nic nie jest wysyłane, dopóki ktoś nie kliknie.
 */

export function trasaDoAed(
  r: { szerokosc_geograficzna_aed: number | null; dlugosc_geograficzna_aed: number | null },
  start?: { szer: number; dlug: number } | null,
): string | null {
  if (r.szerokosc_geograficzna_aed === null || r.dlugosc_geograficzna_aed === null) return null;
  const skad = start ? `&origin=${start.szer},${start.dlug}` : '';
  return `https://www.google.com/maps/dir/?api=1${skad}&destination=${r.szerokosc_geograficzna_aed},${r.dlugosc_geograficzna_aed}&travelmode=walking`;
}
