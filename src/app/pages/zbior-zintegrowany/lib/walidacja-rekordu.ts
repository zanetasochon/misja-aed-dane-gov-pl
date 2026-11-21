/**
 * HackNation 2026 – Misja AED. Plik dodany do forka portalu dane.gov.pl (GPL-3.0), 2026-11-21.
 *
 * JEDNA funkcja walidacji rekordu względem wzorca AED v1.2 – używana przez harmonizację
 * zbioru zintegrowanego i przez narzędzie „Sprawdź zgodność ze wzorcem”.
 *
 * - błędy → rekord odrzucony (brak nazwy, brak/niepoprawne współrzędne, punkt poza Polską);
 * - ostrzeżenia → rekord zostaje, a niepoprawne pole jest puste – komunikat mówi to wprost;
 * - normalizacja do reguł Standardu technicznego (ST s. 15–16): kropka dziesiętna, true/false,
 *   kod 00-000, numery bez spacji, daty ISO 8601.
 */

import { czyDostepnyTeraz } from './godziny';
import { DOSTEP, STATUS_URZADZENIA, TYP_DYSPONENTA } from './model';
import type { Dostep, PoleRekordu, RekordAed } from './model';

export type WartoscWejsciowa = string | number | boolean | null | undefined;
export type RekordWejsciowy = Partial<Record<PoleRekordu, WartoscWejsciowa>>;

export interface OstrzezeniePola {
  pole: PoleRekordu;
  /** Ogólny opis problemu – ten sam dla wszystkich wierszy (do grupowania w raporcie). */
  opis: string;
  /** Wartość z pliku, której dotyczy problem. */
  wartosc: string;
}

export interface WynikWalidacji {
  /** Rekord po normalizacji (bez pól systemowych: id_aed, zrodlo_danych, data_aktualizacji). */
  rekord: Partial<RekordAed>;
  /** Powody odrzucenia całego rekordu. */
  bledy: string[];
  ostrzezenia: OstrzezeniePola[];
}

/** Granice Polski z zapasem – wspólne dla harmonizacji i narzędzia. */
export const ZAKRES_SZEROKOSCI: readonly [number, number] = [49, 55];
export const ZAKRES_DLUGOSCI: readonly [number, number] = [14, 25];

const PUSTE = ' – w pliku wynikowym pole będzie puste.';

const DOSTEP_SYNONIMY: Record<string, Dostep> = {
  publiczny: 'publiczny',
  klienci: 'klienci',
  ograniczony: 'ograniczony',
  yes: 'publiczny',
  customers: 'klienci',
  private: 'ograniczony',
  ogolnodostepny: 'publiczny',
  'dla klientow': 'klienci',
  'tylko personel': 'ograniczony',
};

const PRAWDA = new Set(['true', 'tak', '1', 'yes', 't']);
const FALSZ = new Set(['false', 'nie', '0', 'no', 'n']);

const bezOgonkow = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').trim();

function tekst(v: WartoscWejsciowa): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim().replace(/\s+/g, ' ');
  return s === '' ? null : s;
}

function liczba(v: WartoscWejsciowa): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = tekst(v)?.replace(',', '.');
  return s && /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : null;
}

const wZakresie = (v: number, [a, b]: readonly [number, number]) => v >= a && v <= b;

function poprawnaData(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [r, m, d] = v.split('-').map(Number);
  const dt = new Date(Date.UTC(r, m - 1, d));
  return dt.getUTCFullYear() === r && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function walidujRekord(wej: RekordWejsciowy): WynikWalidacji {
  const bledy: string[] = [];
  const ostrzezenia: OstrzezeniePola[] = [];
  const ostrzez = (pole: PoleRekordu, opis: string, wartosc: WartoscWejsciowa) =>
    ostrzezenia.push({ pole, opis, wartosc: String(wartosc ?? '') });
  const r: Partial<RekordAed> = {};

  // Pola tekstowe – tylko przycięcie spacji.
  for (const p of [
    'nazwa_miejsca',
    'opis_lokalizacji',
    'opis_lokalizacji_en',
    'ulica',
    'numer_budynku',
    'numer_lokalu',
    'miejscowosc',
    'dysponent_nazwa',
    'producent',
    'model',
    'opis_dodatkowy',
  ] as const) {
    (r as Record<string, unknown>)[p] = tekst(wej[p]);
  }

  // Nazwa – bez niej rekordu nie da się opisać.
  if (!r.nazwa_miejsca) bledy.push('Brak nazwy miejsca – rekordu nie da się opisać na liście ani mapie.');

  // Współrzędne (WGS84, kropka dziesiętna) – wymagane, w granicach Polski.
  let szer = liczba(wej.szerokosc_geograficzna);
  let dlug = liczba(wej.dlugosc_geograficzna);
  if (szer === null || dlug === null) {
    bledy.push('Brak współrzędnych albo nie są liczbami – AED nie da się pokazać na mapie.');
  } else {
    if (!wZakresie(szer, ZAKRES_SZEROKOSCI) && wZakresie(szer, ZAKRES_DLUGOSCI) && wZakresie(dlug, ZAKRES_SZEROKOSCI)) {
      [szer, dlug] = [dlug, szer];
      ostrzez(
        'szerokosc_geograficzna',
        'Szerokość i długość geograficzna były zamienione – poprawiono.',
        `${dlug}, ${szer}`,
      );
    }
    if (!wZakresie(szer, ZAKRES_SZEROKOSCI) || !wZakresie(dlug, ZAKRES_DLUGOSCI)) {
      bledy.push(`Współrzędne poza Polską (${szer}, ${dlug}).`);
    } else {
      // 6 miejsc po przecinku – jak w przykładzie ze wzorca (≈ 0,1 m).
      r.szerokosc_geograficzna = Math.round(szer * 1e6) / 1e6;
      r.dlugosc_geograficzna = Math.round(dlug * 1e6) / 1e6;
    }
  }

  // Adres w osobnych polach (ST s. 16).
  let kod = tekst(wej.kod_pocztowy);
  if (kod && /^\d{5}$/.test(kod)) kod = `${kod.slice(0, 2)}-${kod.slice(2)}`;
  if (kod && !/^\d{2}-\d{3}$/.test(kod)) {
    ostrzez('kod_pocztowy', 'Kod pocztowy nie ma formatu 00-000' + PUSTE, kod);
    kod = null;
  }
  r.kod_pocztowy = kod;
  if (r.ulica && !r.numer_budynku) ostrzez('numer_budynku', 'Brak numeru budynku w adresie.', r.ulica);

  // TERYT: TERC 6 lub 7 cyfr (portal dopuszcza obie długości), SIMC 7 cyfr, ULIC 5 cyfr.
  const kody: [PoleRekordu, RegExp, string][] = [
    ['teryt_terc', /^\d{6,7}$/, 'Kod TERC powinien mieć 6 lub 7 cyfr'],
    ['teryt_simc', /^\d{7}$/, 'Kod SIMC powinien mieć 7 cyfr'],
    ['teryt_ulic', /^\d{5}$/, 'Kod ULIC powinien mieć 5 cyfr'],
  ];
  for (const [pole, re, opis] of kody) {
    const v = tekst(wej[pole]);
    if (v && !re.test(v)) ostrzez(pole, opis + PUSTE, v);
    (r as Record<string, unknown>)[pole] = v && re.test(v) ? v : null;
  }

  // Wartość logiczna true/false (ST s. 15).
  const wb = wej.wewnatrz_budynku;
  if (typeof wb === 'boolean') r.wewnatrz_budynku = wb;
  else {
    const n = tekst(wb)?.toLowerCase() ?? null;
    r.wewnatrz_budynku = n === null ? null : PRAWDA.has(n) ? true : FALSZ.has(n) ? false : null;
    if (n !== null && r.wewnatrz_budynku === null)
      ostrzez('wewnatrz_budynku', 'Wartość logiczna powinna być true albo false' + PUSTE, wb);
  }

  // Piętro – liczba całkowita.
  const pietro = wej.pietro;
  if (typeof pietro === 'number') r.pietro = Number.isInteger(pietro) ? pietro : null;
  else {
    const v = tekst(pietro);
    r.pietro = v && /^-?\d+$/.test(v) ? Number(v) : null;
    if (v && r.pietro === null) ostrzez('pietro', 'Piętro powinno być liczbą całkowitą (0 = parter)' + PUSTE, v);
  }

  // Słowniki.
  const dostep = tekst(wej.dostep);
  r.dostep = dostep ? (DOSTEP_SYNONIMY[bezOgonkow(dostep)] ?? null) : null;
  if (dostep && !r.dostep) ostrzez('dostep', `Wartość spoza słownika (${DOSTEP.join(', ')})` + PUSTE, dostep);

  const status = tekst(wej.status_urzadzenia);
  r.status_urzadzenia = status && (STATUS_URZADZENIA as readonly string[]).includes(status) ? status : null;
  if (status && !r.status_urzadzenia)
    ostrzez('status_urzadzenia', `Wartość spoza słownika (${STATUS_URZADZENIA.join(', ')})` + PUSTE, status);

  const typ = tekst(wej.typ_dysponenta);
  r.typ_dysponenta = typ && (TYP_DYSPONENTA as readonly string[]).includes(typ) ? typ : null;
  if (typ && !r.typ_dysponenta) ostrzez('typ_dysponenta', 'Wartość spoza słownika typów dysponenta' + PUSTE, typ);

  // Godziny w składni opening_hours.
  const godziny = tekst(wej.godziny_dostepnosci);
  r.godziny_dostepnosci = godziny && czyDostepnyTeraz(godziny) !== null ? godziny : null;
  if (godziny && !r.godziny_dostepnosci)
    ostrzez(
      'godziny_dostepnosci',
      'Godziny nie są w składni opening_hours (np. Mo-Fr 08:00-16:00 albo 24/7)' + PUSTE,
      godziny,
    );

  // Numery bez spacji i łączników (ST s. 15–16).
  const regon = tekst(wej.dysponent_regon)?.replace(/[\s-]/g, '') ?? null;
  r.dysponent_regon = regon && /^(\d{9}|\d{14})$/.test(regon) ? regon : null;
  if (regon && !r.dysponent_regon) ostrzez('dysponent_regon', 'REGON powinien mieć 9 albo 14 cyfr' + PUSTE, regon);

  const telefonSurowy = tekst(wej.telefon_kontaktowy);
  const telefon = telefonSurowy?.replace(/^'/, '').replace(/[\s\-.()]/g, '') ?? null;
  r.telefon_kontaktowy = telefon && /^(\d{9}|\+\d{10,14})$/.test(telefon) ? telefon : null;
  if (telefonSurowy && !r.telefon_kontaktowy)
    ostrzez(
      'telefon_kontaktowy',
      'Telefon powinien mieć 9 cyfr albo numer kierunkowy kraju (+48…)' + PUSTE,
      telefonSurowy,
    );
  else if (telefonSurowy && telefonSurowy.startsWith("'"))
    ostrzez(
      'telefon_kontaktowy',
      'Usunięto apostrof na początku numeru (ślad po arkuszu kalkulacyjnym).',
      telefonSurowy,
    );

  // Data ISO 8601 (yyyy-mm-dd).
  const przeglad = tekst(wej.data_ostatniego_przegladu);
  r.data_ostatniego_przegladu = przeglad && poprawnaData(przeglad) ? przeglad : null;
  if (przeglad && !r.data_ostatniego_przegladu)
    ostrzez('data_ostatniego_przegladu', 'Data powinna mieć format rrrr-mm-dd' + PUSTE, przeglad);

  // Identyfikator OSM.
  const osm = tekst(wej.osm_id);
  r.osm_id = osm && /^(node|way|relation)\/\d+$/.test(osm) ? osm : null;
  if (osm && !r.osm_id) ostrzez('osm_id', 'Identyfikator OSM powinien mieć postać node/123' + PUSTE, osm);

  return { rekord: r, bledy, ostrzezenia };
}
