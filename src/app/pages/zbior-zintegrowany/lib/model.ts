/**
 * HackNation 2026 – Misja AED. Plik dodany do forka portalu dane.gov.pl (GPL-3.0), 2026-11-21.
 *
 * Model rekordu: 28 pól szablonu AED Sync v15 (AED_Sync_instrukcja_i_opis_pol_v15.xlsx, arkusz
 * „OPIS KOLUMN”) – te same nazwy PL, nagłówki EN, kolejność i obowiązkowość. Dostawcy wgrywają
 * dane na dane.gov.pl według tego szablonu; zbiór zintegrowany je wyświetla. Puste pole = brak danych.
 */

/** Stała wartość pola kod_zbioru_danych – po niej integrator rozpoznaje dane AED Sync. */
export const KOD_ZBIORU = 'AED-SYNC-PL';

export interface RekordAed {
  nazwa_obiektu: string | null;
  wojewodztwo: string | null;
  powiat: string | null;
  gmina: string | null;
  kod_terc: string | null;
  kod_simc: string | null;
  miejscowosc: string | null;
  ulica: string | null;
  numer_budynku: string | null;
  kod_pocztowy: string | null;
  komentarz_aed: string | null;
  szerokosc_geograficzna_aed: number | null;
  dlugosc_geograficzna_aed: number | null;
  poniedzialek_godziny: string | null;
  wtorek_godziny: string | null;
  sroda_godziny: string | null;
  czwartek_godziny: string | null;
  piatek_godziny: string | null;
  sobota_godziny: string | null;
  niedziela_godziny: string | null;
  stan_aed: string | null;
  data_weryfikacji_stanu_aed: string | null;
  odpowiedzialny_za_aed: string | null;
  telefon_odpowiedzialnego_za_aed: string | null;
  email_odpowiedzialnego_za_aed: string | null;
  dostawca: string | null;
  data_dostarczenia_danych: string | null;
  kod_zbioru_danych: string | null;
}

export type PoleRekordu = keyof RekordAed;

/** Pola szablonu v15 w kolejności kolumn: nazwa PL, nagłówek EN, nazwa pola i obowiązkowość („Tak”). */
export const POLA: readonly { pole: PoleRekordu; en: string; etykieta: string; wymagane: boolean }[] = [
  { pole: 'nazwa_obiektu', en: 'facility_name', etykieta: 'Nazwa obiektu', wymagane: true },
  { pole: 'wojewodztwo', en: 'voivodeship', etykieta: 'Województwo', wymagane: true },
  { pole: 'powiat', en: 'county', etykieta: 'Powiat', wymagane: true },
  { pole: 'gmina', en: 'municipality', etykieta: 'Gmina', wymagane: true },
  { pole: 'kod_terc', en: 'terc_code', etykieta: 'Kod TERC', wymagane: false },
  { pole: 'kod_simc', en: 'simc_code', etykieta: 'Kod SIMC', wymagane: false },
  { pole: 'miejscowosc', en: 'locality', etykieta: 'Miejscowość', wymagane: true },
  { pole: 'ulica', en: 'street', etykieta: 'Ulica', wymagane: false },
  { pole: 'numer_budynku', en: 'building_number', etykieta: 'Numer budynku', wymagane: true },
  { pole: 'kod_pocztowy', en: 'postal_code', etykieta: 'Kod pocztowy', wymagane: false },
  { pole: 'komentarz_aed', en: 'aed_comment', etykieta: 'Komentarz o AED', wymagane: true },
  {
    pole: 'szerokosc_geograficzna_aed',
    en: 'aed_latitude',
    etykieta: 'Szerokość geograficzna AED',
    wymagane: false,
  },
  {
    pole: 'dlugosc_geograficzna_aed',
    en: 'aed_longitude',
    etykieta: 'Długość geograficzna AED',
    wymagane: false,
  },
  { pole: 'poniedzialek_godziny', en: 'monday_hours', etykieta: 'Poniedziałek – dostępność', wymagane: false },
  { pole: 'wtorek_godziny', en: 'tuesday_hours', etykieta: 'Wtorek – dostępność', wymagane: false },
  { pole: 'sroda_godziny', en: 'wednesday_hours', etykieta: 'Środa – dostępność', wymagane: false },
  { pole: 'czwartek_godziny', en: 'thursday_hours', etykieta: 'Czwartek – dostępność', wymagane: false },
  { pole: 'piatek_godziny', en: 'friday_hours', etykieta: 'Piątek – dostępność', wymagane: false },
  { pole: 'sobota_godziny', en: 'saturday_hours', etykieta: 'Sobota – dostępność', wymagane: false },
  { pole: 'niedziela_godziny', en: 'sunday_hours', etykieta: 'Niedziela – dostępność', wymagane: false },
  { pole: 'stan_aed', en: 'aed_status', etykieta: 'Stan AED', wymagane: true },
  {
    pole: 'data_weryfikacji_stanu_aed',
    en: 'aed_status_verification_date',
    etykieta: 'Data weryfikacji stanu AED',
    wymagane: true,
  },
  { pole: 'odpowiedzialny_za_aed', en: 'aed_responsible_entity', etykieta: 'Odpowiedzialny za AED', wymagane: true },
  {
    pole: 'telefon_odpowiedzialnego_za_aed',
    en: 'aed_responsible_phone',
    etykieta: 'Telefon odpowiedzialnego za AED',
    wymagane: true,
  },
  {
    pole: 'email_odpowiedzialnego_za_aed',
    en: 'aed_responsible_email',
    etykieta: 'E-mail odpowiedzialnego za AED',
    wymagane: true,
  },
  { pole: 'dostawca', en: 'provider', etykieta: 'Dostawca', wymagane: true },
  {
    pole: 'data_dostarczenia_danych',
    en: 'data_delivery_date',
    etykieta: 'Data dostarczenia danych',
    wymagane: true,
  },
  { pole: 'kod_zbioru_danych', en: 'dataset_code', etykieta: 'Kod zbioru danych', wymagane: true },
];

export const KOLUMNY: readonly PoleRekordu[] = POLA.map((p) => p.pole);

export const ETYKIETY = Object.fromEntries(POLA.map((p) => [p.pole, p.etykieta])) as Record<PoleRekordu, string>;

/** Nagłówki EN (arkusz „DATA EN”) – narzędzie rozpoznaje plik z nagłówkami PL albo EN. */
export const NAGLOWKI_EN = Object.fromEntries(POLA.map((p) => [p.pole, p.en])) as Record<PoleRekordu, string>;

/** 15 pól obowiązkowych szablonu v15. */
export const POLA_WYMAGANE: readonly PoleRekordu[] = POLA.filter((p) => p.wymagane).map((p) => p.pole);

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

/** Lista: Sprawny, Niesprawny, Nieznany (v15). */
export const STAN_AED = ['Sprawny', 'Niesprawny', 'Nieznany'] as const;

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
