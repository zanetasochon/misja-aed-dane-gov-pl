/**
 * HackNation 2026 – Misja AED. Plik dodany do forka portalu dane.gov.pl (GPL-3.0), 2026-11-21.
 *
 * Zbiory źródłowe zbioru zintegrowanego i mapowanie ich kolumn na pola wzorca v1.1.
 * Dwa źródła to prawdziwe zbiory z dane.gov.pl (CC0 1.0), trzecie jest fikcyjne.
 */

import { CSV_KROSNO } from '../dane/krosno';
import { CSV_LEGIONOWO } from '../dane/legionowo';
import { CSV_PORT_LOTNICZY } from '../dane/port-lotniczy';
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
  /** Wartość pola zrodlo_danych w zbiorze zintegrowanym. */
  identyfikator: string;
  tytul: string;
  dostawca: string;
  typInstytucji: 'local' | 'state' | 'private' | 'developer' | 'other';
  formatPliku: string;
  separator: string;
  licencja: string;
  adresZbioru: string | null;
  adresPliku: string | null;
  dataDanych: string;
  prawdziwe: boolean;
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
    identyfikator: 'dane.gov.pl/dataset/3624',
    tytul: 'Defibrylatory zlokalizowane w Mieście Krosno',
    dostawca: 'Urząd Miasta Krosna',
    typInstytucji: 'local',
    formatPliku: 'CSV (przecinek)',
    separator: ',',
    licencja: 'CC0 1.0',
    adresZbioru: 'https://dane.gov.pl/pl/dataset/3624,defibrylatory-zlokalizowane-w-miescie-krosno',
    adresPliku: 'https://api.dane.gov.pl/media/resources/20240219/Defibrylator_jAmxQcp.csv',
    dataDanych: '2024-02-19',
    prawdziwe: true,
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
    identyfikator: 'dane.gov.pl/dataset/40593',
    tytul: 'Wykaz defibrylatorów AED wraz z ich lokalizacją w Legionowie (zbiór „Zdrowie”)',
    dostawca: 'Urząd Miasta Legionowo',
    typInstytucji: 'local',
    formatPliku: 'CSV (przecinek)',
    separator: ',',
    licencja: 'CC0 1.0',
    adresZbioru: 'https://dane.gov.pl/pl/dataset/40593,zdowie',
    adresPliku: 'https://api.dane.gov.pl/media/resources/20260914/aed.csv',
    dataDanych: '2026-09-14',
    prawdziwe: true,
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
    id: 'port-lotniczy',
    identyfikator: 'przyklad/port-lotniczy-przykladowo',
    tytul: 'Defibrylatory w porcie lotniczym (dane fikcyjne)',
    dostawca: 'Port Lotniczy Przykładowo S.A. (fikcyjny)',
    typInstytucji: 'private',
    formatPliku: 'CSV (średnik)',
    separator: ';',
    licencja: 'CC0 1.0 (dane fikcyjne)',
    adresZbioru: null,
    adresPliku: null,
    dataDanych: '2026-11-20',
    prawdziwe: false,
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
          dysponent_nazwa: 'Port Lotniczy Przykładowo S.A. (fikcyjny)',
          typ_dysponenta: 'transport',
        },
      };
    },
  },
];
