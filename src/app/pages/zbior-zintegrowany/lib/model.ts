/**
 * HackNation 2026 – Misja AED. Plik dodany do forka portalu dane.gov.pl (GPL-3.0), 2026-11-21.
 *
 * Model rekordu zbioru zintegrowanego: 30 pól ze wzorcowego zakresu danych AED v1.2
 * (arkusz „Zakres danych”, ta sama kolejność kolumn). W zbiorze zintegrowanym pola,
 * których źródło nie dostarcza, mają wartość null – integracja nie zmyśla danych.
 */

export const DOSTEP = ['publiczny', 'klienci', 'ograniczony'] as const;
export type Dostep = (typeof DOSTEP)[number];

export const OPIS_DOSTEPU: Record<Dostep, string> = {
  publiczny: 'Dostęp bez ograniczeń',
  klienci: 'W godzinach otwarcia obiektu',
  ograniczony: 'Wymaga zgody lub udziału osoby trzeciej',
};

export interface RekordAed {
  id_aed: string;
  nazwa_miejsca: string;
  opis_lokalizacji: string | null;
  opis_lokalizacji_en: string | null;
  ulica: string | null;
  numer_budynku: string | null;
  numer_lokalu: string | null;
  kod_pocztowy: string | null;
  miejscowosc: string | null;
  teryt_terc: string | null;
  teryt_simc: string | null;
  teryt_ulic: string | null;
  szerokosc_geograficzna: number;
  dlugosc_geograficzna: number;
  wewnatrz_budynku: boolean | null;
  pietro: number | null;
  dostep: Dostep | null;
  godziny_dostepnosci: string | null;
  typ_dysponenta: string | null;
  dysponent_nazwa: string | null;
  dysponent_regon: string | null;
  telefon_kontaktowy: string | null;
  producent: string | null;
  model: string | null;
  status_urzadzenia: string | null;
  data_ostatniego_przegladu: string | null;
  opis_dodatkowy: string | null;
  /** W zbiorze zintegrowanym: identyfikator zbioru źródłowego (np. dane.gov.pl/dataset/3624). */
  zrodlo_danych: string;
  /** Data danych ze źródła (data_date zasobu) – integracja nie nadpisuje jej datą scalenia. */
  data_aktualizacji: string;
  osm_id: string | null;
}

export type PoleRekordu = keyof RekordAed;

export const KOLUMNY: readonly PoleRekordu[] = [
  'id_aed',
  'nazwa_miejsca',
  'opis_lokalizacji',
  'opis_lokalizacji_en',
  'ulica',
  'numer_budynku',
  'numer_lokalu',
  'kod_pocztowy',
  'miejscowosc',
  'teryt_terc',
  'teryt_simc',
  'teryt_ulic',
  'szerokosc_geograficzna',
  'dlugosc_geograficzna',
  'wewnatrz_budynku',
  'pietro',
  'dostep',
  'godziny_dostepnosci',
  'typ_dysponenta',
  'dysponent_nazwa',
  'dysponent_regon',
  'telefon_kontaktowy',
  'producent',
  'model',
  'status_urzadzenia',
  'data_ostatniego_przegladu',
  'opis_dodatkowy',
  'zrodlo_danych',
  'data_aktualizacji',
  'osm_id',
];

export const ETYKIETY: Record<PoleRekordu, string> = {
  id_aed: 'Identyfikator',
  nazwa_miejsca: 'Nazwa miejsca',
  opis_lokalizacji: 'Gdzie dokładnie jest AED',
  opis_lokalizacji_en: 'Opis lokalizacji po angielsku',
  ulica: 'Ulica',
  numer_budynku: 'Numer budynku',
  numer_lokalu: 'Numer lokalu',
  kod_pocztowy: 'Kod pocztowy',
  miejscowosc: 'Miejscowość',
  teryt_terc: 'Kod TERC',
  teryt_simc: 'Kod SIMC',
  teryt_ulic: 'Kod ULIC',
  szerokosc_geograficzna: 'Szerokość geograficzna',
  dlugosc_geograficzna: 'Długość geograficzna',
  wewnatrz_budynku: 'Wewnątrz budynku',
  pietro: 'Piętro',
  dostep: 'Kto ma dostęp',
  godziny_dostepnosci: 'Godziny dostępności',
  typ_dysponenta: 'Typ dysponenta',
  dysponent_nazwa: 'Nazwa dysponenta',
  dysponent_regon: 'REGON dysponenta',
  telefon_kontaktowy: 'Telefon kontaktowy',
  producent: 'Producent',
  model: 'Model',
  status_urzadzenia: 'Status urządzenia',
  data_ostatniego_przegladu: 'Data ostatniego przeglądu',
  opis_dodatkowy: 'Dodatkowe informacje',
  zrodlo_danych: 'Źródło danych',
  data_aktualizacji: 'Data aktualizacji',
  osm_id: 'Identyfikator OSM',
};

/**
 * Pola oznaczone „wymagane” w arkuszu „Zakres danych” wzorca v1.2 (kolumna G) – 15 pól.
 * Kompletność źródła liczymy względem tej listy, np. „9/15”.
 */
export const POLA_WYMAGANE: readonly PoleRekordu[] = [
  'id_aed',
  'nazwa_miejsca',
  'opis_lokalizacji',
  'ulica',
  'numer_budynku',
  'kod_pocztowy',
  'miejscowosc',
  'szerokosc_geograficzna',
  'dlugosc_geograficzna',
  'wewnatrz_budynku',
  'dostep',
  'godziny_dostepnosci',
  'dysponent_nazwa',
  'zrodlo_danych',
  'data_aktualizacji',
];

/** Pola nadawane przez narzędzie integrujące, nie przez dostawcę (xlsx, kolumna K: „nadaje system”). */
export const POLA_SYSTEMOWE: readonly PoleRekordu[] = ['id_aed', 'zrodlo_danych', 'data_aktualizacji'];

/** Słowniki z arkusza „Słowniki” wzorca. */
export const STATUS_URZADZENIA = ['sprawne', 'w serwisie', 'wycofane'] as const;
export const TYP_DYSPONENTA = [
  'administracja publiczna',
  'edukacja',
  'ochrona zdrowia',
  'służby',
  'transport',
  'podmiot prywatny',
  'organizacja pozarządowa',
] as const;
