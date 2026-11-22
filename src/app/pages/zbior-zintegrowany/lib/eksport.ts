/**
 * HackNation 2026 – Misja AED. Plik dodany do forka portalu dane.gov.pl (GPL-3.0), 2026-11-21.
 *
 * Eksport zbioru zintegrowanego (reguły z arkusza „Reguły pliku” wzorca v1.3, Standard techniczny):
 * - CSV wg RFC 4180: UTF-8, przecinek, CRLF, jeden wiersz nagłówka, bez całkowicie pustych kolumn (ST s. 20–21);
 * - JSON wg RFC 8259 z tymi samymi polami co CSV;
 * - GeoJSON (RFC 7946): FeatureCollection punktów [długość, szerokość] w WGS84.
 */

import { KOLUMNY } from './model';
import type { PoleRekordu, RekordAed } from './model';
import type { ZrodloDef, ZrodloNiedostepne } from './zrodla';

type Wartosc = RekordAed[PoleRekordu];
const pusta = (v: Wartosc | undefined) => v === null || v === undefined || v === '';

export function kolumnyEksportu(rekordy: readonly RekordAed[]): { kolumny: PoleRekordu[]; pominiete: PoleRekordu[] } {
  if (rekordy.length === 0) return { kolumny: [...KOLUMNY], pominiete: [] };
  const kolumny: PoleRekordu[] = [];
  const pominiete: PoleRekordu[] = [];
  for (const k of KOLUMNY) (rekordy.some((r) => !pusta(r[k])) ? kolumny : pominiete).push(k);
  return { kolumny, pominiete };
}

function komorka(v: Wartosc | undefined): string {
  if (pusta(v)) return '';
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Tylko pola wzorca – pola pomocnicze aplikacji (zrodloId itp.) nie trafiają do pliku. */
function tylkoWzorzec(r: RekordAed, kolumny: readonly PoleRekordu[]): Record<string, Wartosc> {
  return Object.fromEntries(kolumny.map((k) => [k, r[k]]));
}

export function doCsv(rekordy: readonly RekordAed[]): string {
  const { kolumny } = kolumnyEksportu(rekordy);
  return [kolumny.join(','), ...rekordy.map((r) => kolumny.map((k) => komorka(r[k])).join(','))].join('\r\n') + '\r\n';
}

export function doJson(rekordy: readonly RekordAed[]): string {
  const { kolumny } = kolumnyEksportu(rekordy);
  return JSON.stringify(
    rekordy.map((r) => tylkoWzorzec(r, kolumny)),
    null,
    2,
  );
}

/** Opis źródła do plików eksportu: kto odpowiada za dane, licencja i wymagane uznanie autorstwa. */
export interface OpisZrodla {
  zrodlo_danych: string;
  dostawca: string;
  tytul: string;
  licencja: string;
  atrybucja: string;
  data_danych: string;
  liczba_rekordow: number;
  status: string;
}

export function opisyZrodel(
  zrodla: readonly { zrodlo: ZrodloDef; przyjete: number }[],
  niedostepne: readonly ZrodloNiedostepne[] = [],
): OpisZrodla[] {
  return [
    ...zrodla.map(({ zrodlo: z, przyjete }) => ({
      zrodlo_danych: z.identyfikator,
      dostawca: z.dostawca,
      tytul: z.tytul,
      licencja: z.licencja,
      atrybucja: z.atrybucja ?? `Źródło: ${z.dostawca}, dane.gov.pl, ${z.licencja}`,
      data_danych: z.dataDanych,
      liczba_rekordow: przyjete,
      status: 'wykorzystane',
    })),
    ...niedostepne.map((z) => ({
      zrodlo_danych: z.adresZbioru,
      dostawca: z.dostawca,
      tytul: z.tytul,
      licencja: z.licencja,
      atrybucja: '',
      data_danych: z.dataDanych,
      liczba_rekordow: 0,
      status: z.powod,
    })),
  ];
}

/** Plik CSV źródeł i licencji dołączany do eksportu (CSV i JSON zbioru nie mają miejsca na atrybucję). */
export function doCsvZrodel(opisy: readonly OpisZrodla[]): string {
  const kol: (keyof OpisZrodla)[] = [
    'zrodlo_danych',
    'dostawca',
    'tytul',
    'licencja',
    'atrybucja',
    'data_danych',
    'liczba_rekordow',
    'status',
  ];
  const k = (v: string | number) => {
    const s = String(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [kol.join(','), ...opisy.map((o) => kol.map((c) => k(o[c])).join(','))].join('\r\n') + '\r\n';
}

export function doGeoJson(rekordy: readonly RekordAed[], zrodla: readonly OpisZrodla[] = []): string {
  const { kolumny } = kolumnyEksportu(rekordy);
  const wlasciwosci = kolumny.filter((k) => k !== 'szerokosc_geograficzna' && k !== 'dlugosc_geograficzna');
  return JSON.stringify(
    {
      type: 'FeatureCollection',
      // Element obcy (RFC 7946 §6.1): źródła, licencje i wymagane uznanie autorstwa.
      ...(zrodla.length ? { zrodla } : {}),
      features: rekordy.map((r) => ({
        type: 'Feature',
        id: r.id_aed,
        // Współrzędne są opcjonalne (v1.3) – bez nich geometria jest null (RFC 7946 §3.2).
        geometry:
          r.szerokosc_geograficzna !== null && r.dlugosc_geograficzna !== null
            ? { type: 'Point', coordinates: [r.dlugosc_geograficzna, r.szerokosc_geograficzna] }
            : null,
        properties: tylkoWzorzec(r, wlasciwosci),
      })),
    },
    null,
    2,
  );
}

export function pobierzPlik(tresc: string, nazwa: string, typ: string): void {
  const url = URL.createObjectURL(new Blob([tresc], { type: typ }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nazwa;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
