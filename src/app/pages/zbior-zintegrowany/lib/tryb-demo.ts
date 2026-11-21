/**
 * HackNation 2026 – Misja AED. Plik dodany do forka portalu dane.gov.pl (GPL-3.0), 2026-11-21.
 *
 * Atrapa logowania dostawcy dla jury: flaga w sessionStorage, bez hasła i bez wywołań API auth.
 * Prawdziwe logowanie portalu nie jest zmieniane.
 */

import { KOLUMNY } from './model';
import type { PoleRekordu, RekordAed } from './model';
import type { ZrodloDef } from './zrodla';

const KLUCZ = 'hacknation-demo-dostawca';
const KLUCZ_DANYCH = 'hacknation-demo-dane';

export const NAZWA_DOSTAWCY_DEMO = 'Urząd Miasta – demo';

export function wlaczTrybDemo(): void {
  try {
    sessionStorage.setItem(KLUCZ, 'true');
  } catch {
    // brak dostępu do sessionStorage – tryb demo działa tylko do odświeżenia strony
  }
}

export function wylaczTrybDemo(): void {
  try {
    sessionStorage.removeItem(KLUCZ);
    sessionStorage.removeItem(KLUCZ_DANYCH);
  } catch {
    // brak dostępu do sessionStorage
  }
}

export function czyTrybDemo(): boolean {
  try {
    return sessionStorage.getItem(KLUCZ) === 'true';
  } catch {
    return false;
  }
}

/** Plik „opublikowany” w trybie demo: rekordy zgodne ze wzorcem jako CSV (kolumny wzorca). */
export interface DaneDemo {
  csv: string;
  plik: string;
  opublikowano: string;
}

export function zapiszDaneDemo(dane: DaneDemo): void {
  try {
    sessionStorage.setItem(KLUCZ_DANYCH, JSON.stringify(dane));
  } catch {
    // brak dostępu do sessionStorage
  }
}

export function wczytajDaneDemo(): DaneDemo | null {
  try {
    const v = sessionStorage.getItem(KLUCZ_DANYCH);
    return v && czyTrybDemo() ? (JSON.parse(v) as DaneDemo) : null;
  } catch {
    return null;
  }
}

export function usunDaneDemo(): void {
  try {
    sessionStorage.removeItem(KLUCZ_DANYCH);
  } catch {
    // brak dostępu do sessionStorage
  }
}

/** Źródło zbioru zintegrowanego z pliku demo. Kolumny są już polami wzorca, więc mapowanie jest 1:1. */
export function zrodloDemo(dane: DaneDemo): ZrodloDef {
  const naglowki = dane.csv.split(/\r?\n/, 1)[0].split(',') as PoleRekordu[];
  const pola = KOLUMNY.filter((k) => naglowki.includes(k));
  return {
    id: 'demo-dostawca',
    identyfikator: 'demo/urzad-miasta-demo',
    tytul: `DANE TESTOWE – ${dane.plik}`,
    dostawca: NAZWA_DOSTAWCY_DEMO,
    typInstytucji: 'local',
    formatPliku: 'CSV (plik zgodny ze wzorcem)',
    separator: ',',
    licencja: 'dane testowe (tryb demo)',
    adresZbioru: null,
    adresPliku: null,
    dataDanych: dane.opublikowano.slice(0, 10),
    zmodyfikowano: dane.opublikowano,
    prawdziwe: false,
    tresc: dane.csv,
    mapowanie: pola.map((k) => ({ kolumna: k, pola: [k] })),
    mapujWiersz: (w) => ({
      idZrodlowe: w['id_aed'] ?? '',
      szerokosc: w['szerokosc_geograficzna'] ?? '',
      dlugosc: w['dlugosc_geograficzna'] ?? '',
      // Wartości tekstowe – walidujRekord normalizuje je tak samo jak przy prawdziwych źródłach.
      dane: Object.fromEntries(pola.map((k) => [k, w[k] ?? ''])) as unknown as Partial<RekordAed>,
    }),
  };
}
