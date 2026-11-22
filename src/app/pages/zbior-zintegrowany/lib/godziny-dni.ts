/**
 * HackNation 2026 – Misja AED. Plik dodany do forka portalu dane.gov.pl (GPL-3.0), 2026-11-22.
 *
 * Godziny podane osobno dla każdego dnia (kolumny poniedzialek_godziny … niedziela_godziny,
 * jak w AED Sync) → jedno pole godziny_dostepnosci w składni opening_hours.
 * Pusta komórka to brak danych, a nie dostępność całodobowa – całą dobę trzeba wpisać wprost.
 */

export const DNI_OSM = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const;
export const DNI_PL = ['poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota', 'niedziela'] as const;

/** Wartość dnia zamkniętego zapisywana w pliku wynikowym. */
export const ZAMKNIETE_WARTOSC = 'Niedostępny';
const ZAMKNIETE = /^(niedost[eę]pny|niedost[eę]pne|zamkni[eę]te|closed|nieczynne)$/i;
const CALA_DOBA = /^(24h|24 h|24\/7|ca[lł]odobowo|ca[lł]a doba|00:00\s*[-–]\s*24:00|0:00\s*[-–]\s*24:00)$/i;
const PRZEDZIAL = /^(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})$/;

const dwieCyfry = (s: string) => s.padStart(2, '0');

/**
 * Normalizuje wartość jednego dnia: „8:00 – 16:30” → „08:00-16:30”, „24h” → „00:00-24:00”,
 * „Closed” → „Niedostępny”. null = pusta komórka, undefined = zły format.
 */
export function normalizujDzien(v: string | null | undefined): string | null | undefined {
  const s = (v ?? '').trim();
  if (!s) return null;
  if (ZAMKNIETE.test(s)) return ZAMKNIETE_WARTOSC;
  if (CALA_DOBA.test(s)) return '00:00-24:00';
  const m = PRZEDZIAL.exec(s);
  if (!m || +m[1] > 24 || +m[3] > 24 || +m[2] > 59 || +m[4] > 59) return undefined;
  return `${dwieCyfry(m[1])}:${m[2]}-${dwieCyfry(m[3])}:${m[4]}`;
}

/**
 * @param dni 7 znormalizowanych wartości od poniedziałku do niedzieli (normalizujDzien); null = brak danych
 * @returns zapis opening_hours albo null, gdy żaden dzień nie ma godzin
 */
export function godzinyZDni(dni: readonly (string | null)[]): string | null {
  const przedzialy = DNI_OSM.map((_, i) => (dni[i] && dni[i] !== ZAMKNIETE_WARTOSC ? dni[i] : null));
  if (przedzialy.every((p) => p === '00:00-24:00')) return '24/7';
  const reguly: string[] = [];
  for (let i = 0; i < 7; ) {
    const p = przedzialy[i];
    let j = i;
    while (j + 1 < 7 && p !== null && przedzialy[j + 1] === p) j++;
    if (p !== null) reguly.push(`${i === j ? DNI_OSM[i] : `${DNI_OSM[i]}-${DNI_OSM[j]}`} ${p}`);
    i = j + 1;
  }
  return reguly.length ? reguly.join('; ') : null;
}
