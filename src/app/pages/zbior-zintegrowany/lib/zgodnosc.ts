/**
 * HackNation 2026 – Misja AED. Plik dodany do forka portalu dane.gov.pl (GPL-3.0), 2026-11-21.
 *
 * Narzędzie dla dostawcy „Sprawdź zgodność ze wzorcem”:
 * propozycja mapowania kolumn (po nazwach nagłówków), raport zgodności i przekształcenie pliku do wzorca v1.2.
 */

import { KOLUMNY, POLA_SYSTEMOWE, POLA_WYMAGANE } from './model';
import type { PoleRekordu, RekordAed } from './model';
import { uuidV5 } from './uuid';
import { walidujRekord } from './walidacja-rekordu';
import type { RekordWejsciowy } from './walidacja-rekordu';
import { punktZGeoJson } from './geometria';
import { rozbijAdres } from './zrodla';
import { DNI_PL, godzinyZDni } from './godziny-dni';

/** Godziny jednego dnia (0 = poniedziałek) – łączone w godziny_dostepnosci. */
export type CelDnia = 'DZIEN_0' | 'DZIEN_1' | 'DZIEN_2' | 'DZIEN_3' | 'DZIEN_4' | 'DZIEN_5' | 'DZIEN_6';
export const CELE_DNI: readonly CelDnia[] = [
  'DZIEN_0',
  'DZIEN_1',
  'DZIEN_2',
  'DZIEN_3',
  'DZIEN_4',
  'DZIEN_5',
  'DZIEN_6',
];

/** Cel mapowania: pole wzorca, adres w jednym polu (do rozbicia), cecha ulicy, godziny dnia albo pominięcie. */
export type Cel = PoleRekordu | 'ADRES' | 'CECHA_ULICY' | 'GEOMETRIA' | CelDnia | '';

export const OPIS_CELU: Record<'ADRES' | 'CECHA_ULICY' | 'GEOMETRIA' | CelDnia | '', string> = {
  GEOMETRIA: 'geometria GeoJSON w komórce (punkt → szerokość i długość)',
  ADRES: 'adres w jednym polu (rozbij na ulicę, numer, kod, miejscowość)',
  CECHA_ULICY: 'cecha ulicy (ul., al., pl.) – dołącz do ulicy',
  ...(Object.fromEntries(
    CELE_DNI.map((c, i) => [c, `godziny – ${DNI_PL[i]} (połącz w godziny_dostepnosci)`]),
  ) as Record<CelDnia, string>),
  '': 'pomiń kolumnę',
};

/** Stan urządzenia z plików AED Sync → słownik wzorca. „Nieznany” = brak danych. */
const STAN_AED: Record<string, string> = { sprawny: 'sprawne', nieznany: '' };

export const normalizujNaglowek = (h: string) =>
  h
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const SYNONIMY: Record<string, Cel> = {
  nazwa: 'nazwa_miejsca',
  name: 'nazwa_miejsca',
  obiekt: 'nazwa_miejsca',
  nazwa_obiektu: 'nazwa_miejsca',
  lokalizacja: 'opis_lokalizacji',
  gdzie: 'opis_lokalizacji',
  opis: 'opis_lokalizacji',
  opis_miejsca: 'opis_lokalizacji',
  adres: 'ADRES',
  address: 'ADRES',
  cecha_ulicy: 'CECHA_ULICY',
  geometry: 'GEOMETRIA',
  geometria: 'GEOMETRIA',
  geom: 'GEOMETRIA',
  ulica: 'ulica',
  nazwa_ulicy: 'ulica',
  street: 'ulica',
  nr: 'numer_budynku',
  numer: 'numer_budynku',
  nr_budynku: 'numer_budynku',
  numer_domu: 'numer_budynku',
  home_number: 'numer_budynku',
  house_number: 'numer_budynku',
  nr_lokalu: 'numer_lokalu',
  kod: 'kod_pocztowy',
  postcode: 'kod_pocztowy',
  postal_code: 'kod_pocztowy',
  miasto: 'miejscowosc',
  city: 'miejscowosc',
  place: 'miejscowosc',
  kod_terc: 'teryt_terc',
  terc: 'teryt_terc',
  kod_simc: 'teryt_simc',
  simc: 'teryt_simc',
  kod_ulic: 'teryt_ulic',
  lat: 'szerokosc_geograficzna',
  latitude: 'szerokosc_geograficzna',
  szerokosc: 'szerokosc_geograficzna',
  lon: 'dlugosc_geograficzna',
  lng: 'dlugosc_geograficzna',
  longitude: 'dlugosc_geograficzna',
  dlugosc: 'dlugosc_geograficzna',
  w_budynku: 'wewnatrz_budynku',
  wewnatrz: 'wewnatrz_budynku',
  indoor: 'wewnatrz_budynku',
  dostepnosc: 'dostep',
  access: 'dostep',
  godziny: 'godziny_dostepnosci',
  opening_hours: 'godziny_dostepnosci',
  godziny_otwarcia: 'godziny_dostepnosci',
  poziom: 'pietro',
  level: 'pietro',
  telefon: 'telefon_kontaktowy',
  phone: 'telefon_kontaktowy',
  id: 'id_aed',
  numer_id: 'id_aed',
  // AED Sync (nagłówki PL i EN)
  facility_name: 'nazwa_miejsca',
  locality: 'miejscowosc',
  building_number: 'numer_budynku',
  komentarz_aed: 'opis_lokalizacji',
  aed_comment: 'opis_lokalizacji',
  szerokosc_geograficzna_aed: 'szerokosc_geograficzna',
  aed_latitude: 'szerokosc_geograficzna',
  dlugosc_geograficzna_aed: 'dlugosc_geograficzna',
  aed_longitude: 'dlugosc_geograficzna',
  stan_aed: 'status_urzadzenia',
  aed_status: 'status_urzadzenia',
  data_weryfikacji_stanu_aed: 'data_ostatniego_przegladu',
  aed_status_verification_date: 'data_ostatniego_przegladu',
  odpowiedzialny_za_aed: 'dysponent_nazwa',
  aed_responsible_entity: 'dysponent_nazwa',
  telefon_odpowiedzialnego_za_aed: 'telefon_kontaktowy',
  aed_responsible_phone: 'telefon_kontaktowy',
  poniedzialek_godziny: 'DZIEN_0',
  monday_hours: 'DZIEN_0',
  wtorek_godziny: 'DZIEN_1',
  tuesday_hours: 'DZIEN_1',
  sroda_godziny: 'DZIEN_2',
  wednesday_hours: 'DZIEN_2',
  czwartek_godziny: 'DZIEN_3',
  thursday_hours: 'DZIEN_3',
  piatek_godziny: 'DZIEN_4',
  friday_hours: 'DZIEN_4',
  sobota_godziny: 'DZIEN_5',
  saturday_hours: 'DZIEN_5',
  niedziela_godziny: 'DZIEN_6',
  sunday_hours: 'DZIEN_6',
};

export function zaproponujMapowanie(
  naglowki: readonly string[],
  wiersze: readonly Record<string, string>[] = [],
): Cel[] {
  const uzyte = new Set<Cel>();
  const wynik: Cel[] = naglowki.map((h) => {
    const n = normalizujNaglowek(h);
    const cel: Cel = (KOLUMNY as readonly string[]).includes(n) ? (n as PoleRekordu) : (SYNONIMY[n] ?? '');
    // Każde pole wzorca tylko raz (wyjątek: ulica może powstać z cechy i nazwy).
    if (cel && cel !== 'ulica' && uzyte.has(cel)) return '';
    uzyte.add(cel);
    return cel;
  });
  // Kolumna „nazwa” z tą samą wartością w każdym wierszu (np. „Defibrylator” w Krośnie) nie opisuje miejsca –
  // wtedy nazwą miejsca jest kolumna opisu lokalizacji.
  const iNazwa = wynik.indexOf('nazwa_miejsca');
  const iOpis = wynik.indexOf('opis_lokalizacji');
  if (iNazwa >= 0 && iOpis >= 0 && czyStala(wiersze, naglowki[iNazwa])) {
    wynik[iNazwa] = '';
    wynik[iOpis] = 'nazwa_miejsca';
  }
  return wynik;
}

function czyStala(wiersze: readonly Record<string, string>[], kolumna: string): boolean {
  const wart = new Set(wiersze.map((w) => w[kolumna]).filter(Boolean));
  return wiersze.length > 2 && wart.size === 1;
}

export interface ProblemZgodnosci {
  kolumna: string;
  opis: string;
  liczba: number;
  przyklad: string;
}

export interface OdrzuconyWierszPliku {
  wiersz: number;
  nazwa: string;
  powod: string;
}

export interface RaportZgodnosci {
  wierszy: number;
  /** Pola wymagane wzorca (15), których plik nie dostarcza. Pola nadawane przez narzędzie się nie liczą. */
  brakujaceWymagane: PoleRekordu[];
  adresWJednymPolu: boolean;
  staleKolumny: string[];
  problemy: ProblemZgodnosci[];
  odrzucone: OdrzuconyWierszPliku[];
  rekordy: RekordAed[];
}

const CECHA: Record<string, string> = { ulica: 'ul.', aleja: 'al.', plac: 'pl.', osiedle: 'os.' };

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/**
 * Sprawdza plik dostawcy tą samą funkcją walidacji co harmonizacja (walidujRekord).
 * @param dataAktualizacji data i godzina ostatniej zmiany pliku (yyyy-mm-ddThh:mm) – trafia do data_aktualizacji
 */
export function sprawdzZgodnosc(
  naglowki: readonly string[],
  wiersze: readonly Record<string, string>[],
  mapowanie: readonly Cel[],
  identyfikatorZbioru: string,
  dataAktualizacji: string,
): RaportZgodnosci {
  const problemy = new Map<string, ProblemZgodnosci>();
  const zglos = (kolumna: string, opis: string, przyklad: string) => {
    const k = `${kolumna}|${opis}`;
    const p = problemy.get(k) ?? { kolumna, opis, liczba: 0, przyklad };
    p.liczba++;
    problemy.set(k, p);
  };

  // Które pola wzorca dostarcza plik i z której kolumny (do komunikatów).
  const kolumnaPola = new Map<PoleRekordu, string>();
  naglowki.forEach((h, i) => {
    const c = mapowanie[i];
    if (c === 'GEOMETRIA')
      (['szerokosc_geograficzna', 'dlugosc_geograficzna'] as const).forEach((p) => kolumnaPola.set(p, h));
    else if (c === 'ADRES')
      (['ulica', 'numer_budynku', 'kod_pocztowy', 'miejscowosc'] as const).forEach((p) => kolumnaPola.set(p, h));
    else if (c && (CELE_DNI as readonly string[]).includes(c)) {
      if (!kolumnaPola.has('godziny_dostepnosci')) kolumnaPola.set('godziny_dostepnosci', h);
    } else if (c && c !== 'CECHA_ULICY') kolumnaPola.set(c as PoleRekordu, h);
  });
  const sGodzinyDni = mapowanie.some((c) => (CELE_DNI as readonly string[]).includes(c));

  // Ostrzegamy tylko o kolumnach, które mają opisywać konkretny AED (stała miejscowość w pliku gminy to norma).
  const staleKolumny = naglowki.filter(
    (h, i) =>
      (mapowanie[i] === 'nazwa_miejsca' || mapowanie[i] === 'opis_lokalizacji' || mapowanie[i] === '') &&
      czyStala(wiersze, h),
  );

  const odrzucone: OdrzuconyWierszPliku[] = [];
  const rekordy: RekordAed[] = [];

  wiersze.forEach((w, i) => {
    const wej: RekordWejsciowy = {};
    let cecha = '';
    const dni: (string | null)[] = Array(7).fill(null);
    naglowki.forEach((h, j) => {
      const cel = mapowanie[j];
      const v = (w[h] ?? '').trim();
      if (!cel || v === '') return;
      if (cel === 'ADRES') Object.assign(wej, rozbijAdres(v));
      else if (cel === 'GEOMETRIA') {
        const punkt = punktZGeoJson(v);
        if (punkt) {
          wej.dlugosc_geograficzna = punkt[0];
          wej.szerokosc_geograficzna = punkt[1];
        } else zglos(h, 'Geometria nie jest punktem GeoJSON.', v.slice(0, 60));
      } else if (cel === 'CECHA_ULICY') cecha = CECHA[v.toLowerCase()] ?? v;
      else if ((CELE_DNI as readonly string[]).includes(cel)) dni[CELE_DNI.indexOf(cel as CelDnia)] = v;
      else if (cel === 'status_urzadzenia') {
        const stan = STAN_AED[v.toLowerCase()];
        if (stan !== '') wej[cel] = stan ?? v;
      } else wej[cel as PoleRekordu] = v;
    });
    if (cecha && wej.ulica) wej.ulica = `${cecha} ${wej.ulica}`;
    if (sGodzinyDni && !wej.godziny_dostepnosci) {
      const g = godzinyZDni(dni);
      const kol = kolumnaPola.get('godziny_dostepnosci') ?? 'godziny';
      if (g.zapis) wej.godziny_dostepnosci = g.zapis;
      for (const b of g.bledne)
        zglos(
          kol,
          `Godziny dnia (${b.dzien}) nie mają formatu HH:MM-HH:MM ani „Niedostępny” – ten dzień pominięto.`,
          b.wartosc,
        );
      if (g.bezDanych.length === 7)
        zglos(kol, 'Brak godzin we wszystkich dniach – pusta komórka nie oznacza dostępności całodobowej.', '');
      else if (g.bezDanych.length)
        zglos(
          kol,
          'Brak godzin w części dni – pusta komórka nie oznacza dostępności całodobowej; te dni uznano za niedostępne.',
          g.bezDanych.join(', '),
        );
    }

    const { rekord, bledy, ostrzezenia } = walidujRekord(wej);
    for (const o of ostrzezenia) zglos(kolumnaPola.get(o.pole) ?? o.pole, o.opis, o.wartosc);
    if (bledy.length) {
      // Numer wiersza tak, jak widać go w arkuszu: wiersz 1 to nagłówek.
      odrzucone.push({ wiersz: i + 2, nazwa: rekord.nazwa_miejsca ?? '(brak)', powod: bledy.join(' ') });
      return;
    }
    const idZrodlowe = typeof wej.id_aed === 'string' ? wej.id_aed : '';
    const klucz =
      idZrodlowe || norm([rekord.nazwa_miejsca, rekord.ulica, rekord.numer_budynku, rekord.miejscowosc].join(' '));
    rekordy.push({
      ...(Object.fromEntries(KOLUMNY.map((k) => [k, null])) as unknown as RekordAed),
      ...rekord,
      id_aed: uuidV5(`${identyfikatorZbioru}#${klucz}`),
      zrodlo_danych: identyfikatorZbioru,
      data_aktualizacji: dataAktualizacji,
    } as RekordAed);
  });

  return {
    wierszy: wiersze.length,
    brakujaceWymagane: POLA_WYMAGANE.filter((p) => !POLA_SYSTEMOWE.includes(p) && !kolumnaPola.has(p)),
    adresWJednymPolu: mapowanie.includes('ADRES'),
    staleKolumny,
    problemy: [...problemy.values()],
    odrzucone,
    rekordy,
  };
}
