/**
 * HackNation 2026 – Misja AED. Plik dodany do forka portalu dane.gov.pl (GPL-3.0), 2026-11-21.
 * Parser CSV zgodny z RFC 4180 (cudzysłowy, separator w polu, CRLF lub LF, opcjonalny BOM).
 */

export class BladCsv extends Error {}

/** Zgaduje separator z pierwszego wiersza: przecinek, średnik albo tabulator. */
export function wykryjSeparator(tekst: string): ',' | ';' | '\t' {
  const pierwszy = tekst.replace(/^\uFEFF/, '').split(/\r?\n/, 1)[0] ?? '';
  const liczba = (z: string) => pierwszy.split(z).length - 1;
  const kandydaci: (',' | ';' | '\t')[] = [',', ';', '\t'];
  return kandydaci.reduce((a, b) => (liczba(b) > liczba(a) ? b : a), ',');
}

export function parsujCsv(tekst: string, separator: string = wykryjSeparator(tekst)): string[][] {
  const t = tekst.charCodeAt(0) === 0xfeff ? tekst.slice(1) : tekst;
  const wiersze: string[][] = [];
  let wiersz: string[] = [];
  let komorka = '';
  let wCudzyslowie = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (wCudzyslowie) {
      if (c === '"') {
        if (t[i + 1] === '"') {
          komorka += '"';
          i++;
        } else wCudzyslowie = false;
      } else komorka += c;
      continue;
    }
    if (c === '"' && komorka === '') wCudzyslowie = true;
    else if (c === separator) {
      wiersz.push(komorka);
      komorka = '';
    } else if (c === '\r' || c === '\n') {
      wiersz.push(komorka);
      wiersze.push(wiersz);
      wiersz = [];
      komorka = '';
      if (c === '\r' && t[i + 1] === '\n') i++;
    } else komorka += c;
  }
  if (wCudzyslowie) throw new BladCsv('Plik ma niezamknięty cudzysłów.');
  if (komorka !== '' || wiersz.length > 0) {
    wiersz.push(komorka);
    wiersze.push(wiersz);
  }
  return wiersze.filter((w) => !(w.length === 1 && w[0].trim() === ''));
}

/** Wiersze jako obiekty nagłówek → wartość. Nagłówki przycinamy ze spacji (np. „ Nazwa” w Krośnie). */
export function wierszeJakoObiekty(
  tekst: string,
  separator?: string,
): { naglowki: string[]; wiersze: Record<string, string>[] } {
  const w = parsujCsv(tekst, separator);
  const naglowki = (w[0] ?? []).map((h) => h.trim());
  return {
    naglowki,
    wiersze: w.slice(1).map((r) => Object.fromEntries(naglowki.map((h, i) => [h, (r[i] ?? '').trim()]))),
  };
}
