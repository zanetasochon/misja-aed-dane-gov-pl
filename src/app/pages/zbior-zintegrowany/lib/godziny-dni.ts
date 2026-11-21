/**
 * HackNation 2026 – Misja AED. Plik dodany do forka portalu dane.gov.pl (GPL-3.0), 2026-11-22.
 *
 * Godziny podane osobno dla każdego dnia (np. kolumny poniedzialek_godziny … niedziela_godziny
 * w plikach AED Sync) → jedno pole godziny_dostepnosci w składni opening_hours wzorca.
 * Pusta komórka to brak danych, a nie dostępność całodobowa.
 */

export const DNI_OSM = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const;
export const DNI_PL = ['poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota', 'niedziela'] as const;

const ZAMKNIETE = /^(niedost[eę]pny|niedost[eę]pne|zamkni[eę]te|closed|nieczynne)$/i;
const PRZEDZIAL = /^(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})$/;

export interface WynikGodzinDni {
  /** Zapis opening_hours albo null, gdy żaden dzień nie ma godzin. */
  zapis: string | null;
  /** Dni bez wpisu (pusta komórka). */
  bezDanych: string[];
  /** Dni z wartością w złym formacie. */
  bledne: { dzien: string; wartosc: string }[];
}

const dwieCyfry = (s: string) => s.padStart(2, '0');

/** @param dni 7 wartości od poniedziałku do niedzieli; null albo '' = pusta komórka */
export function godzinyZDni(dni: readonly (string | null | undefined)[]): WynikGodzinDni {
  const bezDanych: string[] = [];
  const bledne: { dzien: string; wartosc: string }[] = [];
  const przedzialy: (string | null)[] = DNI_OSM.map((_, i) => {
    const v = (dni[i] ?? '').trim();
    if (!v) {
      bezDanych.push(DNI_PL[i]);
      return null;
    }
    if (ZAMKNIETE.test(v)) return null;
    const m = PRZEDZIAL.exec(v);
    if (!m || +m[1] > 24 || +m[3] > 24 || +m[2] > 59 || +m[4] > 59) {
      bledne.push({ dzien: DNI_PL[i], wartosc: v });
      return null;
    }
    return `${dwieCyfry(m[1])}:${m[2]}-${dwieCyfry(m[3])}:${m[4]}`;
  });

  if (przedzialy.every((p) => p === '00:00-24:00')) return { zapis: '24/7', bezDanych, bledne };

  const reguly: string[] = [];
  for (let i = 0; i < 7; ) {
    const p = przedzialy[i];
    let j = i;
    while (j + 1 < 7 && p !== null && przedzialy[j + 1] === p) j++;
    if (p !== null) reguly.push(`${i === j ? DNI_OSM[i] : `${DNI_OSM[i]}-${DNI_OSM[j]}`} ${p}`);
    i = j + 1;
  }
  return { zapis: reguly.length ? reguly.join('; ') : null, bezDanych, bledne };
}
