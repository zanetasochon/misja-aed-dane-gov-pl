/**
 * HackNation 2026 – Misja AED. Plik dodany do forka portalu dane.gov.pl (GPL-3.0), 2026-11-22.
 *
 * Godziny dostępności według szablonu AED Sync v15 (arkusz „ZASADY”, reguły 6–10):
 * jedna kolumna na dzień; „8-12”, „8:00-12:30”, „08:00-12:30”; kilka przedziałów po przecinku;
 * „Całodobowo” / „24/7”; „Niedostępny” / „Closed”. Pusta komórka = brak danych, NIE dostępność całodobowa.
 * Do filtra „Dostępny teraz” godziny są składane w zapis opening_hours (tylko wewnętrznie).
 */

export const DNI_OSM = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const;
export const DNI_PL = ['poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota', 'niedziela'] as const;

export const CALODOBOWO = 'Całodobowo';
export const NIEDOSTEPNY = 'Niedostępny';
const ZAMKNIETE = /^(niedost[eę]pny|closed)$/i;
const CALA_DOBA = /^(ca[lł]odobowo|24\/7|24h)$/i;
const PRZEDZIAL = /^(\d{1,2})(?::(\d{2}))?\s*[-–]\s*(\d{1,2})(?::(\d{2}))?$/;

const dwieCyfry = (s: string) => s.padStart(2, '0');

/**
 * Normalizuje wartość jednego dnia: „8-12, 13-14” → „08:00-12:00, 13:00-14:00”, „24/7” → „Całodobowo”,
 * „Closed” → „Niedostępny”. null = pusta komórka (brak danych), undefined = zły format.
 */
export function normalizujDzien(v: string | null | undefined): string | null | undefined {
  const s = (v ?? '').trim();
  if (!s) return null;
  if (ZAMKNIETE.test(s)) return NIEDOSTEPNY;
  if (CALA_DOBA.test(s)) return CALODOBOWO;
  const przedzialy: string[] = [];
  for (const czesc of s.split(',').map((c) => c.trim())) {
    const m = PRZEDZIAL.exec(czesc);
    if (!m) return undefined;
    const [, h1, m1 = '00', h2, m2 = '00'] = m;
    if (+h1 > 24 || +h2 > 24 || +m1 > 59 || +m2 > 59) return undefined;
    const od = `${dwieCyfry(h1)}:${m1}`;
    const do_ = `${dwieCyfry(h2)}:${m2}`;
    if (do_ <= od) return undefined;
    przedzialy.push(`${od}-${do_}`);
  }
  return przedzialy.join(', ');
}

/**
 * Zapis opening_hours z 7 znormalizowanych dni (do filtra „Dostępny teraz”).
 * null, gdy żaden dzień nie ma godzin.
 */
export function godzinyZDni(dni: readonly (string | null)[]): string | null {
  const przedzialy = DNI_OSM.map((_, i) => {
    const d = dni[i];
    if (!d || d === NIEDOSTEPNY) return null;
    return d === CALODOBOWO ? '00:00-24:00' : d.replace(/\s/g, '');
  });
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

/** Krótki opis godzin do listy, np. „pon.–pt. 08:00-16:00; sob. Niedostępny; niedz. brak danych”. */
export function opisGodzin(dni: readonly (string | null)[]): string | null {
  if (dni.every((d) => d === null)) return null;
  const skroty = ['pon.', 'wt.', 'śr.', 'czw.', 'pt.', 'sob.', 'niedz.'];
  const w = dni.map((d) => d ?? 'brak danych');
  if (w.every((d) => d === w[0])) return w[0] === CALODOBOWO ? CALODOBOWO : `codziennie ${w[0]}`;
  const czesci: string[] = [];
  for (let i = 0; i < 7; ) {
    let j = i;
    while (j + 1 < 7 && w[j + 1] === w[i]) j++;
    czesci.push(`${i === j ? skroty[i] : `${skroty[i]}–${skroty[j]}`} ${w[i]}`);
    i = j + 1;
  }
  return czesci.join('; ');
}
