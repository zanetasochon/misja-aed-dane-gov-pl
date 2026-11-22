/**
 * HackNation 2026 – Misja AED. Plik dodany do forka portalu dane.gov.pl (GPL-3.0), 2026-11-22.
 *
 * Adres w jednym polu → osobne pola szablonu (narzędzie „Sprawdź zgodność ze wzorcem”).
 */

const lubNull = (v: string | undefined) => (v && v.trim() !== '' ? v.trim().replace(/\s+/g, ' ') : null);

/**
 * Rozbija adres zapisany w jednym polu, np. „ul. Mikołaja Kopernika 17, 38-400 Krosno”
 * albo „ul. Jasna, 38-400 Krosno” (bez numeru). Standard techniczny (s. 16) wymaga osobnych pól.
 */
export function rozbijAdres(adres: string): {
  ulica: string | null;
  numer_budynku: string | null;
  kod_pocztowy: string | null;
  miejscowosc: string | null;
} {
  const czesci = adres
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);
  let kod: string | null = null;
  let miejscowosc: string | null = null;
  const ostatnia = czesci.at(-1) ?? '';
  const km = /^(\d{2}-?\d{3})\s+(.+)$/.exec(ostatnia);
  if (km) {
    kod = km[1];
    miejscowosc = km[2];
    czesci.pop();
  }
  const pierwsza = czesci[0] ?? '';
  const um = /^(.*?)\s+(\d+[A-Za-z]?(?:\/\d+[A-Za-z]?)?)$/.exec(pierwsza);
  return {
    ulica: lubNull(um ? um[1] : pierwsza),
    numer_budynku: um ? um[2] : null,
    kod_pocztowy: kod,
    miejscowosc,
  };
}
