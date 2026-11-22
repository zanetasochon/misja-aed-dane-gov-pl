/**
 * HackNation 2026 – Misja AED. Plik dodany do forka portalu dane.gov.pl (GPL-3.0), 2026-11-21.
 *
 * Narzędzie dla dostawcy „Sprawdź zgodność ze wzorcem”:
 * propozycja mapowania kolumn (po nazwach nagłówków PL albo EN), raport zgodności i przekształcenie pliku do wzorca v1.3.
 */

import { KOD_ZBIORU, KOLUMNY, NAGLOWKI_EN, POLA_SYSTEMOWE, POLA_WYMAGANE } from './model';
import type { PoleRekordu, RekordAed } from './model';
import { uuidV5 } from './uuid';
import { walidujRekord } from './walidacja-rekordu';
import type { RekordWejsciowy } from './walidacja-rekordu';
import { punktZGeoJson } from './geometria';
import { rozbijAdres } from './zrodla';

/** Cel mapowania: pole wzorca, adres w jednym polu (do rozbicia), cecha ulicy, geometria albo pominięcie. */
export type Cel = PoleRekordu | 'ADRES' | 'CECHA_ULICY' | 'GEOMETRIA' | '';

export const OPIS_CELU: Record<'ADRES' | 'CECHA_ULICY' | 'GEOMETRIA' | '', string> = {
  GEOMETRIA: 'geometria GeoJSON w komórce (punkt → szerokość i długość)',
  ADRES: 'adres w jednym polu (rozbij na ulicę, numer, kod, miejscowość)',
  CECHA_ULICY: 'cecha ulicy (ul., al., pl.) – dołącz do ulicy',
  '': 'pomiń kolumnę',
};

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
  telefon: 'telefon_odpowiedzialnego_za_aed',
  phone: 'telefon_odpowiedzialnego_za_aed',
  id: 'id_aed',
  numer_id: 'id_aed',
  // Nazwy pól wzorca v1.2 (zmienione w v1.3).
  dysponent_nazwa: 'odpowiedzialny_za_aed',
  dysponent: 'odpowiedzialny_za_aed',
  dysponent_regon: 'regon_odpowiedzialnego_za_aed',
  regon: 'regon_odpowiedzialnego_za_aed',
  typ_dysponenta: 'typ_odpowiedzialnego_za_aed',
  telefon_kontaktowy: 'telefon_odpowiedzialnego_za_aed',
  email: 'email_odpowiedzialnego_za_aed',
  e_mail: 'email_odpowiedzialnego_za_aed',
  // AED Sync – nagłówki PL, które różnią się od nazw wzorca (nagłówki EN wzorca rozpoznajemy z NAGLOWKI_EN).
  nazwa_obiektu_aed: 'nazwa_miejsca',
  komentarz_aed: 'opis_lokalizacji',
  aed_comment: 'opis_lokalizacji',
  szerokosc_geograficzna_aed: 'szerokosc_geograficzna',
  dlugosc_geograficzna_aed: 'dlugosc_geograficzna',
  stan_aed: 'status_urzadzenia',
  data_weryfikacji_stanu_aed: 'data_ostatniego_przegladu',
};

/** Nagłówek EN → pole wzorca (aed_latitude → szerokosc_geograficzna). */
const POLE_Z_EN = Object.fromEntries(Object.entries(NAGLOWKI_EN).map(([pole, en]) => [en, pole])) as Record<
  string,
  PoleRekordu
>;

export function zaproponujMapowanie(
  naglowki: readonly string[],
  wiersze: readonly Record<string, string>[] = [],
): Cel[] {
  const uzyte = new Set<Cel>();
  const wynik: Cel[] = naglowki.map((h) => {
    const n = normalizujNaglowek(h);
    const cel: Cel = (KOLUMNY as readonly string[]).includes(n)
      ? (n as PoleRekordu)
      : (SYNONIMY[n] ?? POLE_Z_EN[n] ?? '');
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
  /** Pola wymagane wzorca (9), których plik nie dostarcza. Pola nadawane przez narzędzie się nie liczą. */
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
    else if (c && c !== 'CECHA_ULICY') kolumnaPola.set(c as PoleRekordu, h);
  });

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
      else wej[cel as PoleRekordu] = v;
    });
    if (cecha && wej.ulica) wej.ulica = `${cecha} ${wej.ulica}`;
    const { rekord, bledy, ostrzezenia } = walidujRekord(wej);
    for (const o of ostrzezenia) zglos(kolumnaPola.get(o.pole) ?? o.pole, o.opis, o.wartosc);
    // Puste komórki w kolumnach pól wymaganych (brak całej kolumny pokazuje werdykt).
    for (const p of POLA_WYMAGANE)
      if (p !== 'kod_zbioru_danych' && kolumnaPola.has(p) && (rekord[p] === null || rekord[p] === undefined))
        zglos(kolumnaPola.get(p)!, 'Puste pole wymagane.', `wiersz ${i + 2}`);
    if (bledy.length) {
      // Numer wiersza tak, jak widać go w arkuszu: wiersz 1 to nagłówek.
      odrzucone.push({
        wiersz: i + 2,
        nazwa: rekord.nazwa_miejsca ?? rekord.opis_lokalizacji ?? '(brak)',
        powod: bledy.join(' '),
      });
      return;
    }
    const idZrodlowe = typeof wej.id_aed === 'string' ? wej.id_aed : '';
    const klucz =
      idZrodlowe || norm([rekord.nazwa_miejsca, rekord.ulica, rekord.numer_budynku, rekord.miejscowosc].join(' '));
    rekordy.push({
      ...(Object.fromEntries(KOLUMNY.map((k) => [k, null])) as unknown as RekordAed),
      ...rekord,
      id_aed: uuidV5(`${identyfikatorZbioru}#${klucz}`),
      kod_zbioru_danych: KOD_ZBIORU,
      zrodlo_danych: identyfikatorZbioru,
      data_aktualizacji: dataAktualizacji,
    } as RekordAed);
  });

  // Kod zbioru to stała wartość – narzędzie wpisuje ją samo, gdy w pliku jej brakuje.
  if (!kolumnaPola.has('kod_zbioru_danych') && rekordy.length)
    zglos('kod_zbioru_danych', `Uzupełniono kod zbioru danych wartością ${KOD_ZBIORU}.`, KOD_ZBIORU);

  return {
    wierszy: wiersze.length,
    brakujaceWymagane: POLA_WYMAGANE.filter(
      (p) => p !== 'kod_zbioru_danych' && !POLA_SYSTEMOWE.includes(p) && !kolumnaPola.has(p),
    ),
    adresWJednymPolu: mapowanie.includes('ADRES'),
    staleKolumny,
    problemy: [...problemy.values()],
    odrzucone,
    rekordy,
  };
}
