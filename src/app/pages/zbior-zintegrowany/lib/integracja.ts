/**
 * HackNation 2026 – Misja AED. Plik dodany do forka portalu dane.gov.pl (GPL-3.0), 2026-11-22.
 *
 * Zbiór zintegrowany z danych dostawców:
 * - pliki według szablonu AED Sync v15 czytamy po nagłówkach szablonu (PL albo EN);
 * - istniejące zbiory w innych układach (zrodla.ts: ZRODLA_PRAWDZIWE) – przez ich mapowanie kolumn;
 * - każdy rekord sprawdzamy tą samą walidacją co narzędzie zgodności (walidacja-rekordu.ts);
 * - nie zmyślamy danych: puste pole zostaje puste. Dla zbiorów spoza szablonu uzupełniamy tylko to, co wynika
 *   z samego zbioru albo jest prawdą z definicji: dostawcę (wydawca zbioru), województwo, powiat i gminę dla rekordów
 *   z miejscowości, której dotyczy zbiór, datę dostarczenia (data danych zasobu), kod zbioru AED-SYNC-PL
 *   (rekord jest w zbiorze zintegrowanym) i stan AED „Nieznany” (wartość szablonu na brak informacji).
 *   Godzin, daty weryfikacji, podmiotu odpowiedzialnego ani kontaktu nie uzupełniamy – tych danych w źródłach nie ma;
 * - kontrola danych dostawców: kompletność pól obowiązkowych, pominięte wiersze, ostrzeżenia,
 *   możliwe duplikaty (oznaczamy, nie usuwamy).
 */

import { wierszeJakoObiekty } from './csv';
import { odlegloscM } from './geometria';
import { KOD_ZBIORU, KOLUMNY, NAGLOWKI_EN, POLA_WYMAGANE } from './model';
import type { PoleRekordu, RekordAed } from './model';
import { uuidV5 } from './uuid';
import { walidujRekord } from './walidacja-rekordu';
import type { RekordWejsciowy } from './walidacja-rekordu';
import { ZRODLA } from './zrodla';
import type { ZrodloDef } from './zrodla';

export interface RekordZintegrowany extends RekordAed {
  /** Stały identyfikator rekordu w widoku (UUID v5 ze zbioru dostawcy i rekordu). */
  id: string;
  /** Nazwa do wyświetlenia: nazwa obiektu, a gdy jej brak – komentarz o AED. */
  etykieta: string;
  /** Godziny jako opening_hours – tylko do filtra „Dostępny teraz”. */
  godziny: string | null;
  zrodloId: string;
  dostawcaZrodla: string;
  adresZbioruZrodla: string | null;
  dataDanychZrodla: string;
  /** Numer wiersza w pliku dostawcy, tak jak w arkuszu (wiersz 1 to nagłówek). */
  wierszZrodla: number;
  fikcyjne: boolean;
  atrybucjaZrodla: string | null;
}

export interface PominietyWiersz {
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
  pominiete: PominietyWiersz[];
  ostrzezenia: OstrzezenieWiersza[];
  kompletnosc: KompletnoscPola[];
  /** Pola obowiązkowe (15), które są wypełnione we wszystkich rekordach dostawcy. */
  polaWymaganeKompletne: number;
  /** Kolumny pliku, których nie ma w szablonie (pomijane) – dla plików według szablonu. */
  kolumnySpozaSzablonu: string[];
  /** Plik według szablonu AED Sync (bez mapowania kolumn). */
  wedlugSzablonu: boolean;
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

const norm = (s: string | null) =>
  (s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Nagłówek PL albo EN szablonu → pole. */
const POLE_Z_NAGLOWKA = new Map<string, PoleRekordu>([
  ...KOLUMNY.map((k) => [k, k] as [string, PoleRekordu]),
  ...KOLUMNY.map((k) => [NAGLOWKI_EN[k], k] as [string, PoleRekordu]),
]);

const pustyRekord = () => Object.fromEntries(KOLUMNY.map((k) => [k, null])) as unknown as RekordAed;

export function wczytajZrodlo(z: ZrodloDef): { rekordy: RekordZintegrowany[]; raport: RaportZrodla } {
  const tresc = z.przygotuj ? z.przygotuj(z.tresc) : z.tresc;
  const { naglowki, wiersze } = wierszeJakoObiekty(tresc, z.separator);
  const wedlugSzablonu = !z.mapujWiersz;
  const kolumnySpozaSzablonu = wedlugSzablonu
    ? naglowki.filter((h) => !POLE_Z_NAGLOWKA.has(h.trim().toLowerCase()))
    : [];
  const rekordy: RekordZintegrowany[] = [];
  const pominiete: PominietyWiersz[] = [];
  const ostrzezenia: OstrzezenieWiersza[] = [];

  wiersze.forEach((w, i) => {
    const nr = i + 2;
    let wej: RekordWejsciowy = {};
    if (z.mapujWiersz) wej = z.mapujWiersz(w);
    else
      for (const h of naglowki) {
        const pole = POLE_Z_NAGLOWKA.get(h.trim().toLowerCase());
        if (pole) wej[pole] = w[h];
      }
    const { rekord, godziny, bledy, ostrzezenia: uwagi } = walidujRekord(wej);
    const nazwa = rekord.nazwa_obiektu ?? rekord.komentarz_aed ?? '(brak)';
    if (bledy.length) {
      pominiete.push({ wiersz: nr, nazwa, powod: bledy.join(' ') });
      return;
    }
    for (const u of uwagi)
      ostrzezenia.push({ wiersz: nr, nazwa, tresc: u.wartosc ? `${u.opis} (wartość: „${u.wartosc}”)` : u.opis });
    const klucz = norm([rekord.nazwa_obiektu, rekord.ulica, rekord.numer_budynku, rekord.miejscowosc].join(' '));
    const wObszarze = !!z.obszar && norm(rekord.miejscowosc) === norm(z.obszar.miejscowosc);
    rekordy.push({
      ...pustyRekord(),
      ...rekord,
      ...(wedlugSzablonu
        ? {}
        : {
            dostawca: rekord.dostawca ?? z.dostawca,
            wojewodztwo: rekord.wojewodztwo ?? (wObszarze ? z.obszar!.wojewodztwo : null),
            powiat: rekord.powiat ?? (wObszarze ? z.obszar!.powiat : null),
            gmina: rekord.gmina ?? (wObszarze ? z.obszar!.gmina : null),
            data_dostarczenia_danych: rekord.data_dostarczenia_danych ?? z.dataDanych,
            kod_zbioru_danych: rekord.kod_zbioru_danych ?? KOD_ZBIORU,
            stan_aed: rekord.stan_aed ?? 'Nieznany',
          }),
      id: uuidV5(`${z.identyfikator}#${klucz}#${nr}`),
      etykieta: nazwa,
      godziny,
      zrodloId: z.id,
      dostawcaZrodla: z.dostawca,
      adresZbioruZrodla: z.adresZbioru,
      dataDanychZrodla: z.dataDanych,
      wierszZrodla: nr,
      fikcyjne: !z.prawdziwe,
      atrybucjaZrodla: z.atrybucja ?? null,
    });
  });

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
      pominiete,
      ostrzezenia,
      kompletnosc,
      polaWymaganeKompletne: kompletnosc.filter((k) => rekordy.length > 0 && k.wypelnione === rekordy.length).length,
      kolumnySpozaSzablonu,
      wedlugSzablonu,
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
        a.szerokosc_geograficzna_aed !== null &&
        a.dlugosc_geograficzna_aed !== null &&
        b.szerokosc_geograficzna_aed !== null &&
        b.dlugosc_geograficzna_aed !== null
          ? odlegloscM(
              { szer: a.szerokosc_geograficzna_aed, dlug: a.dlugosc_geograficzna_aed },
              { szer: b.szerokosc_geograficzna_aed, dlug: b.dlugosc_geograficzna_aed },
            )
          : Infinity;
      const adresA = norm([a.ulica, a.numer_budynku, a.miejscowosc].join(' '));
      const tenSamAdresINazwa =
        adresA !== '' &&
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
  const wyniki = zrodla.map(wczytajZrodlo);
  const rekordy = wyniki.flatMap((w) => w.rekordy);
  return { rekordy, raporty: wyniki.map((w) => w.raport), duplikaty: wykryjDuplikaty(rekordy) };
}
