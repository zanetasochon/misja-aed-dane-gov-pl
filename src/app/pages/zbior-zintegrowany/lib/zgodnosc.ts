/**
 * HackNation 2026 – Misja AED. Plik dodany do forka portalu dane.gov.pl (GPL-3.0), 2026-11-21, zmieniony 2026-11-22.
 *
 * Narzędzie dla dostawcy „Sprawdź zgodność ze wzorcem”: dostawca wypełnia szablon AED Sync v15, więc kolumn
 * nie dopasowujemy. Sprawdzamy nagłówki według szablonu (PL albo EN), wartości według zasad szablonu
 * i dajemy plik z drobnymi poprawkami (np. godziny „8-16” → „08:00-16:00”).
 * Kolumnę spoza szablonu pomijamy; gdy rozpoznamy literówkę albo starą nazwę, podpowiadamy właściwą.
 */

import { KOD_ZBIORU, KOLUMNY, NAGLOWKI_EN, POLA_WYMAGANE } from './model';
import type { PoleRekordu, RekordAed } from './model';
import { walidujRekord } from './walidacja-rekordu';
import type { RekordWejsciowy } from './walidacja-rekordu';

export const normalizujNaglowek = (h: string) =>
  h
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

/** Nagłówek szablonu (PL albo EN) → pole. Tylko dokładne nazwy z szablonu. */
const POLE_Z_NAGLOWKA = new Map<string, PoleRekordu>([
  ...KOLUMNY.map((k) => [k, k] as [string, PoleRekordu]),
  ...KOLUMNY.map((k) => [NAGLOWKI_EN[k], k] as [string, PoleRekordu]),
]);

/** Popularne i stare nazwy kolumn – tylko do podpowiedzi „w szablonie: …”, niczego nie przypisujemy. */
const PODPOWIEDZI: Record<string, PoleRekordu> = {
  nazwa: 'nazwa_obiektu',
  name: 'nazwa_obiektu',
  obiekt: 'nazwa_obiektu',
  nazwa_miejsca: 'nazwa_obiektu',
  lokalizacja: 'komentarz_aed',
  opis: 'komentarz_aed',
  opis_lokalizacji: 'komentarz_aed',
  komentarz: 'komentarz_aed',
  nr: 'numer_budynku',
  numer: 'numer_budynku',
  nr_budynku: 'numer_budynku',
  home_number: 'numer_budynku',
  house_number: 'numer_budynku',
  nazwa_ulicy: 'ulica',
  kod: 'kod_pocztowy',
  postcode: 'kod_pocztowy',
  miasto: 'miejscowosc',
  city: 'miejscowosc',
  terc: 'kod_terc',
  teryt_terc: 'kod_terc',
  simc: 'kod_simc',
  teryt_simc: 'kod_simc',
  lat: 'szerokosc_geograficzna_aed',
  latitude: 'szerokosc_geograficzna_aed',
  szerokosc: 'szerokosc_geograficzna_aed',
  szerokosc_geograficzna: 'szerokosc_geograficzna_aed',
  lon: 'dlugosc_geograficzna_aed',
  lng: 'dlugosc_geograficzna_aed',
  longitude: 'dlugosc_geograficzna_aed',
  dlugosc: 'dlugosc_geograficzna_aed',
  dlugosc_geograficzna: 'dlugosc_geograficzna_aed',
  stan: 'stan_aed',
  status: 'stan_aed',
  status_urzadzenia: 'stan_aed',
  data_ostatniego_przegladu: 'data_weryfikacji_stanu_aed',
  dysponent: 'odpowiedzialny_za_aed',
  dysponent_nazwa: 'odpowiedzialny_za_aed',
  telefon: 'telefon_odpowiedzialnego_za_aed',
  phone: 'telefon_odpowiedzialnego_za_aed',
  telefon_kontaktowy: 'telefon_odpowiedzialnego_za_aed',
  email: 'email_odpowiedzialnego_za_aed',
  e_mail: 'email_odpowiedzialnego_za_aed',
};

/** Pole szablonu dla nagłówka pliku: dokładna nazwa PL albo EN (wielkość liter i spacje na brzegach bez znaczenia). */
export const poleZNaglowka = (h: string): PoleRekordu | null => POLE_Z_NAGLOWKA.get(h.trim().toLowerCase()) ?? null;

/** Podpowiedź poprawnej nazwy dla kolumny spoza szablonu (literówka, polskie znaki, stara nazwa). */
function podpowiedz(h: string): PoleRekordu | null {
  const n = normalizujNaglowek(h);
  return POLE_Z_NAGLOWKA.get(n) ?? PODPOWIEDZI[n] ?? null;
}

export interface KolumnaSpozaSzablonu {
  kolumna: string;
  /** Pole szablonu, o które prawdopodobnie chodziło (do podpowiedzi), albo null. */
  podpowiedz: PoleRekordu | null;
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
  /** Kolumny pliku zgodne z szablonem. */
  kolumnyZgodne: string[];
  /** Kolumny pliku spoza szablonu – pomijane. */
  kolumnySpoza: KolumnaSpozaSzablonu[];
  /** Kolumny szablonu, których nie ma w pliku. */
  brakujaceKolumny: PoleRekordu[];
  /** Pola obowiązkowe szablonu (15), których plik nie ma. Kod zbioru narzędzie uzupełnia samo. */
  brakujaceWymagane: PoleRekordu[];
  staleKolumny: string[];
  problemy: ProblemZgodnosci[];
  odrzucone: OdrzuconyWierszPliku[];
  rekordy: RekordAed[];
}

function czyStala(wiersze: readonly Record<string, string>[], kolumna: string): boolean {
  const wart = new Set(wiersze.map((w) => w[kolumna]).filter(Boolean));
  return wiersze.length > 2 && wart.size === 1;
}

/** Liczba kolumn pliku zgodnych z szablonem – do wyboru arkusza z danymi w pliku XLSX. */
export const liczbaKolumnSzablonu = (naglowki: readonly string[]) =>
  naglowki.filter((h) => poleZNaglowka(h) !== null).length;

/** Sprawdza plik dostawcy według szablonu tą samą walidacją co zbiór zintegrowany (walidujRekord). */
export function sprawdzZgodnosc(
  naglowki: readonly string[],
  wiersze: readonly Record<string, string>[],
): RaportZgodnosci {
  const problemy = new Map<string, ProblemZgodnosci>();
  const zglos = (kolumna: string, opis: string, przyklad: string) => {
    const k = `${kolumna}|${opis}`;
    const p = problemy.get(k) ?? { kolumna, opis, liczba: 0, przyklad };
    p.liczba++;
    problemy.set(k, p);
  };

  // Kolumny: zgodne z szablonem (pierwsze wystąpienie pola) i spoza szablonu.
  const kolumnaPola = new Map<PoleRekordu, string>();
  const kolumnyZgodne: string[] = [];
  const kolumnySpoza: KolumnaSpozaSzablonu[] = [];
  for (const h of naglowki) {
    const pole = poleZNaglowka(h);
    if (pole && !kolumnaPola.has(pole)) {
      kolumnaPola.set(pole, h);
      kolumnyZgodne.push(h);
    } else kolumnySpoza.push({ kolumna: h, podpowiedz: pole ? null : podpowiedz(h) });
  }

  // Ostrzegamy o kolumnach, które mają opisywać konkretny AED, a mają wszędzie tę samą wartość.
  const staleKolumny = ['nazwa_obiektu', 'komentarz_aed']
    .map((p) => kolumnaPola.get(p as PoleRekordu))
    .filter((h): h is string => !!h && czyStala(wiersze, h));

  const odrzucone: OdrzuconyWierszPliku[] = [];
  const rekordy: RekordAed[] = [];

  wiersze.forEach((w, i) => {
    const wej: RekordWejsciowy = {};
    for (const [pole, h] of kolumnaPola) wej[pole] = (w[h] ?? '').trim();
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
    kolumnyZgodne,
    kolumnySpoza,
    brakujaceKolumny: KOLUMNY.filter((p) => !kolumnaPola.has(p)),
    brakujaceWymagane: POLA_WYMAGANE.filter((p) => p !== 'kod_zbioru_danych' && !kolumnaPola.has(p)),
    staleKolumny,
    problemy: [...problemy.values()],
    odrzucone,
    rekordy,
  };
}
