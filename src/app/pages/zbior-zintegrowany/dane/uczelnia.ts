/**
 * HackNation 2026 – Misja AED. Plik dodany do forka portalu dane.gov.pl (GPL-3.0), 2026-11-22.
 *
 * DANE FIKCYJNE. „Uniwersytet Przykładowy” i miasto „Przykładów” nie istnieją. Współrzędne są przykładowe
 * i nie wskazują żadnego AED; numery telefonów (+48 00 …) i adresy e-mail (domena .example) są nieprawdziwe.
 * Drugi wzorowy plik dostawcy według szablonu AED Sync v15 – tym razem z nagłówkami EN (arkusz „DATA EN”),
 * żeby pokazać, że zbiór zintegrowany łączy oba warianty.
 */

const NAGLOWEK = [
  'facility_name',
  'voivodeship',
  'county',
  'municipality',
  'terc_code',
  'simc_code',
  'locality',
  'street',
  'building_number',
  'postal_code',
  'aed_comment',
  'aed_latitude',
  'aed_longitude',
  'monday_hours',
  'tuesday_hours',
  'wednesday_hours',
  'thursday_hours',
  'friday_hours',
  'saturday_hours',
  'sunday_hours',
  'aed_status',
  'aed_status_verification_date',
  'aed_responsible_entity',
  'aed_responsible_phone',
  'aed_responsible_email',
  'provider',
  'data_delivery_date',
  'dataset_code',
];

const DOSTAWCA = 'Uniwersytet Przykładowy (fikcyjny)';
const MIASTO = ['dolnośląskie', 'przykładowski', 'Przykładów', '', '', 'Przykładów'];
const ODDANIE = '2026-11-21';
const KOD = 'AED-SYNC-PL';
const TEL = '+48 00 000 01 00';
const EMAIL = 'aed@uniwersytet-przykladowy.example';
const dni = (robocze: string, sobota: string, niedziela: string) => [
  robocze,
  robocze,
  robocze,
  robocze,
  robocze,
  sobota,
  niedziela,
];

const WIERSZE: string[][] = [
  [
    'Rektorat',
    ...MIASTO,
    'pl. Uniwersytecki',
    '1',
    '00-010',
    'Parter, hol główny, obok portierni. Dostępny dla wszystkich w godzinach otwarcia budynku.',
    '50.912300',
    '16.615400',
    ...dni('7-20', '8-14', 'Closed'),
    'Sprawny',
    '2026-11-03',
    DOSTAWCA,
    TEL,
    EMAIL,
    DOSTAWCA,
    ODDANIE,
    KOD,
  ],
  [
    'Biblioteka Uniwersytecka',
    ...MIASTO,
    'ul. Książnicza',
    '4',
    '00-010',
    'Parter, przy wypożyczalni. Dostępny dla wszystkich w godzinach otwarcia biblioteki.',
    '50.913100',
    '16.612800',
    ...dni('8-21', '9-15', 'Closed'),
    'Sprawny',
    '2026-10-28',
    DOSTAWCA,
    TEL,
    EMAIL,
    DOSTAWCA,
    ODDANIE,
    KOD,
  ],
  [
    'Hala sportowa AZS',
    ...MIASTO,
    'ul. Sportowa',
    '12',
    '00-011',
    'Kapsuła na zewnątrz, przy wejściu głównym. Dostępny dla wszystkich.',
    '50.909800',
    '16.620900',
    ...dni('24/7', '24/7', '24/7'),
    'Sprawny',
    '2026-11-12',
    'Akademicki Związek Sportowy Przykładów (fikcyjny)',
    '+48 00 000 01 01',
    'hala@azs-przykladow.example',
    DOSTAWCA,
    ODDANIE,
    KOD,
  ],
  [
    'Wydział Chemii',
    ...MIASTO,
    'ul. Laboratoryjna',
    '7',
    '00-011',
    '2. piętro, korytarz przy laboratoriach 201–210. Dostęp dla pracowników i studentów z kartą.',
    '50.910600',
    '16.617200',
    ...dni('7-12, 12:30-19', 'Niedostępny', 'Niedostępny'),
    'Nieznany',
    '2026-03-15',
    DOSTAWCA,
    TEL,
    EMAIL,
    DOSTAWCA,
    ODDANIE,
    KOD,
  ],
  [
    'Dom Studenta „Przystań”',
    ...MIASTO,
    'ul. Akademicka',
    '20',
    '00-012',
    'Parter, recepcja całodobowa – AED za ladą, poproś recepcję.',
    '50.907400',
    '16.611100',
    ...dni('Całodobowo', 'Całodobowo', 'Całodobowo'),
    'Sprawny',
    '2026-11-05',
    'Administracja Domów Studenckich (fikcyjna)',
    '+48 00 000 01 02',
    'akademiki@uniwersytet-przykladowy.example',
    DOSTAWCA,
    ODDANIE,
    KOD,
  ],
];

const komorka = (v: string) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** Plik CSV dostawcy: UTF-8, przecinek, CRLF, jeden wiersz nagłówka (nagłówki EN szablonu v15). */
export const CSV_UCZELNIA = [NAGLOWEK, ...WIERSZE].map((w) => w.map(komorka).join(',')).join('\r\n') + '\r\n';
