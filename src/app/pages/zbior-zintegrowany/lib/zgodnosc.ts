/**
 * HackNation 2026 – Misja AED. Plik dodany do forka portalu dane.gov.pl (GPL-3.0), 2026-11-21.
 *
 * Narzędzie dla dostawcy „Sprawdź zgodność ze wzorcem”:
 * propozycja mapowania kolumn (po nagłówkach PL albo EN), raport zgodności i plik w układzie szablonu AED Sync v15.
 */

import { KOD_ZBIORU, KOLUMNY, NAGLOWKI_EN, POLA_WYMAGANE } from './model';
import type { PoleRekordu, RekordAed } from './model';
import { walidujRekord } from './walidacja-rekordu';
import type { RekordWejsciowy } from './walidacja-rekordu';
import { punktZGeoJson } from './geometria';
import { rozbijAdres } from './adres';

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
  // Popularne nazwy kolumn w plikach AED.
  nazwa: 'nazwa_obiektu',
  name: 'nazwa_obiektu',
  obiekt: 'nazwa_obiektu',
  lokalizacja: 'komentarz_aed',
  gdzie: 'komentarz_aed',
  opis: 'komentarz_aed',
  komentarz: 'komentarz_aed',
  adres: 'ADRES',
  address: 'ADRES',
  cecha_ulicy: 'CECHA_ULICY',
  geometry: 'GEOMETRIA',
  geometria: 'GEOMETRIA',
  geom: 'GEOMETRIA',
  nazwa_ulicy: 'ulica',
  nr: 'numer_budynku',
  numer: 'numer_budynku',
  nr_budynku: 'numer_budynku',
  numer_domu: 'numer_budynku',
  home_number: 'numer_budynku',
  house_number: 'numer_budynku',
  kod: 'kod_pocztowy',
  postcode: 'kod_pocztowy',
  miasto: 'miejscowosc',
  city: 'miejscowosc',
  place: 'miejscowosc',
  terc: 'kod_terc',
  simc: 'kod_simc',
  lat: 'szerokosc_geograficzna_aed',
  latitude: 'szerokosc_geograficzna_aed',
  szerokosc: 'szerokosc_geograficzna_aed',
  szerokosc_geograficzna: 'szerokosc_geograficzna_aed',
  lon: 'dlugosc_geograficzna_aed',
  lng: 'dlugosc_geograficzna_aed',
  longitude: 'dlugosc_geograficzna_aed',
  dlugosc: 'dlugosc_geograficzna_aed',
  dlugosc_geograficzna: 'dlugosc_geograficzna_aed',
  telefon: 'telefon_odpowiedzialnego_za_aed',
  phone: 'telefon_odpowiedzialnego_za_aed',
  email: 'email_odpowiedzialnego_za_aed',
  e_mail: 'email_odpowiedzialnego_za_aed',
  stan: 'stan_aed',
  status: 'stan_aed',
  // Nazwy z naszych wcześniejszych wzorców (v1.2, v1.3).
  nazwa_miejsca: 'nazwa_obiektu',
  opis_lokalizacji: 'komentarz_aed',
  teryt_terc: 'kod_terc',
  teryt_simc: 'kod_simc',
  status_urzadzenia: 'stan_aed',
  data_ostatniego_przegladu: 'data_weryfikacji_stanu_aed',
  dysponent_nazwa: 'odpowiedzialny_za_aed',
  dysponent: 'odpowiedzialny_za_aed',
  telefon_kontaktowy: 'telefon_odpowiedzialnego_za_aed',
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
  // wtedy nazwą obiektu jest kolumna z opisem miejsca.
  const iNazwa = wynik.indexOf('nazwa_obiektu');
  const iOpis = wynik.indexOf('komentarz_aed');
  if (iNazwa >= 0 && iOpis >= 0 && czyStala(wiersze, naglowki[iNazwa])) {
    wynik[iNazwa] = '';
    wynik[iOpis] = 'nazwa_obiektu';
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
  /** Pola obowiązkowe szablonu (15), których plik nie dostarcza. Kod zbioru narzędzie uzupełnia samo. */
  brakujaceWymagane: PoleRekordu[];
  adresWJednymPolu: boolean;
  staleKolumny: string[];
  problemy: ProblemZgodnosci[];
  odrzucone: OdrzuconyWierszPliku[];
  rekordy: RekordAed[];
}

const CECHA: Record<string, string> = { ulica: 'ul.', aleja: 'al.', plac: 'pl.', osiedle: 'os.' };

/** Sprawdza plik dostawcy tą samą funkcją walidacji co zbiór zintegrowany (walidujRekord). */
export function sprawdzZgodnosc(
  naglowki: readonly string[],
  wiersze: readonly Record<string, string>[],
  mapowanie: readonly Cel[],
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
      (['szerokosc_geograficzna_aed', 'dlugosc_geograficzna_aed'] as const).forEach((p) => kolumnaPola.set(p, h));
    else if (c === 'ADRES')
      (['ulica', 'numer_budynku', 'kod_pocztowy', 'miejscowosc'] as const).forEach((p) => kolumnaPola.set(p, h));
    else if (c && c !== 'CECHA_ULICY') kolumnaPola.set(c as PoleRekordu, h);
  });

  // Ostrzegamy tylko o kolumnach, które mają opisywać konkretny AED (stała miejscowość w pliku gminy to norma).
  const staleKolumny = naglowki.filter(
    (h, i) =>
      (mapowanie[i] === 'nazwa_obiektu' || mapowanie[i] === 'komentarz_aed' || mapowanie[i] === '') &&
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
          wej.dlugosc_geograficzna_aed = punkt[0];
          wej.szerokosc_geograficzna_aed = punkt[1];
        } else zglos(h, 'Geometria nie jest punktem GeoJSON.', v.slice(0, 60));
      } else if (cel === 'CECHA_ULICY') cecha = CECHA[v.toLowerCase()] ?? v;
      else wej[cel as PoleRekordu] = v;
    });
    if (cecha && wej.ulica) wej.ulica = `${cecha} ${wej.ulica}`;
    const { rekord, bledy, ostrzezenia } = walidujRekord(wej);
    for (const o of ostrzezenia) zglos(kolumnaPola.get(o.pole) ?? o.pole, o.opis, o.wartosc);
    if (bledy.length) {
      // Numer wiersza tak, jak widać go w arkuszu: wiersz 1 to nagłówek.
      odrzucone.push({
        wiersz: i + 2,
        nazwa: rekord.nazwa_obiektu ?? rekord.komentarz_aed ?? '(brak)',
        powod: bledy.join(' '),
      });
      return;
    }
    // Puste komórki w kolumnach pól obowiązkowych (brak całej kolumny pokazuje werdykt). Wartość w złym formacie
    // ma już swój komunikat – nie zgłaszamy jej drugi raz jako pustej.
    const zOstrzezeniem = new Set(ostrzezenia.map((o) => o.pole));
    for (const p of POLA_WYMAGANE)
      if (
        p !== 'kod_zbioru_danych' &&
        kolumnaPola.has(p) &&
        !zOstrzezeniem.has(p) &&
        (rekord[p] === null || rekord[p] === undefined)
      )
        zglos(kolumnaPola.get(p)!, 'Puste pole obowiązkowe.', `wiersz ${i + 2}`);
    rekordy.push({
      ...(Object.fromEntries(KOLUMNY.map((k) => [k, null])) as unknown as RekordAed),
      ...rekord,
      kod_zbioru_danych: KOD_ZBIORU,
    } as RekordAed);
  });

  // Kod zbioru to stała wartość – narzędzie wpisuje ją samo, gdy w pliku jej brakuje.
  if (!kolumnaPola.has('kod_zbioru_danych') && rekordy.length)
    zglos('kod_zbioru_danych', `Uzupełniono kod zbioru danych wartością ${KOD_ZBIORU}.`, KOD_ZBIORU);

  return {
    wierszy: wiersze.length,
    brakujaceWymagane: POLA_WYMAGANE.filter((p) => p !== 'kod_zbioru_danych' && !kolumnaPola.has(p)),
    adresWJednymPolu: mapowanie.includes('ADRES'),
    staleKolumny,
    problemy: [...problemy.values()],
    odrzucone,
    rekordy,
  };
}
