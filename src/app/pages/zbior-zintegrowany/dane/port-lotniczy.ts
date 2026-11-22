/**
 * HackNation 2026 – Misja AED. Plik dodany do forka portalu dane.gov.pl (GPL-3.0), 2026-11-21, zmieniony 2026-11-22.
 *
 * DANE FIKCYJNE. „Port Lotniczy Przykładowo” nie istnieje. Współrzędne są przykładowe i nie wskazują
 * żadnego AED; numery telefonów (+48 00 …) i adresy e-mail (domena .example) są nieprawdziwe.
 * Wzorowy plik dostawcy wypełniony według szablonu AED Sync v15 (arkusz „DANE PL”), opublikowany
 * – w scenariuszu prototypu – jako zasób zbioru dostawcy na dane.gov.pl.
 */

const NAGLOWEK = [
  'nazwa_obiektu',
  'wojewodztwo',
  'powiat',
  'gmina',
  'kod_terc',
  'kod_simc',
  'miejscowosc',
  'ulica',
  'numer_budynku',
  'kod_pocztowy',
  'komentarz_aed',
  'szerokosc_geograficzna_aed',
  'dlugosc_geograficzna_aed',
  'poniedzialek_godziny',
  'wtorek_godziny',
  'sroda_godziny',
  'czwartek_godziny',
  'piatek_godziny',
  'sobota_godziny',
  'niedziela_godziny',
  'stan_aed',
  'data_weryfikacji_stanu_aed',
  'odpowiedzialny_za_aed',
  'telefon_odpowiedzialnego_za_aed',
  'email_odpowiedzialnego_za_aed',
  'dostawca',
  'data_dostarczenia_danych',
  'kod_zbioru_danych',
];

const DOSTAWCA = 'Port Lotniczy Przykładowo S.A. (fikcyjny)';
const ADRES = ['łódzkie', 'przykładowski', 'Przykładowo', '', '', 'Przykładowo', 'ul. Lotnicza'];
const ODDANIE = '2026-11-20';
const KOD = 'AED-SYNC-PL';
const codziennie = (g: string) => [g, g, g, g, g, g, g];
const robocze = (g: string, weekend: string) => [g, g, g, g, g, weekend, weekend];

const WIERSZE: string[][] = [
  [
    'Terminal pasażerski – hala odlotów',
    ...ADRES,
    '1',
    '00-001',
    'Parter, przy stanowiskach odprawy 1–4, obok punktu informacji. Dostępny dla wszystkich.',
    '52.071200',
    '19.226500',
    ...codziennie('4-23:30'),
    'Sprawny',
    '2026-10-15',
    DOSTAWCA,
    '+48 00 000 00 01',
    'aed@port-przykladowo.example',
    DOSTAWCA,
    ODDANIE,
    KOD,
  ],
  [
    'Terminal pasażerski – hala przylotów',
    ...ADRES,
    '1',
    '00-001',
    'Parter, przy wyjściu z odbioru bagażu. Dostępny dla wszystkich.',
    '52.071050',
    '19.226900',
    ...codziennie('4-23:30'),
    'Sprawny',
    '2026-10-15',
    DOSTAWCA,
    '+48 00 000 00 01',
    'aed@port-przykladowo.example',
    DOSTAWCA,
    ODDANIE,
    KOD,
  ],
  [
    'Parking wielopoziomowy P2',
    ...ADRES,
    '3',
    '00-001',
    'Kapsuła na zewnątrz, przy kasach parkingowych, poziom 0. Dostępny dla wszystkich.',
    '52.070300',
    '19.224100',
    ...codziennie('Całodobowo'),
    'Sprawny',
    '2026-11-02',
    'Przykładowe Parkingi sp. z o.o. (fikcyjna)',
    '+48 00 000 00 02',
    'parking@przykladowe-parkingi.example',
    DOSTAWCA,
    ODDANIE,
    KOD,
  ],
  [
    'Budynek administracyjny portu',
    ...ADRES,
    '5',
    '00-001',
    '1. piętro, korytarz przy sekretariacie. Wejście przez recepcję.',
    '52.072400',
    '19.228300',
    ...robocze('8-12, 13-16', 'Niedostępny'),
    'Sprawny',
    '2026-09-30',
    DOSTAWCA,
    '+48 00 000 00 01',
    'aed@port-przykladowo.example',
    DOSTAWCA,
    ODDANIE,
    KOD,
  ],
  [
    'Hangar techniczny',
    ...ADRES,
    '9',
    '00-001',
    'Pomieszczenie socjalne przy wejściu B. Dostęp tylko dla pracowników obsługi technicznej.',
    '52.069500',
    '19.230800',
    ...robocze('6-18', 'Niedostępny'),
    'Niesprawny',
    '2026-11-18',
    'Przykładowa Obsługa Techniczna sp. z o.o. (fikcyjna)',
    '+48 00 000 00 03',
    'serwis@przykladowa-obsluga.example',
    DOSTAWCA,
    ODDANIE,
    KOD,
  ],
  [
    'Straż pożarna lotniska',
    ...ADRES,
    '11',
    '00-001',
    'Remiza, przy bramie wjazdowej. Ratownicy na miejscu przez całą dobę – zadzwoń domofonem.',
    '52.068900',
    '19.223600',
    ...codziennie('Całodobowo'),
    'Sprawny',
    '2026-11-10',
    'Lotniskowa Służba Ratowniczo-Gaśnicza Przykładowo (fikcyjna)',
    '+48 00 000 00 04',
    'lsrg@port-przykladowo.example',
    DOSTAWCA,
    ODDANIE,
    KOD,
  ],
];

const komorka = (v: string) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** Plik CSV dostawcy: UTF-8, przecinek, CRLF, jeden wiersz nagłówka (nagłówki PL szablonu v15). */
export const CSV_PORT_LOTNICZY = [NAGLOWEK, ...WIERSZE].map((w) => w.map(komorka).join(',')).join('\r\n') + '\r\n';
