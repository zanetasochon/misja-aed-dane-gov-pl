/**
 * HackNation 2026 – Misja AED. Plik dodany do forka portalu dane.gov.pl (GPL-3.0), 2026-11-21.
 *
 * Narzędzie dla dostawcy „Sprawdź zgodność ze wzorcem”:
 * propozycja mapowania kolumn (po nazwach nagłówków), raport zgodności i przekształcenie pliku do wzorca v1.1.
 */

import { czyDostepnyTeraz } from './godziny';
import { DOSTEP, KOLUMNY, POLA_WYMAGANE } from './model';
import type { Dostep, PoleRekordu, RekordAed } from './model';
import { rozbijAdres } from './zrodla';

/** Cel mapowania: pole wzorca, adres w jednym polu (do rozbicia), cecha ulicy albo pominięcie. */
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
    .replace(/[̀-ͯ]/g, '')
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

export interface RaportZgodnosci {
  wierszy: number;
  brakujaceWymagane: PoleRekordu[];
  adresWJednymPolu: boolean;
  staleKolumny: string[];
  problemy: ProblemZgodnosci[];
  rekordy: RekordAed[];
  bezWspolrzednych: number;
}

const DOSTEP_SYNONIMY: Record<string, Dostep> = {
  yes: 'publiczny',
  ogolnodostepny: 'publiczny',
  publiczny: 'publiczny',
  customers: 'klienci',
  klienci: 'klienci',
  private: 'ograniczony',
  ograniczony: 'ograniczony',
  tylko_personel: 'ograniczony',
};

const PRAWDA = new Set(['true', 'tak', '1', 'yes', 't']);
const FALSZ = new Set(['false', 'nie', '0', 'no', 'n']);
const CECHA: Record<string, string> = { ulica: 'ul.', aleja: 'al.', plac: 'pl.', osiedle: 'os.' };

/** Punkt z GeoJSON w komórce, np. {"type":"Point","coordinates":[22.77,49.78]} → [lon, lat]. */
function punktZGeoJson(v: string): [number, number] | null {
  try {
    const g = JSON.parse(v) as { type?: string; coordinates?: unknown };
    const c = g.coordinates;
    if (g.type === 'Point' && Array.isArray(c) && typeof c[0] === 'number' && typeof c[1] === 'number')
      return [c[0], c[1]];
  } catch {
    return null;
  }
  return null;
}

function liczba(v: string): number | null {
  const s = v.trim().replace(',', '.');
  return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : null;
}

export function sprawdzZgodnosc(
  naglowki: readonly string[],
  wiersze: readonly Record<string, string>[],
  mapowanie: readonly Cel[],
  identyfikatorZbioru: string,
  dzis: string,
): RaportZgodnosci {
  const problemy = new Map<string, ProblemZgodnosci>();
  const zglos = (kolumna: string, opis: string, przyklad: string) => {
    const k = `${kolumna}|${opis}`;
    const p = problemy.get(k) ?? { kolumna, opis, liczba: 0, przyklad };
    p.liczba++;
    problemy.set(k, p);
  };

  const zmapowane = new Set<PoleRekordu>();
  mapowanie.forEach((c) => {
    if (c === 'GEOMETRIA')
      ['szerokosc_geograficzna', 'dlugosc_geograficzna'].forEach((p) => zmapowane.add(p as PoleRekordu));
    else if (c === 'ADRES')
      ['ulica', 'numer_budynku', 'kod_pocztowy', 'miejscowosc'].forEach((p) => zmapowane.add(p as PoleRekordu));
    else if (c && c !== 'CECHA_ULICY') zmapowane.add(c);
  });

  // Ostrzegamy tylko o kolumnach, które mają opisywać konkretny AED (stała miejscowość w pliku gminy to norma).
  const staleKolumny = naglowki.filter(
    (h, i) =>
      (mapowanie[i] === 'nazwa_miejsca' || mapowanie[i] === 'opis_lokalizacji' || mapowanie[i] === '') &&
      czyStala(wiersze, h),
  );

  let bezWspolrzednych = 0;
  const rekordy: RekordAed[] = [];

  wiersze.forEach((w, i) => {
    const r: Record<string, unknown> = Object.fromEntries(KOLUMNY.map((k) => [k, null]));
    let cecha = '';
    naglowki.forEach((h, j) => {
      const cel = mapowanie[j];
      const v = (w[h] ?? '').trim();
      if (!cel || v === '') return;
      if (cel === 'ADRES') Object.assign(r, rozbijAdres(v));
      else if (cel === 'GEOMETRIA') {
        const punkt = punktZGeoJson(v);
        if (punkt) {
          r['dlugosc_geograficzna'] = String(punkt[0]);
          r['szerokosc_geograficzna'] = String(punkt[1]);
        } else zglos(h, 'Geometria nie jest punktem GeoJSON.', v.slice(0, 60));
      } else if (cel === 'CECHA_ULICY') cecha = CECHA[v.toLowerCase()] ?? v;
      else r[cel] = v;
    });
    if (cecha && r['ulica']) r['ulica'] = `${cecha} ${r['ulica']}`;
    const kol = (pole: PoleRekordu) => naglowki[mapowanie.indexOf(pole)] ?? (pole as string);

    // Współrzędne
    let szer = typeof r['szerokosc_geograficzna'] === 'string' ? liczba(r['szerokosc_geograficzna'] as string) : null;
    let dlug = typeof r['dlugosc_geograficzna'] === 'string' ? liczba(r['dlugosc_geograficzna'] as string) : null;
    if (szer !== null && dlug !== null && szer < 30 && dlug > 45) {
      [szer, dlug] = [dlug, szer];
      zglos(kol('szerokosc_geograficzna'), 'Szerokość i długość są zamienione – poprawiono.', `${dlug}, ${szer}`);
    }
    if (szer === null || dlug === null) {
      bezWspolrzednych++;
      if (zmapowane.has('szerokosc_geograficzna'))
        zglos(
          kol('szerokosc_geograficzna'),
          'Brak współrzędnych albo nie są liczbami z kropką.',
          String(r['szerokosc_geograficzna'] ?? ''),
        );
    }
    r['szerokosc_geograficzna'] = szer;
    r['dlugosc_geograficzna'] = dlug;

    // Kod pocztowy
    const kod = r['kod_pocztowy'] as string | null;
    if (kod) {
      const k5 = /^\d{5}$/.test(kod) ? `${kod.slice(0, 2)}-${kod.slice(2)}` : kod;
      if (!/^\d{2}-\d{3}$/.test(k5)) {
        zglos(kol('kod_pocztowy'), 'Kod pocztowy nie ma formatu 00-000.', kod);
        r['kod_pocztowy'] = null;
      } else r['kod_pocztowy'] = k5;
    }
    // TERC 6 lub 7 cyfr
    const terc = r['teryt_terc'] as string | null;
    if (terc && !/^\d{6,7}$/.test(terc)) {
      zglos(kol('teryt_terc'), 'Kod TERC powinien mieć 6 lub 7 cyfr.', terc);
      r['teryt_terc'] = null;
    }
    // Wartość logiczna
    const wb = r['wewnatrz_budynku'] as string | null;
    if (wb !== null) {
      const n = wb.toLowerCase();
      if (PRAWDA.has(n)) r['wewnatrz_budynku'] = true;
      else if (FALSZ.has(n)) r['wewnatrz_budynku'] = false;
      else {
        zglos(kol('wewnatrz_budynku'), 'Wartość logiczna powinna być true albo false.', wb);
        r['wewnatrz_budynku'] = null;
      }
    }
    // Słownik dostępu
    const d = r['dostep'] as string | null;
    if (d !== null) {
      const n = normalizujNaglowek(d);
      const v = DOSTEP_SYNONIMY[n];
      if (v) r['dostep'] = v;
      else {
        zglos(kol('dostep'), `Wartość spoza słownika (${DOSTEP.join(', ')}).`, d);
        r['dostep'] = null;
      }
    }
    // Godziny – składnia opening_hours
    const g = r['godziny_dostepnosci'] as string | null;
    if (g !== null && czyDostepnyTeraz(g) === null) {
      zglos(kol('godziny_dostepnosci'), 'Godziny nie są w składni opening_hours (np. Mo-Fr 08:00-16:00 albo 24/7).', g);
      r['godziny_dostepnosci'] = null;
    }
    // Piętro
    const p = r['pietro'] as string | null;
    if (p !== null) {
      if (/^-?\d+$/.test(p)) r['pietro'] = Number(p);
      else {
        zglos(kol('pietro'), 'Piętro powinno być liczbą całkowitą (0 = parter).', p);
        r['pietro'] = null;
      }
    }
    if (r['ulica'] && !r['numer_budynku']) zglos(kol('numer_budynku'), 'Brak numeru budynku.', String(r['ulica']));

    r['id_aed'] = r['id_aed'] ? `${identyfikatorZbioru}-${r['id_aed']}` : `${identyfikatorZbioru}-${i + 1}`;
    r['zrodlo_danych'] = identyfikatorZbioru;
    r['data_aktualizacji'] = dzis;
    if (szer !== null && dlug !== null && r['nazwa_miejsca']) rekordy.push(r as unknown as RekordAed);
  });

  return {
    wierszy: wiersze.length,
    brakujaceWymagane: POLA_WYMAGANE.filter((p) => !zmapowane.has(p)),
    adresWJednymPolu: mapowanie.includes('ADRES'),
    staleKolumny,
    problemy: [...problemy.values()],
    rekordy,
    bezWspolrzednych,
  };
}
