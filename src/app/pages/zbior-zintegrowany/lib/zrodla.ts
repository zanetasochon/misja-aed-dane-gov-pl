/**
 * HackNation 2026 – Misja AED. Plik dodany do forka portalu dane.gov.pl (GPL-3.0), 2026-11-21.
 *
 * Zbiory źródłowe zbioru zintegrowanego i mapowanie ich kolumn na pola wzorca v1.3.
 * ZRODLA: prawdziwe zbiory AED z dane.gov.pl (snapshot z 2026-11-21).
 * ZRODLO_DEMO: dane fikcyjne – pokazywane na liście i mapie jak inne AED, nie trafiają do eksportu.
 * ZRODLA_NIEDOSTEPNE: zbiory AED, których nie da się odczytać maszynowo (pokazywane, nie scrapowane).
 */

import { CSV_KROSNO } from '../dane/krosno';
import { CSV_LEGIONOWO } from '../dane/legionowo';
import { CSV_MARKI } from '../dane/marki';
import { CSV_PORT_LOTNICZY } from '../dane/port-lotniczy';
import { CSV_PRZEMYSL } from '../dane/przemysl';
import { punktZGeoJson } from './geometria';
import type { Dostep, PoleRekordu, RekordAed } from './model';

export interface MapowanieKolumny {
  kolumna: string;
  /** Pola wzorca, do których trafia wartość; pusta lista = kolumna pominięta. */
  pola: PoleRekordu[];
  uwaga?: string;
}

export interface WierszZmapowany {
  idZrodlowe: string;
  dane: Partial<RekordAed>;
  /** Tekstowe współrzędne – sprawdza je harmonizacja. */
  szerokosc: string;
  dlugosc: string;
}

export interface ZrodloDef {
  id: string;
  /** Wartość pola zrodlo_danych: pełny adres zbioru źródłowego na dane.gov.pl (dla danych fikcyjnych – identyfikator). */
  identyfikator: string;
  tytul: string;
  dostawca: string;
  typInstytucji: 'local' | 'state' | 'private' | 'developer' | 'other';
  formatPliku: string;
  separator: string;
  licencja: string;
  adresZbioru: string | null;
  adresPliku: string | null;
  /** Data danych zasobu (data_date) – trafia do data_aktualizacji rekordów. */
  dataDanych: string;
  /** Data i godzina ostatniej zmiany zbioru w portalu (modified z API) – jak „Data aktualizacji” na liście. */
  zmodyfikowano: string;
  prawdziwe: boolean;
  /**
   * Obszar, którego dotyczy zbiór (np. zbiór miasta). Rekordy z tej miejscowości dostają województwo,
   * powiat i gminę słownie (pola wymagane w v1.3), bo źródła ich nie podają.
   */
  obszar?: { miejscowosc: string; wojewodztwo: string; powiat: string; gmina: string };
  /** Uznanie autorstwa wymagane licencją (np. CC BY 4.0) – pokazywane w widoku i w pliku źródeł przy eksporcie. */
  atrybucja?: string;
  /** Naprawa pliku przed odczytem (np. wiersze w całości w cudzysłowie) – opisana w uwagiDoPliku. */
  przygotuj?: (tresc: string) => string;
  /** Problemy samego pliku źródłowego, pokazywane w raporcie harmonizacji. */
  uwagiDoPliku?: string[];
  tresc: string;
  mapowanie: MapowanieKolumny[];
  mapujWiersz: (w: Record<string, string>) => WierszZmapowany;
}

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

const CECHA_ULICY: Record<string, string> = { ulica: 'ul.', aleja: 'al.', plac: 'pl.', osiedle: 'os.' };

const DOSTEP_PORTU: Record<string, Dostep> = {
  ogólnodostępny: 'publiczny',
  'tylko personel': 'ograniczony',
  'dla klientów': 'klienci',
};

export const ZRODLA: readonly ZrodloDef[] = [
  {
    id: 'krosno',
    identyfikator: 'https://dane.gov.pl/pl/dataset/3624',
    tytul: 'Defibrylatory zlokalizowane w Mieście Krosno',
    dostawca: 'Urząd Miasta Krosna',
    typInstytucji: 'local',
    formatPliku: 'CSV (przecinek)',
    separator: ',',
    licencja: 'CC0 1.0',
    adresZbioru: 'https://dane.gov.pl/pl/dataset/3624,defibrylatory-zlokalizowane-w-miescie-krosno',
    adresPliku: 'https://api.dane.gov.pl/media/resources/20240219/Defibrylator_jAmxQcp.csv',
    dataDanych: '2024-02-19',
    zmodyfikowano: '2024-03-19T19:17:59Z',
    prawdziwe: true,
    obszar: { miejscowosc: 'Krosno', wojewodztwo: 'podkarpackie', powiat: 'Krosno', gmina: 'Krosno' },
    tresc: CSV_KROSNO,
    mapowanie: [
      { kolumna: 'Długość geograficzna', pola: ['dlugosc_geograficzna'] },
      { kolumna: 'Szerokość geograficzna', pola: ['szerokosc_geograficzna'] },
      { kolumna: 'Nazwa', pola: [], uwaga: 'W każdym wierszu „Defibrylator” – nie niesie informacji, pominięta.' },
      { kolumna: 'Lokalizacja', pola: ['nazwa_miejsca'] },
      {
        kolumna: 'Adres',
        pola: ['ulica', 'numer_budynku', 'kod_pocztowy', 'miejscowosc'],
        uwaga: 'Adres w jednym polu – rozbity na ulicę, numer, kod i miejscowość (ST s. 16 wymaga osobnych pól).',
      },
      { kolumna: 'Numer Id', pola: ['id_aed'], uwaga: 'Użyty w identyfikatorze rekordu.' },
    ],
    mapujWiersz: (w) => ({
      idZrodlowe: w['Numer Id'],
      szerokosc: w['Szerokość geograficzna'],
      dlugosc: w['Długość geograficzna'],
      dane: { nazwa_miejsca: lubNull(w['Lokalizacja']) ?? '', ...rozbijAdres(w['Adres'] ?? '') },
    }),
  },
  {
    id: 'legionowo',
    identyfikator: 'https://dane.gov.pl/pl/dataset/40593',
    tytul: 'Wykaz defibrylatorów AED wraz z ich lokalizacją w Legionowie (zbiór „Zdrowie”)',
    dostawca: 'Urząd Miasta Legionowo',
    typInstytucji: 'local',
    formatPliku: 'CSV (przecinek)',
    separator: ',',
    licencja: 'CC0 1.0',
    adresZbioru: 'https://dane.gov.pl/pl/dataset/40593,zdowie',
    adresPliku: 'https://api.dane.gov.pl/media/resources/20260914/aed.csv',
    dataDanych: '2026-09-14',
    zmodyfikowano: '2026-09-21T08:31:31Z',
    prawdziwe: true,
    obszar: { miejscowosc: 'Legionowo', wojewodztwo: 'mazowieckie', powiat: 'legionowski', gmina: 'Legionowo' },
    tresc: CSV_LEGIONOWO,
    mapowanie: [
      { kolumna: 'nazwa', pola: ['nazwa_miejsca'] },
      { kolumna: 'cecha_ulicy', pola: ['ulica'], uwaga: '„ulica” → „ul.”, „aleja” → „al.”, połączone z nazwą ulicy.' },
      { kolumna: 'nazwa_ulicy', pola: ['ulica'] },
      { kolumna: 'nr_budynku', pola: ['numer_budynku'] },
      { kolumna: 'nr_lokalu', pola: ['numer_lokalu'] },
      { kolumna: 'kod_pocztowy', pola: ['kod_pocztowy'] },
      { kolumna: 'miejscowosc', pola: ['miejscowosc'] },
      { kolumna: 'kod_terc', pola: ['teryt_terc'], uwaga: '6 cyfr – portal dopuszcza TERC 6- lub 7-cyfrowy.' },
      { kolumna: 'kod_simc', pola: ['teryt_simc'] },
      { kolumna: 'szerokosc_geograficzna', pola: ['szerokosc_geograficzna'] },
      { kolumna: 'dlugosc_geograficzna', pola: ['dlugosc_geograficzna'] },
    ],
    mapujWiersz: (w) => {
      const cecha = CECHA_ULICY[(w['cecha_ulicy'] ?? '').toLowerCase()] ?? lubNull(w['cecha_ulicy']);
      const nazwaUlicy = lubNull(w['nazwa_ulicy']);
      return {
        idZrodlowe: '',
        szerokosc: w['szerokosc_geograficzna'],
        dlugosc: w['dlugosc_geograficzna'],
        dane: {
          nazwa_miejsca: lubNull(w['nazwa']) ?? '',
          ulica: nazwaUlicy ? [cecha, nazwaUlicy].filter(Boolean).join(' ') : null,
          numer_budynku: lubNull(w['nr_budynku']),
          numer_lokalu: lubNull(w['nr_lokalu']),
          kod_pocztowy: lubNull(w['kod_pocztowy']),
          miejscowosc: lubNull(w['miejscowosc']),
          teryt_terc: lubNull(w['kod_terc']),
          teryt_simc: lubNull(w['kod_simc']),
        },
      };
    },
  },
  {
    id: 'przemysl',
    identyfikator: 'https://dane.gov.pl/pl/dataset/4581',
    tytul: 'Lokalizacje AED – Automatycznych Defibrylatorów Zewnętrznych w Przemyślu',
    dostawca: 'Urząd Miejski w Przemyślu',
    typInstytucji: 'local',
    formatPliku: 'CSV (średnik), link do systemu miasta',
    separator: ';',
    licencja: 'CC0 1.0',
    adresZbioru: 'https://dane.gov.pl/pl/dataset/4581,lokalizacje-aed-automatycznych-defibrylatorow-zewn',
    adresPliku: 'https://przemysl.skycms.com.pl/open-data/20/1730818801_b50R6UVxPgoVdBbq/csv',
    dataDanych: '2024-11-06',
    zmodyfikowano: '2024-11-06T06:42:45Z',
    prawdziwe: true,
    obszar: { miejscowosc: 'Przemyśl', wojewodztwo: 'podkarpackie', powiat: 'Przemyśl', gmina: 'Przemyśl' },
    tresc: CSV_PRZEMYSL,
    uwagiDoPliku: [
      'Nagłówki po angielsku, separator średnik.',
      'Współrzędne są tylko w kolumnie geometry jako GeoJSON w komórce – bez osobnych kolumn liczbowych portal nie zbuduje z pliku mapy.',
    ],
    mapowanie: [
      { kolumna: 'id', pola: ['id_aed'], uwaga: 'Użyty w identyfikatorze rekordu.' },
      { kolumna: 'name', pola: ['nazwa_miejsca'] },
      { kolumna: 'description', pola: [], uwaga: 'Ten sam ogólny tekst o AED w każdym wierszu – pominięta.' },
      { kolumna: 'category', pola: [], uwaga: 'Stała wartość „Defibrylatory AED” – pominięta.' },
      { kolumna: 'city', pola: ['miejscowosc'] },
      { kolumna: 'street', pola: ['ulica'] },
      { kolumna: 'home_number', pola: ['numer_budynku'] },
      { kolumna: 'postcode', pola: ['kod_pocztowy'] },
      {
        kolumna: 'phone',
        pola: ['telefon_odpowiedzialnego_za_aed'],
        uwaga: 'Usunięty apostrof na początku (ślad po Excelu).',
      },
      {
        kolumna: 'email, www, youtube_url, panorama_url, gallery, attachments, links',
        pola: [],
        uwaga: 'Poza wzorcem – pominięte.',
      },
      {
        kolumna: 'geometry',
        pola: ['szerokosc_geograficzna', 'dlugosc_geograficzna'],
        uwaga: 'Punkt GeoJSON [długość, szerokość] rozbity na dwie kolumny liczbowe.',
      },
    ],
    mapujWiersz: (w) => {
      const punkt = punktZGeoJson(w['geometry'] ?? '');
      const telefon = lubNull((w['phone'] ?? '').replace(/^'/, ''));
      return {
        idZrodlowe: w['id'],
        szerokosc: punkt ? String(punkt[1]) : '',
        dlugosc: punkt ? String(punkt[0]) : '',
        dane: {
          nazwa_miejsca: lubNull(w['name']) ?? '',
          ulica: lubNull(w['street']),
          numer_budynku: lubNull(w['home_number']),
          kod_pocztowy: lubNull(w['postcode']),
          miejscowosc: lubNull(w['city']),
          telefon_odpowiedzialnego_za_aed: telefon ? telefon.replace(/[\s-]/g, '') : null,
        },
      };
    },
  },
  {
    id: 'marki',
    identyfikator: 'https://dane.gov.pl/pl/dataset/4955',
    tytul: 'Defibrylatory zlokalizowane na terenie Miasta Marki',
    dostawca: 'Urząd Miasta Marki',
    typInstytucji: 'local',
    formatPliku: 'CSV (uszkodzony: wiersze w cudzysłowie)',
    separator: ',',
    licencja: 'CC BY 4.0',
    atrybucja: 'Źródło: Urząd Miasta Marki, dane.gov.pl, CC BY 4.0',
    adresZbioru: 'https://dane.gov.pl/pl/dataset/4955,defibrylatory-zlokalizowane-na-terenie-miasta-markI',
    adresPliku: 'https://api.dane.gov.pl/media/resources/20250710/Defibrylator_GminaMiastoMarki_1.csv',
    dataDanych: '2025-07-10',
    zmodyfikowano: '2025-07-10T12:13:16Z',
    prawdziwe: true,
    obszar: { miejscowosc: 'Marki', wojewodztwo: 'mazowieckie', powiat: 'wołomiński', gmina: 'Marki' },
    tresc: CSV_MARKI,
    uwagiDoPliku: [
      'Każdy wiersz jest w całości ujęty w cudzysłów, więc czytnik CSV widzi jedną kolumnę – przed odczytem usunięto zewnętrzne cudzysłowy.',
      'W kolumnie „Długość geograficzna” są wartości szerokości (i odwrotnie) – poprawiane przy harmonizacji.',
    ],
    przygotuj: (tresc) =>
      tresc
        .split(/\r?\n/)
        .map((l) => (l.length > 1 && l.startsWith('"') && l.endsWith('"') ? l.slice(1, -1).replace(/""/g, '"') : l))
        .join('\r\n'),
    mapowanie: [
      { kolumna: 'Długość geograficzna', pola: ['dlugosc_geograficzna'], uwaga: 'Wartości zamienione z szerokością.' },
      {
        kolumna: 'Szerokość geograficzna',
        pola: ['szerokosc_geograficzna'],
        uwaga: 'Wartości zamienione z długością.',
      },
      { kolumna: 'Nazwa', pola: [], uwaga: 'W każdym wierszu „Defibrylator” – nie niesie informacji, pominięta.' },
      { kolumna: 'Lokalizacja', pola: ['nazwa_miejsca'] },
      {
        kolumna: 'Adres',
        pola: ['ulica', 'numer_budynku', 'kod_pocztowy', 'miejscowosc'],
        uwaga: 'Adres w jednym polu – rozbity na ulicę, numer, kod i miejscowość (ST s. 16 wymaga osobnych pól).',
      },
      { kolumna: 'Numer Id', pola: ['id_aed'], uwaga: 'Użyty w identyfikatorze rekordu.' },
    ],
    mapujWiersz: (w) => ({
      idZrodlowe: w['Numer Id'],
      szerokosc: w['Szerokość geograficzna'],
      dlugosc: w['Długość geograficzna'],
      dane: { nazwa_miejsca: lubNull(w['Lokalizacja']) ?? '', ...rozbijAdres(w['Adres'] ?? '') },
    }),
  },
];

/** Źródło fikcyjne – pokazywane jak inne AED, nigdy w eksporcie. */
export const ZRODLO_DEMO: ZrodloDef = {
  id: 'port-lotniczy',
  identyfikator: 'przyklad/port-lotniczy-przykladowo',
  tytul: 'Defibrylatory w porcie lotniczym',
  dostawca: 'Port Lotniczy Przykładowo S.A. (fikcyjny)',
  typInstytucji: 'private',
  formatPliku: 'CSV (średnik)',
  separator: ';',
  licencja: 'CC0 1.0 (dane fikcyjne)',
  adresZbioru: null,
  adresPliku: null,
  dataDanych: '2026-11-20',
  zmodyfikowano: '2026-11-20T13:10:00+01:00',
  prawdziwe: false,
  obszar: { miejscowosc: 'Przykładowo', wojewodztwo: 'łódzkie', powiat: 'przykładowski', gmina: 'Przykładowo' },
  tresc: CSV_PORT_LOTNICZY,
  mapowanie: [
    { kolumna: 'ID', pola: ['id_aed'], uwaga: 'Użyty w identyfikatorze rekordu.' },
    { kolumna: 'Obiekt', pola: ['nazwa_miejsca'] },
    { kolumna: 'Gdzie', pola: ['opis_lokalizacji'] },
    { kolumna: 'Ulica', pola: ['ulica'] },
    { kolumna: 'Nr', pola: ['numer_budynku'] },
    { kolumna: 'Kod', pola: ['kod_pocztowy'] },
    { kolumna: 'Miasto', pola: ['miejscowosc'] },
    { kolumna: 'Lat', pola: ['szerokosc_geograficzna'] },
    { kolumna: 'Lon', pola: ['dlugosc_geograficzna'] },
    {
      kolumna: 'Dostepnosc',
      pola: ['dostep'],
      uwaga: '„ogólnodostępny” → publiczny, „tylko personel” → ograniczony.',
    },
    { kolumna: 'Godziny', pola: ['godziny_dostepnosci'], uwaga: 'Już w składni opening_hours.' },
    { kolumna: 'W_budynku', pola: ['wewnatrz_budynku'], uwaga: '„TAK”/„NIE” → true/false.' },
    { kolumna: 'Poziom', pola: ['pietro'] },
  ],
  mapujWiersz: (w) => {
    const wb = (w['W_budynku'] ?? '').toUpperCase();
    const poziom = lubNull(w['Poziom']);
    return {
      idZrodlowe: w['ID'],
      szerokosc: w['Lat'],
      dlugosc: w['Lon'],
      dane: {
        nazwa_miejsca: lubNull(w['Obiekt']) ?? '',
        opis_lokalizacji: lubNull(w['Gdzie']),
        ulica: lubNull(w['Ulica']),
        numer_budynku: lubNull(w['Nr']),
        kod_pocztowy: lubNull(w['Kod']),
        miejscowosc: lubNull(w['Miasto']),
        dostep: DOSTEP_PORTU[(w['Dostepnosc'] ?? '').toLowerCase()] ?? null,
        godziny_dostepnosci: lubNull(w['Godziny']),
        wewnatrz_budynku: wb === 'TAK' ? true : wb === 'NIE' ? false : null,
        pietro: poziom !== null && /^-?\d+$/.test(poziom) ? Number(poziom) : null,
        odpowiedzialny_za_aed: 'Port Lotniczy Przykładowo S.A. (fikcyjny)',
        typ_odpowiedzialnego_za_aed: 'transport',
      },
    };
  },
};

export interface ZrodloNiedostepne {
  tytul: string;
  dostawca: string;
  licencja: string;
  adresZbioru: string;
  dataDanych: string;
  powod: string;
}

/** Zbiory AED na dane.gov.pl, których nie da się odczytać maszynowo – pokazujemy je, nie scrapujemy. */
export const ZRODLA_NIEDOSTEPNE: readonly ZrodloNiedostepne[] = [
  {
    tytul: 'Lokalizacja defibrylatorów (AED)',
    dostawca: 'Urząd m.st. Warszawy',
    licencja: 'CC BY 4.0',
    adresZbioru: 'https://dane.gov.pl/pl/dataset/39512,lokalizacja-defibryzatorow-aed',
    dataDanych: '2025-10-10',
    powod: 'źródło niedostępne maszynowo (link prowadzi do strony HTML)',
  },
];
