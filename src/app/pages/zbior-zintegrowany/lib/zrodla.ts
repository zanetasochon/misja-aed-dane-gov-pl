/**
 * HackNation 2026 – Misja AED. Plik dodany do forka portalu dane.gov.pl (GPL-3.0), 2026-11-21, zmieniony 2026-11-22.
 *
 * Zbiory dostawców w zbiorze zintegrowanym. Każdy dostawca sam publikuje na dane.gov.pl zbiór wypełniony
 * według szablonu AED Sync v15 i sam za niego odpowiada; zbiór zintegrowany tylko pokazuje te dane.
 *
 * W prototypie są dwa FIKCYJNE zbiory. Każdy ma w portalu zwykłą stronę zbioru i zasobu, renderowaną
 * niezmienionym kodem portalu: odpowiedzi API dla ich identyfikatorów podaje fikcyjne-zbiory.interceptor.ts.
 */

import { CSV_PORT_LOTNICZY } from '../dane/port-lotniczy';
import { CSV_UCZELNIA } from '../dane/uczelnia';
import type { PoleRekordu } from './model';
import type { RekordWejsciowy } from './walidacja-rekordu';

export interface MapowanieKolumny {
  kolumna: string;
  /** Pola szablonu, do których trafia wartość; pusta lista = kolumna pominięta. */
  pola: PoleRekordu[];
  uwaga?: string;
}

/** Zbiór w portalu (dane do fikcyjnych odpowiedzi API: strona zbioru i zasobu). */
export interface ZbiorWPortalu {
  /** Identyfikator zbioru w API (liczbowy jak w portalu, poza zakresem prawdziwych identyfikatorów). */
  id: string;
  slug: string;
  notes: string;
  keywords: string[];
  created: string;
  zasob: { id: string; slug: string; tytul: string; opis: string; plik: string };
  instytucja: {
    id: string;
    slug: string;
    typ: 'local' | 'state' | 'private' | 'other';
    miasto: string;
    ulica: string;
    numer: string;
    kod: string;
    email: string;
    tel: string;
    www: string;
  };
}

export interface ZrodloDef {
  id: string;
  /** Identyfikator zbioru dostawcy (adres zbioru na dane.gov.pl). */
  identyfikator: string;
  tytul: string;
  dostawca: string;
  formatPliku: string;
  licencja: string;
  /** Link do strony zbioru w portalu. */
  adresZbioru: string | null;
  /** Data danych zasobu (data_date). */
  dataDanych: string;
  /** Data i godzina ostatniej zmiany zbioru w portalu (modified) – jak „Data aktualizacji” na liście. */
  zmodyfikowano: string;
  prawdziwe: boolean;
  /** Uznanie autorstwa wymagane licencją (np. CC BY 4.0). */
  atrybucja?: string;
  /** Treść zasobu: CSV według szablonu AED Sync v15 (nagłówki PL albo EN). */
  tresc: string;
  separator?: string;
  /** Zbiór w innym układzie niż szablon (obecnie nieużywane): przypisanie kolumn i funkcja przepisująca wiersz. */
  mapowanie?: MapowanieKolumny[];
  mapujWiersz?: (w: Record<string, string>) => RekordWejsciowy;
  przygotuj?: (tresc: string) => string;
  uwagiDoPliku?: string[];
  obszar?: { miejscowosc: string; wojewodztwo: string; powiat: string; gmina: string };
  portal: ZbiorWPortalu;
}

const PORT: ZbiorWPortalu = {
  id: '9900001',
  slug: 'defibrylatory-aed-w-porcie-lotniczym-przykladowo',
  notes:
    '<p>DANE FIKCYJNE (prototyp HackNation 2026). Lokalizacja, dostępność i stan defibrylatorów AED na terenie Portu Lotniczego Przykładowo. Dane wypełnione według szablonu AED Sync v15 (kod zbioru AED-SYNC-PL); za dane odpowiada dostawca.</p>',
  keywords: ['AED', 'defibrylator', 'AED-SYNC-PL', 'lotnisko'],
  created: '2026-11-20T12:40:00Z',
  zasob: {
    id: '9900011',
    slug: 'defibrylatory-aed-port-lotniczy-przykladowo-aed-sync-v15',
    tytul: 'Defibrylatory AED – Port Lotniczy Przykładowo (szablon AED Sync v15)',
    opis: '<p>Plik CSV wypełniony według szablonu AED Sync v15 (arkusz „DANE PL”). Dane fikcyjne.</p>',
    plik: '/assets/hacknation/dane/port-lotniczy-przykladowo-aed-sync-v15.csv',
  },
  instytucja: {
    id: '9900101',
    slug: 'port-lotniczy-przykladowo',
    typ: 'private',
    miasto: 'Przykładowo',
    ulica: 'Lotnicza',
    numer: '1',
    kod: '00-001',
    email: 'kontakt@port-przykladowo.example',
    tel: '+48 00 000 00 00',
    www: 'https://port-przykladowo.example',
  },
};

const UCZELNIA: ZbiorWPortalu = {
  id: '9900002',
  slug: 'defibrylatory-aed-uniwersytet-przykladowy',
  notes:
    '<p>DANE FIKCYJNE (prototyp HackNation 2026). Lokalizacja, dostępność i stan defibrylatorów AED w budynkach Uniwersytetu Przykładowego. Dane wypełnione według szablonu AED Sync v15 (arkusz „DATA EN”, kod zbioru AED-SYNC-PL); za dane odpowiada dostawca.</p>',
  keywords: ['AED', 'defibrylator', 'AED-SYNC-PL', 'uczelnia'],
  created: '2026-11-21T09:00:00Z',
  zasob: {
    id: '9900012',
    slug: 'defibrylatory-aed-uniwersytet-przykladowy-aed-sync-v15',
    tytul: 'Defibrylatory AED – Uniwersytet Przykładowy (szablon AED Sync v15)',
    opis: '<p>Plik CSV wypełniony według szablonu AED Sync v15 (arkusz „DATA EN”, nagłówki po angielsku). Dane fikcyjne.</p>',
    plik: '/assets/hacknation/dane/uniwersytet-przykladowy-aed-sync-v15.csv',
  },
  instytucja: {
    id: '9900102',
    slug: 'uniwersytet-przykladowy',
    typ: 'state',
    miasto: 'Przykładów',
    ulica: 'pl. Uniwersytecki',
    numer: '1',
    kod: '00-010',
    email: 'rektorat@uniwersytet-przykladowy.example',
    tel: '+48 00 000 01 00',
    www: 'https://uniwersytet-przykladowy.example',
  },
};

const adres = (z: ZbiorWPortalu) => `/pl/dataset/${z.id},${z.slug}`;

export const ZRODLA: readonly ZrodloDef[] = [
  {
    id: 'port-lotniczy',
    identyfikator: `https://dane.gov.pl/pl/dataset/${PORT.id}`,
    tytul: 'Defibrylatory AED w Porcie Lotniczym Przykładowo',
    dostawca: 'Port Lotniczy Przykładowo S.A. (fikcyjny)',
    formatPliku: 'CSV (szablon AED Sync v15, nagłówki PL)',
    licencja: 'CC0 1.0',
    adresZbioru: adres(PORT),
    dataDanych: '2026-11-20',
    zmodyfikowano: '2026-11-20T13:10:00Z',
    prawdziwe: false,
    tresc: CSV_PORT_LOTNICZY,
    portal: PORT,
  },
  {
    id: 'uczelnia',
    identyfikator: `https://dane.gov.pl/pl/dataset/${UCZELNIA.id}`,
    tytul: 'Defibrylatory AED w budynkach Uniwersytetu Przykładowego',
    dostawca: 'Uniwersytet Przykładowy (fikcyjny)',
    formatPliku: 'CSV (szablon AED Sync v15, nagłówki EN)',
    licencja: 'CC0 1.0',
    adresZbioru: adres(UCZELNIA),
    dataDanych: '2026-11-21',
    zmodyfikowano: '2026-11-21T10:30:00Z',
    prawdziwe: false,
    tresc: CSV_UCZELNIA,
    portal: UCZELNIA,
  },
];
