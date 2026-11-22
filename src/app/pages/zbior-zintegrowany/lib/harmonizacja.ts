/**
 * HackNation 2026 – Misja AED. Plik dodany do forka portalu dane.gov.pl (GPL-3.0), 2026-11-21.
 *
 * Harmonizacja zbiorów źródłowych do wzorca v1.3:
 * - mapowanie kolumn (zrodla.ts) i normalizacja formatów (ST s. 15–16);
 * - odrzucenie tylko wtedy, gdy rekordu nie da się użyć (nie wiadomo, gdzie jest AED, albo brak nazwy i opisu);
 *   brakujące pola wzorca zostają puste (null) – integracja nie zmyśla danych;
 * - integracja uzupełnia tylko to, co wynika ze źródła: kod_zbioru_danych (AED-SYNC-PL), dostawcę
 *   (wydawca zbioru źródłowego) oraz województwo, powiat i gminę, gdy rekord leży w miejscowości,
 *   której dotyczy zbiór źródłowy;
 * - każdy rekord zachowuje zrodlo_danych (zbiór źródłowy) i data_aktualizacji ze źródła;
 * - wykrywanie duplikatów: ≤ 20 m albo ta sama nazwa i adres. Duplikaty oznaczamy, nie usuwamy –
 *   w jednym budynku mogą być dwa AED; decyzja należy do dostawcy danych.
 */

import { wierszeJakoObiekty } from './csv';
import { odlegloscM } from './geometria';
import { KOD_ZBIORU, KOLUMNY, POLA_WYMAGANE } from './model';
import { uuidV5 } from './uuid';
import { walidujRekord } from './walidacja-rekordu';
import { doDatyCzasuWzorca } from './wiek-danych';
import type { PoleRekordu, RekordAed } from './model';
import { ZRODLA } from './zrodla';
import type { ZrodloDef } from './zrodla';

export interface RekordZintegrowany extends RekordAed {
  /** Nazwa do wyświetlenia: nazwa miejsca, a gdy jej brak – opis lokalizacji (nazwa jest opcjonalna w v1.3). */
  etykieta: string;
  /** Id źródła (krosno, legionowo, …) – do filtrów i raportu. */
  zrodloId: string;
  dostawcaZrodla: string;
  /** Link do zbioru źródłowego na dane.gov.pl (null dla danych fikcyjnych). */
  adresZbioruZrodla: string | null;
  /** Data danych zasobu źródłowego (yyyy-mm-dd). */
  dataDanychZrodla: string;
  /** Numer wiersza w pliku źródłowym (1 = pierwszy wiersz danych). */
  wierszZrodla: number;
  /** Rekord z danych fikcyjnych (demonstracja) – oznaczany na liście i mapie, nigdy w eksporcie. */
  fikcyjne: boolean;
  /** Uznanie autorstwa wymagane licencją źródła (np. CC BY 4.0) albo null. */
  atrybucjaZrodla: string | null;
}

export interface OdrzuconyWiersz {
  wiersz: number;
  nazwa: string;
  powod: string;
}

export interface OstrzezenieWiersza {
  wiersz: number;
  nazwa: string;
  tresc: string;
}

export interface KompletnoscPola {
  pole: PoleRekordu;
  wypelnione: number;
}

export interface RaportZrodla {
  zrodlo: ZrodloDef;
  wierszy: number;
  przyjete: number;
  odrzucone: OdrzuconyWiersz[];
  ostrzezenia: OstrzezenieWiersza[];
  kompletnosc: KompletnoscPola[];
  /** Liczba pól wymaganych wzorca (9), które źródło dostarcza choć w jednym rekordzie (np. 6 z 9). */
  polaWymaganeObecne: number;
}

export interface Duplikat {
  a: RekordZintegrowany;
  b: RekordZintegrowany;
  /** null, gdy jeden z rekordów nie ma współrzędnych. */
  odlegloscM: number | null;
  powod: string;
}

export interface WynikIntegracji {
  rekordy: RekordZintegrowany[];
  raporty: RaportZrodla[];
  duplikaty: Duplikat[];
}

export { odlegloscM };

const norm = (s: string | null) =>
  (s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const pustyRekord = () => Object.fromEntries(KOLUMNY.map((k) => [k, null])) as unknown as RekordAed;

export function harmonizujZrodlo(z: ZrodloDef): { rekordy: RekordZintegrowany[]; raport: RaportZrodla } {
  const tresc = z.przygotuj ? z.przygotuj(z.tresc) : z.tresc;
  const { wiersze } = wierszeJakoObiekty(tresc, z.separator);
  const rekordy: RekordZintegrowany[] = [];
  const odrzucone: OdrzuconyWiersz[] = [];
  const ostrzezenia: OstrzezenieWiersza[] = [];

  wiersze.forEach((w, i) => {
    const nr = i + 1;
    const m = z.mapujWiersz(w);
    // Ta sama funkcja walidacji co w narzędziu zgodności (walidacja-rekordu.ts).
    const {
      rekord,
      bledy,
      ostrzezenia: uwagi,
    } = walidujRekord({
      ...m.dane,
      szerokosc_geograficzna: m.szerokosc,
      dlugosc_geograficzna: m.dlugosc,
    });
    const nazwa = rekord.nazwa_miejsca ?? rekord.opis_lokalizacji ?? '(brak)';
    if (bledy.length) {
      odrzucone.push({ wiersz: nr, nazwa, powod: bledy.join(' ') });
      return;
    }
    for (const u of uwagi)
      ostrzezenia.push({ wiersz: nr, nazwa, tresc: u.wartosc ? `${u.opis} (wartość: „${u.wartosc}”)` : u.opis });

    // Stały identyfikator: UUID v5 z adresu zbioru i ID rekordu w źródle (bez ID – z nazwy i adresu).
    const kluczRekordu =
      m.idZrodlowe || norm([rekord.nazwa_miejsca, rekord.ulica, rekord.numer_budynku, rekord.miejscowosc].join(' '));
    // Województwo, powiat i gmina – tylko gdy rekord leży w miejscowości, której dotyczy zbiór źródłowy.
    const wObszarze = z.obszar && norm(rekord.miejscowosc ?? '') === norm(z.obszar.miejscowosc);
    rekordy.push({
      ...pustyRekord(),
      ...rekord,
      id_aed: uuidV5(`${z.identyfikator}#${kluczRekordu}`),
      kod_zbioru_danych: KOD_ZBIORU,
      wojewodztwo: rekord.wojewodztwo ?? (wObszarze ? z.obszar!.wojewodztwo : null),
      powiat: rekord.powiat ?? (wObszarze ? z.obszar!.powiat : null),
      gmina: rekord.gmina ?? (wObszarze ? z.obszar!.gmina : null),
      dostawca: rekord.dostawca ?? z.dostawca,
      etykieta: nazwa,
      zrodlo_danych: z.identyfikator,
      // Data i godzina ostatniej zmiany zbioru źródłowego (xlsx: „data i czas ostatniej zmiany rekordu”).
      data_aktualizacji: doDatyCzasuWzorca(z.zmodyfikowano),
      zrodloId: z.id,
      dostawcaZrodla: z.dostawca,
      adresZbioruZrodla: z.adresZbioru,
      dataDanychZrodla: z.dataDanych,
      wierszZrodla: nr,
      fikcyjne: !z.prawdziwe,
      atrybucjaZrodla: z.atrybucja ?? null,
    });
  });

  // Punkt odległy o ponad 30 km od mediany punktów źródła – prawdopodobny błąd (np. współrzędne skopiowane
  // z innego zbioru). Tylko ostrzeżenie: rekord zostaje, decyzja należy do dostawcy.
  const zPunktem = rekordy.filter((x) => x.szerokosc_geograficzna !== null && x.dlugosc_geograficzna !== null);
  if (zPunktem.length >= 3) {
    const mediana = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
    const srodek = {
      szer: mediana(zPunktem.map((x) => x.szerokosc_geograficzna!)),
      dlug: mediana(zPunktem.map((x) => x.dlugosc_geograficzna!)),
    };
    for (const x of zPunktem) {
      const km = odlegloscM(srodek, { szer: x.szerokosc_geograficzna!, dlug: x.dlugosc_geograficzna! }) / 1000;
      if (km > 30)
        ostrzezenia.push({
          wiersz: x.wierszZrodla,
          nazwa: x.etykieta,
          tresc: `Punkt leży ok. ${Math.round(km)} km od pozostałych punktów tego źródła – sprawdź współrzędne (mogą pochodzić z innego zbioru).`,
        });
    }
  }

  const kompletnosc = POLA_WYMAGANE.map((pole) => ({
    pole,
    wypelnione: rekordy.filter((r) => r[pole] !== null && r[pole] !== '').length,
  }));

  return {
    rekordy,
    raport: {
      zrodlo: z,
      wierszy: wiersze.length,
      przyjete: rekordy.length,
      odrzucone,
      ostrzezenia,
      kompletnosc,
      polaWymaganeObecne: kompletnosc.filter((k) => k.wypelnione > 0).length,
    },
  };
}

export function wykryjDuplikaty(rekordy: readonly RekordZintegrowany[], progM = 20): Duplikat[] {
  const wynik: Duplikat[] = [];
  for (let i = 0; i < rekordy.length; i++) {
    for (let j = i + 1; j < rekordy.length; j++) {
      const a = rekordy[i];
      const b = rekordy[j];
      const odl =
        a.szerokosc_geograficzna !== null &&
        a.dlugosc_geograficzna !== null &&
        b.szerokosc_geograficzna !== null &&
        b.dlugosc_geograficzna !== null
          ? odlegloscM(
              { szer: a.szerokosc_geograficzna, dlug: a.dlugosc_geograficzna },
              { szer: b.szerokosc_geograficzna, dlug: b.dlugosc_geograficzna },
            )
          : Infinity;
      const adresA = norm([a.ulica, a.numer_budynku, a.miejscowosc].join(' '));
      const tenSamAdresINazwa =
        a.ulica !== null &&
        adresA === norm([b.ulica, b.numer_budynku, b.miejscowosc].join(' ')) &&
        norm(a.etykieta) === norm(b.etykieta);
      if (odl <= progM || tenSamAdresINazwa) {
        wynik.push({
          a,
          b,
          odlegloscM: Number.isFinite(odl) ? Math.round(odl) : null,
          powod: [
            odl <= progM ? `współrzędne w promieniu ${progM} m` : '',
            tenSamAdresINazwa ? 'ta sama nazwa i adres' : '',
          ]
            .filter(Boolean)
            .join(' oraz '),
        });
      }
    }
  }
  return wynik;
}

export function integruj(zrodla: readonly ZrodloDef[] = ZRODLA): WynikIntegracji {
  const wyniki = zrodla.map(harmonizujZrodlo);
  const rekordy = wyniki.flatMap((w) => w.rekordy);
  return { rekordy, raporty: wyniki.map((w) => w.raport), duplikaty: wykryjDuplikaty(rekordy) };
}
