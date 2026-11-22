/**
 * HackNation 2026 – Misja AED. Plik dodany do forka portalu dane.gov.pl (GPL-3.0), 2026-11-22.
 *
 * Link do trasy pieszej w Google Maps (Maps URLs, bez klucza API): punkt startowy to bieżąca lokalizacja
 * w aplikacji lub przeglądarce, cel – współrzędne AED. Nic nie jest wysyłane, dopóki ktoś nie kliknie.
 */

export function trasaDoAed(r: {
  szerokosc_geograficzna_aed: number | null;
  dlugosc_geograficzna_aed: number | null;
}): string | null {
  if (r.szerokosc_geograficzna_aed === null || r.dlugosc_geograficzna_aed === null) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${r.szerokosc_geograficzna_aed},${r.dlugosc_geograficzna_aed}&travelmode=walking`;
}
