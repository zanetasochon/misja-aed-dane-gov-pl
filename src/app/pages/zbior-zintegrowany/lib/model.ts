/**
 * HackNation 2026 – Misja AED. Plik dodany do forka portalu dane.gov.pl (GPL-3.0), 2026-11-21.
 *
 * Model rekordu zbioru zintegrowanego: 43 pola ze wzorcowego zakresu danych AED v1.3
 * (arkusz „Zakres danych”, ta sama kolejność kolumn). v1.3 (2026-11-22) przejmuje rozwiązania
 * formatu AED Sync: 9 pól wymaganych, opcjonalne współrzędne, godziny osobno dla każdego dnia,
 * województwo, powiat i gminę słownie, osobno dostawcę i podmiot odpowiedzialny za AED (z e-mailem),
 * nagłówki PL i EN oraz kod zbioru AED-SYNC-PL. W zbiorze zintegrowanym pola, których źródło
 * nie dostarcza, mają wartość null – integracja nie zmyśla danych.
 */

export const DOSTEP = ['publiczny', 'klienci', 'ograniczony'] as const;
export type Dostep = (typeof DOSTEP)[number];

export const OPIS_DOSTEPU: Record<Dostep, string> = {
  publiczny: 'Dostęp bez ograniczeń',
  klienci: 'W godzinach otwarcia obiektu',
  ograniczony: 'Wymaga zgody lub udziału osoby trzeciej',
};

/** Stała wartość pola kod_zbioru_danych – po niej integrator rozpoznaje dane do zbioru zintegrowanego. */
export const KOD_ZBIORU = 'AED-SYNC-PL';

export interface RekordAed {
  id_aed: string;
  kod_zbioru_danych: string | null;
  nazwa_miejsca: string | null;
  opis_lokalizacji: string | null;
  opis_lokalizacji_en: string | null;
  wojewodztwo: string | null;
  powiat: string | null;
  gmina: string | null;
  miejscowosc: string | null;
  ulica: string | null;
  numer_budynku: string | null;
  numer_lokalu: string | null;
  kod_pocztowy: string | null;
  teryt_terc: string | null;
  teryt_simc: string | null;
  teryt_ulic: string | null;
  szerokosc_geograficzna: number | null;
  dlugosc_geograficzna: number | null;
  wewnatrz_budynku: boolean | null;
  pietro: number | null;
  dostep: Dostep | null;
  poniedzialek_godziny: string | null;
  wtorek_godziny: string | null;
  sroda_godziny: string | null;
  czwartek_godziny: string | null;
  piatek_godziny: string | null;
  sobota_godziny: string | null;
  niedziela_godziny: string | null;
  /** Godziny w składni opening_hours (OSM) – wpisane albo wyliczone z kolumn dni. */
  godziny_dostepnosci: string | null;
  odpowiedzialny_za_aed: string | null;
  typ_odpowiedzialnego_za_aed: string | null;
  regon_odpowiedzialnego_za_aed: string | null;
  telefon_odpowiedzialnego_za_aed: string | null;
  email_odpowiedzialnego_za_aed: string | null;
  dostawca: string | null;
  producent: string | null;
  model: string | null;
  status_urzadzenia: string | null;
  data_ostatniego_przegladu: string | null;
  opis_dodatkowy: string | null;
  osm_id: string | null;
  /** W zbiorze zintegrowanym: adres zbioru źródłowego (np. https://dane.gov.pl/pl/dataset/3624). */
  zrodlo_danych: string;
  /** Data danych ze źródła – integracja nie nadpisuje jej datą scalenia. */
  data_aktualizacji: string;
}

export type PoleRekordu = keyof RekordAed;

export type Obowiazkowosc = 'wymagane' | 'zalecane' | 'opcjonalne' | 'nadaje narzędzie';

/** Pola wzorca v1.3 w kolejności kolumn: nazwa techniczna, nagłówek EN, etykieta i obowiązkowość. */
export const POLA: readonly { pole: PoleRekordu; en: string; etykieta: string; obowiazkowosc: Obowiazkowosc }[] = [
  { pole: 'id_aed', en: 'aed_id', etykieta: 'Identyfikator', obowiazkowosc: 'nadaje narzędzie' },
  { pole: 'kod_zbioru_danych', en: 'dataset_code', etykieta: 'Kod zbioru danych', obowiazkowosc: 'wymagane' },
  { pole: 'nazwa_miejsca', en: 'facility_name', etykieta: 'Nazwa miejsca', obowiazkowosc: 'zalecane' },
  { pole: 'opis_lokalizacji', en: 'aed_location', etykieta: 'Gdzie dokładnie jest AED', obowiazkowosc: 'wymagane' },
  {
    pole: 'opis_lokalizacji_en',
    en: 'aed_location_en',
    etykieta: 'Opis lokalizacji po angielsku',
    obowiazkowosc: 'opcjonalne',
  },
  { pole: 'wojewodztwo', en: 'voivodeship', etykieta: 'Województwo', obowiazkowosc: 'wymagane' },
  { pole: 'powiat', en: 'county', etykieta: 'Powiat', obowiazkowosc: 'wymagane' },
  { pole: 'gmina', en: 'municipality', etykieta: 'Gmina', obowiazkowosc: 'wymagane' },
  { pole: 'miejscowosc', en: 'locality', etykieta: 'Miejscowość', obowiazkowosc: 'wymagane' },
  { pole: 'ulica', en: 'street', etykieta: 'Ulica', obowiazkowosc: 'zalecane' },
  { pole: 'numer_budynku', en: 'building_number', etykieta: 'Numer budynku', obowiazkowosc: 'wymagane' },
  { pole: 'numer_lokalu', en: 'unit_number', etykieta: 'Numer lokalu', obowiazkowosc: 'opcjonalne' },
  { pole: 'kod_pocztowy', en: 'postal_code', etykieta: 'Kod pocztowy', obowiazkowosc: 'zalecane' },
  { pole: 'teryt_terc', en: 'teryt_terc', etykieta: 'Kod TERC', obowiazkowosc: 'opcjonalne' },
  { pole: 'teryt_simc', en: 'teryt_simc', etykieta: 'Kod SIMC', obowiazkowosc: 'opcjonalne' },
  { pole: 'teryt_ulic', en: 'teryt_ulic', etykieta: 'Kod ULIC', obowiazkowosc: 'opcjonalne' },
  { pole: 'szerokosc_geograficzna', en: 'aed_latitude', etykieta: 'Szerokość geograficzna', obowiazkowosc: 'zalecane' },
  { pole: 'dlugosc_geograficzna', en: 'aed_longitude', etykieta: 'Długość geograficzna', obowiazkowosc: 'zalecane' },
  { pole: 'wewnatrz_budynku', en: 'indoor', etykieta: 'Wewnątrz budynku', obowiazkowosc: 'zalecane' },
  { pole: 'pietro', en: 'level', etykieta: 'Piętro', obowiazkowosc: 'opcjonalne' },
  { pole: 'dostep', en: 'access', etykieta: 'Kto ma dostęp', obowiazkowosc: 'zalecane' },
  { pole: 'poniedzialek_godziny', en: 'monday_hours', etykieta: 'Poniedziałek – godziny', obowiazkowosc: 'zalecane' },
  { pole: 'wtorek_godziny', en: 'tuesday_hours', etykieta: 'Wtorek – godziny', obowiazkowosc: 'zalecane' },
  { pole: 'sroda_godziny', en: 'wednesday_hours', etykieta: 'Środa – godziny', obowiazkowosc: 'zalecane' },
  { pole: 'czwartek_godziny', en: 'thursday_hours', etykieta: 'Czwartek – godziny', obowiazkowosc: 'zalecane' },
  { pole: 'piatek_godziny', en: 'friday_hours', etykieta: 'Piątek – godziny', obowiazkowosc: 'zalecane' },
  { pole: 'sobota_godziny', en: 'saturday_hours', etykieta: 'Sobota – godziny', obowiazkowosc: 'zalecane' },
  { pole: 'niedziela_godziny', en: 'sunday_hours', etykieta: 'Niedziela – godziny', obowiazkowosc: 'zalecane' },
  {
    pole: 'godziny_dostepnosci',
    en: 'opening_hours',
    etykieta: 'Godziny (składnia opening_hours)',
    obowiazkowosc: 'opcjonalne',
  },
  {
    pole: 'odpowiedzialny_za_aed',
    en: 'aed_responsible_entity',
    etykieta: 'Odpowiedzialny za AED',
    obowiazkowosc: 'wymagane',
  },
  {
    pole: 'typ_odpowiedzialnego_za_aed',
    en: 'aed_responsible_type',
    etykieta: 'Typ odpowiedzialnego za AED',
    obowiazkowosc: 'opcjonalne',
  },
  {
    pole: 'regon_odpowiedzialnego_za_aed',
    en: 'aed_responsible_regon',
    etykieta: 'REGON odpowiedzialnego za AED',
    obowiazkowosc: 'opcjonalne',
  },
  {
    pole: 'telefon_odpowiedzialnego_za_aed',
    en: 'aed_responsible_phone',
    etykieta: 'Telefon odpowiedzialnego za AED',
    obowiazkowosc: 'zalecane',
  },
  {
    pole: 'email_odpowiedzialnego_za_aed',
    en: 'aed_responsible_email',
    etykieta: 'E-mail odpowiedzialnego za AED',
    obowiazkowosc: 'zalecane',
  },
  { pole: 'dostawca', en: 'provider', etykieta: 'Dostawca danych', obowiazkowosc: 'wymagane' },
  { pole: 'producent', en: 'manufacturer', etykieta: 'Producent', obowiazkowosc: 'opcjonalne' },
  { pole: 'model', en: 'model', etykieta: 'Model', obowiazkowosc: 'opcjonalne' },
  { pole: 'status_urzadzenia', en: 'aed_status', etykieta: 'Stan urządzenia', obowiazkowosc: 'zalecane' },
  {
    pole: 'data_ostatniego_przegladu',
    en: 'aed_status_verification_date',
    etykieta: 'Data ostatniego przeglądu',
    obowiazkowosc: 'zalecane',
  },
  { pole: 'opis_dodatkowy', en: 'additional_info', etykieta: 'Dodatkowe informacje', obowiazkowosc: 'opcjonalne' },
  { pole: 'osm_id', en: 'osm_id', etykieta: 'Identyfikator OSM', obowiazkowosc: 'opcjonalne' },
  { pole: 'zrodlo_danych', en: 'data_source', etykieta: 'Źródło danych', obowiazkowosc: 'nadaje narzędzie' },
  {
    pole: 'data_aktualizacji',
    en: 'last_update',
    etykieta: 'Data aktualizacji',
    obowiazkowosc: 'nadaje narzędzie',
  },
];

export const KOLUMNY: readonly PoleRekordu[] = POLA.map((p) => p.pole);

export const ETYKIETY = Object.fromEntries(POLA.map((p) => [p.pole, p.etykieta])) as Record<PoleRekordu, string>;

/** Nagłówki EN (jak w AED Sync) – narzędzie rozpoznaje plik z nagłówkami PL albo EN. */
export const NAGLOWKI_EN = Object.fromEntries(POLA.map((p) => [p.pole, p.en])) as Record<PoleRekordu, string>;

/** 9 pól wymaganych wzorca v1.3 – kompletność źródła liczymy względem tej listy, np. „6 z 9”. */
export const POLA_WYMAGANE: readonly PoleRekordu[] = POLA.filter((p) => p.obowiazkowosc === 'wymagane').map(
  (p) => p.pole,
);

/** Pola nadawane przez narzędzie integrujące, nie przez dostawcę. */
export const POLA_SYSTEMOWE: readonly PoleRekordu[] = POLA.filter((p) => p.obowiazkowosc === 'nadaje narzędzie').map(
  (p) => p.pole,
);

/** Kolumny godzin od poniedziałku do niedzieli. */
export const POLA_DNI = [
  'poniedzialek_godziny',
  'wtorek_godziny',
  'sroda_godziny',
  'czwartek_godziny',
  'piatek_godziny',
  'sobota_godziny',
  'niedziela_godziny',
] as const satisfies readonly PoleRekordu[];

/** Słowniki z arkusza „Słowniki” wzorca. */
export const STATUS_URZADZENIA = ['sprawne', 'niesprawne', 'w serwisie', 'wycofane'] as const;
export const TYP_ODPOWIEDZIALNEGO = [
  'administracja publiczna',
  'edukacja',
  'ochrona zdrowia',
  'służby',
  'transport',
  'podmiot prywatny',
  'organizacja pozarządowa',
] as const;
export const WOJEWODZTWA = [
  'dolnośląskie',
  'kujawsko-pomorskie',
  'lubelskie',
  'lubuskie',
  'łódzkie',
  'małopolskie',
  'mazowieckie',
  'opolskie',
  'podkarpackie',
  'podlaskie',
  'pomorskie',
  'śląskie',
  'świętokrzyskie',
  'warmińsko-mazurskie',
  'wielkopolskie',
  'zachodniopomorskie',
] as const;
