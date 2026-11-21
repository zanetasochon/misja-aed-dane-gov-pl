/**
 * HackNation 2026 – Misja AED. Plik dodany do forka portalu dane.gov.pl (GPL-3.0), 2026-11-21.
 *
 * Harmonizacja zbiorów źródłowych do wzorca v1.1:
 * - mapowanie kolumn (zrodla.ts) i normalizacja formatów (ST s. 15–16);
 * - odrzucenie tylko wtedy, gdy rekordu nie da się użyć (brak nazwy, brak/niepoprawne współrzędne);
 *   brakujące pola wzorca zostają puste (null) – integracja nie zmyśla danych;
 * - każdy rekord zachowuje zrodlo_danych (zbiór źródłowy) i data_aktualizacji ze źródła;
 * - wykrywanie duplikatów: ≤ 20 m albo ta sama nazwa i adres. Duplikaty oznaczamy, nie usuwamy –
 *   w jednym budynku mogą być dwa AED; decyzja należy do dostawcy danych.
 */

import { wierszeJakoObiekty } from './csv';
import { POLA_WYMAGANE } from './model';
import type { PoleRekordu, RekordAed } from './model';
import { ZRODLA } from './zrodla';
import type { ZrodloDef } from './zrodla';

export interface RekordZintegrowany extends RekordAed {
  /** Id źródła (krosno, legionowo, …) – do filtrów i raportu. */
  zrodloId: string;
  dostawcaZrodla: string;
  /** Numer wiersza w pliku źródłowym (1 = pierwszy wiersz danych). */
  wierszZrodla: number;
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
  /** Liczba pól wymaganych, które źródło dostarcza choć w jednym rekordzie (np. 5 z 9). */
  polaWymaganeObecne: number;
}

export interface Duplikat {
  a: RekordZintegrowany;
  b: RekordZintegrowany;
  odlegloscM: number;
  powod: string;
}

export interface WynikIntegracji {
  rekordy: RekordZintegrowany[];
  raporty: RaportZrodla[];
  duplikaty: Duplikat[];
}

const ZAKRES_SZER = [49, 55];
const ZAKRES_DLUG = [14, 25];

const wZakresie = (v: number, [a, b]: number[]) => v >= a && v <= b;

function liczba(v: string | undefined): number | null {
  if (!v) return null;
  const s = v.trim().replace(',', '.');
  return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : null;
}

/** Odległość w metrach (wzór haversine, promień Ziemi 6 371 km). */
export function odlegloscM(a: { szer: number; dlug: number }, b: { szer: number; dlug: number }): number {
  const R = 6371000;
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b.szer - a.szer);
  const dLon = rad(b.dlug - a.dlug);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.szer)) * Math.cos(rad(b.szer)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const norm = (s: string | null) =>
  (s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

function pustyRekord(): Omit<
  RekordAed,
  'id_aed' | 'nazwa_miejsca' | 'szerokosc_geograficzna' | 'dlugosc_geograficzna' | 'zrodlo_danych' | 'data_aktualizacji'
> {
  return {
    opis_lokalizacji: null,
    opis_lokalizacji_en: null,
    ulica: null,
    numer_budynku: null,
    numer_lokalu: null,
    kod_pocztowy: null,
    miejscowosc: null,
    teryt_terc: null,
    teryt_simc: null,
    teryt_ulic: null,
    wewnatrz_budynku: null,
    pietro: null,
    dostep: null,
    godziny_dostepnosci: null,
    typ_dysponenta: null,
    dysponent_nazwa: null,
    dysponent_regon: null,
    telefon_kontaktowy: null,
    producent: null,
    model: null,
    status_urzadzenia: null,
    data_ostatniego_przegladu: null,
    opis_dodatkowy: null,
    osm_id: null,
  };
}

export function harmonizujZrodlo(z: ZrodloDef): { rekordy: RekordZintegrowany[]; raport: RaportZrodla } {
  const { wiersze } = wierszeJakoObiekty(z.tresc, z.separator);
  const rekordy: RekordZintegrowany[] = [];
  const odrzucone: OdrzuconyWiersz[] = [];
  const ostrzezenia: OstrzezenieWiersza[] = [];

  wiersze.forEach((w, i) => {
    const nr = i + 1;
    const m = z.mapujWiersz(w);
    const nazwa = (m.dane.nazwa_miejsca ?? '').trim();
    let szer = liczba(m.szerokosc);
    let dlug = liczba(m.dlugosc);
    const ostrzez = (tresc: string) => ostrzezenia.push({ wiersz: nr, nazwa, tresc });

    if (!nazwa) {
      odrzucone.push({
        wiersz: nr,
        nazwa: '(brak)',
        powod: 'Brak nazwy miejsca – rekordu nie da się opisać na liście ani mapie.',
      });
      return;
    }
    if (szer === null || dlug === null) {
      odrzucone.push({
        wiersz: nr,
        nazwa,
        powod: 'Brak współrzędnych albo nie są liczbami – AED nie da się pokazać na mapie.',
      });
      return;
    }
    if (!wZakresie(szer, ZAKRES_SZER) && wZakresie(szer, ZAKRES_DLUG) && wZakresie(dlug, ZAKRES_SZER)) {
      [szer, dlug] = [dlug, szer];
      ostrzez('Szerokość i długość geograficzna były zamienione – poprawiono.');
    }
    if (!wZakresie(szer, ZAKRES_SZER) || !wZakresie(dlug, ZAKRES_DLUG)) {
      odrzucone.push({ wiersz: nr, nazwa, powod: `Współrzędne poza Polską (${szer}, ${dlug}).` });
      return;
    }

    const d = { ...m.dane };
    if (d.kod_pocztowy && /^\d{5}$/.test(d.kod_pocztowy))
      d.kod_pocztowy = `${d.kod_pocztowy.slice(0, 2)}-${d.kod_pocztowy.slice(2)}`;
    if (d.kod_pocztowy && !/^\d{2}-\d{3}$/.test(d.kod_pocztowy)) {
      ostrzez(`Kod pocztowy „${d.kod_pocztowy}” nie ma formatu 00-000 – pominięto.`);
      d.kod_pocztowy = null;
    }
    if (d.teryt_terc && !/^\d{6,7}$/.test(d.teryt_terc)) {
      ostrzez(`Kod TERC „${d.teryt_terc}” nie ma 6 ani 7 cyfr – pominięto.`);
      d.teryt_terc = null;
    }
    if (d.ulica && !d.numer_budynku) ostrzez('Brak numeru budynku w adresie.');

    rekordy.push({
      ...pustyRekord(),
      ...d,
      id_aed: `${z.id}-${m.idZrodlowe || nr}`,
      nazwa_miejsca: nazwa,
      // 6 miejsc po przecinku – jak w przykładzie ze wzorca (≈ 0,1 m).
      szerokosc_geograficzna: Math.round(szer * 1e6) / 1e6,
      dlugosc_geograficzna: Math.round(dlug * 1e6) / 1e6,
      zrodlo_danych: z.identyfikator,
      data_aktualizacji: z.dataDanych,
      zrodloId: z.id,
      dostawcaZrodla: z.dostawca,
      wierszZrodla: nr,
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
      const odl = odlegloscM(
        { szer: a.szerokosc_geograficzna, dlug: a.dlugosc_geograficzna },
        { szer: b.szerokosc_geograficzna, dlug: b.dlugosc_geograficzna },
      );
      const adresA = norm([a.ulica, a.numer_budynku, a.miejscowosc].join(' '));
      const tenSamAdresINazwa =
        a.ulica !== null &&
        adresA === norm([b.ulica, b.numer_budynku, b.miejscowosc].join(' ')) &&
        norm(a.nazwa_miejsca) === norm(b.nazwa_miejsca);
      if (odl <= progM || tenSamAdresINazwa) {
        wynik.push({
          a,
          b,
          odlegloscM: Math.round(odl),
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
