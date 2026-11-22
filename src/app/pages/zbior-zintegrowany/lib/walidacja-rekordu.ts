/**
 * HackNation 2026 – Misja AED. Plik dodany do forka portalu dane.gov.pl (GPL-3.0), 2026-11-21.
 *
 * JEDNA funkcja walidacji rekordu względem wzorca AED v1.3 – używana przez harmonizację
 * zbioru zintegrowanego i przez narzędzie „Sprawdź zgodność ze wzorcem”.
 *
 * - błędy → rekord odrzucony: nie wiadomo, gdzie jest AED (brak współrzędnych i miejscowości)
 *   albo nie da się go opisać (brak nazwy miejsca i opisu lokalizacji);
 * - współrzędne są opcjonalne (v1.3); niepoprawne albo poza Polską → ostrzeżenie i puste pole;
 * - ostrzeżenia → rekord zostaje, a niepoprawne pole jest puste – komunikat mówi to wprost;
 * - normalizacja do reguł Standardu technicznego (ST s. 15–16): kropka dziesiętna, true/false,
 *   kod 00-000, numery bez spacji, daty ISO 8601.
 */

import { czyDostepnyTeraz } from './godziny';
import { DNI_PL, godzinyZDni, normalizujDzien } from './godziny-dni';
import { DOSTEP, KOD_ZBIORU, POLA_DNI, STATUS_URZADZENIA, TYP_ODPOWIEDZIALNEGO, WOJEWODZTWA } from './model';
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

const STATUS_AED_SYNC: Record<string, string> = { sprawny: 'sprawne', niesprawny: 'niesprawne' };

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
    'powiat',
    'gmina',
    'ulica',
    'numer_budynku',
    'numer_lokalu',
    'miejscowosc',
    'odpowiedzialny_za_aed',
    'dostawca',
    'producent',
    'model',
    'opis_dodatkowy',
  ] as const) {
    (r as Record<string, unknown>)[p] = tekst(wej[p]);
  }

  // Bez nazwy miejsca i opisu lokalizacji rekordu nie da się opisać na liście ani mapie.
  if (!r.nazwa_miejsca && !r.opis_lokalizacji)
    bledy.push('Brak nazwy miejsca i opisu lokalizacji – rekordu nie da się opisać na liście ani mapie.');

  // Kod zbioru – stała wartość, po której integrator rozpoznaje dane.
  const kodZbioru = tekst(wej.kod_zbioru_danych);
  r.kod_zbioru_danych = kodZbioru?.toUpperCase() === KOD_ZBIORU ? KOD_ZBIORU : null;
  if (kodZbioru && !r.kod_zbioru_danych)
    ostrzez('kod_zbioru_danych', `Kod zbioru danych powinien mieć wartość ${KOD_ZBIORU}` + PUSTE, kodZbioru);

  // Województwo słownie, ze słownika 16 województw („Województwo Mazowieckie” → „mazowieckie”).
  const woj = tekst(wej.wojewodztwo);
  const wojNorm = woj ? bezOgonkow(woj).replace(/^wojewodztwo\s+/, '') : null;
  r.wojewodztwo = wojNorm ? (WOJEWODZTWA.find((w) => bezOgonkow(w) === wojNorm) ?? null) : null;
  if (woj && !r.wojewodztwo) ostrzez('wojewodztwo', 'Województwo spoza listy 16 województw' + PUSTE, woj);

  // Współrzędne (WGS84, kropka dziesiętna) – opcjonalne (v1.3), w granicach Polski.
  let szer = liczba(wej.szerokosc_geograficzna);
  let dlug = liczba(wej.dlugosc_geograficzna);
  const szerTekst = tekst(wej.szerokosc_geograficzna);
  const dlugTekst = tekst(wej.dlugosc_geograficzna);
  r.szerokosc_geograficzna = null;
  r.dlugosc_geograficzna = null;
  if (szer === null || dlug === null) {
    if (szerTekst || dlugTekst)
      ostrzez(
        'szerokosc_geograficzna',
        'Współrzędne są niepełne albo nie są liczbami – AED nie pojawi się na mapie' + PUSTE,
        `${szerTekst ?? ''}, ${dlugTekst ?? ''}`,
      );
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
      ostrzez('szerokosc_geograficzna', 'Współrzędne poza Polską' + PUSTE, `${szer}, ${dlug}`);
    } else {
      // 6 miejsc po przecinku – jak w przykładzie ze wzorca (≈ 0,1 m).
      r.szerokosc_geograficzna = Math.round(szer * 1e6) / 1e6;
      r.dlugosc_geograficzna = Math.round(dlug * 1e6) / 1e6;
    }
  }
  if (r.szerokosc_geograficzna === null && !r.miejscowosc)
    bledy.push('Brak współrzędnych i miejscowości – nie wiadomo, gdzie jest AED.');

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

  // Stan z AED Sync: „Sprawny” → sprawne, „Niesprawny” → niesprawne, „Nieznany” = brak danych.
  const statusSurowy = tekst(wej.status_urzadzenia);
  const status =
    statusSurowy?.toLowerCase() === 'nieznany'
      ? null
      : (STATUS_AED_SYNC[statusSurowy?.toLowerCase() ?? ''] ?? statusSurowy);
  r.status_urzadzenia = status && (STATUS_URZADZENIA as readonly string[]).includes(status) ? status : null;
  if (status && !r.status_urzadzenia)
    ostrzez('status_urzadzenia', `Wartość spoza słownika (${STATUS_URZADZENIA.join(', ')})` + PUSTE, status);

  const typ = tekst(wej.typ_odpowiedzialnego_za_aed);
  r.typ_odpowiedzialnego_za_aed = typ && (TYP_ODPOWIEDZIALNEGO as readonly string[]).includes(typ) ? typ : null;
  if (typ && !r.typ_odpowiedzialnego_za_aed)
    ostrzez('typ_odpowiedzialnego_za_aed', 'Wartość spoza słownika typów podmiotu' + PUSTE, typ);

  // Godziny dla każdego dnia (HH:MM-HH:MM, „Niedostępny”, „24h”). Pusta komórka = brak danych.
  const dni = POLA_DNI.map((pole, i) => {
    const surowa = tekst(wej[pole]);
    const v = normalizujDzien(surowa);
    if (v === undefined) {
      ostrzez(
        pole,
        `Godziny dnia (${DNI_PL[i]}) nie mają formatu HH:MM-HH:MM, „Niedostępny” ani „24h”` + PUSTE,
        surowa,
      );
      return null;
    }
    return v;
  });
  POLA_DNI.forEach((pole, i) => ((r as Record<string, unknown>)[pole] = dni[i]));
  const bezDanych = DNI_PL.filter((_, i) => dni[i] === null && !tekst(wej[POLA_DNI[i]]));
  if (bezDanych.length > 0 && bezDanych.length < 7)
    ostrzez(
      'poniedzialek_godziny',
      'Brak godzin w części dni – pusta komórka nie oznacza dostępności całodobowej; w tych dniach AED uznano za niedostępny.',
      bezDanych.join(', '),
    );

  // Godziny w składni opening_hours: wpisane wprost albo wyliczone z kolumn dni.
  const godziny = tekst(wej.godziny_dostepnosci);
  r.godziny_dostepnosci = godziny && czyDostepnyTeraz(godziny) !== null ? godziny : null;
  if (godziny && !r.godziny_dostepnosci)
    ostrzez(
      'godziny_dostepnosci',
      'Godziny nie są w składni opening_hours (np. Mo-Fr 08:00-16:00 albo 24/7)' + PUSTE,
      godziny,
    );
  if (!r.godziny_dostepnosci) r.godziny_dostepnosci = godzinyZDni(dni);

  // Numery bez spacji i łączników (ST s. 15–16).
  const regon = tekst(wej.regon_odpowiedzialnego_za_aed)?.replace(/[\s-]/g, '') ?? null;
  r.regon_odpowiedzialnego_za_aed = regon && /^(\d{9}|\d{14})$/.test(regon) ? regon : null;
  if (regon && !r.regon_odpowiedzialnego_za_aed)
    ostrzez('regon_odpowiedzialnego_za_aed', 'REGON powinien mieć 9 albo 14 cyfr' + PUSTE, regon);

  const telefonSurowy = tekst(wej.telefon_odpowiedzialnego_za_aed);
  const telefon = telefonSurowy?.replace(/^'/, '').replace(/[\s\-.()]/g, '') ?? null;
  r.telefon_odpowiedzialnego_za_aed = telefon && /^(\d{9}|\+\d{10,14})$/.test(telefon) ? telefon : null;
  if (telefonSurowy && !r.telefon_odpowiedzialnego_za_aed)
    ostrzez(
      'telefon_odpowiedzialnego_za_aed',
      'Telefon powinien mieć 9 cyfr albo numer kierunkowy kraju (+48…)' + PUSTE,
      telefonSurowy,
    );
  else if (telefonSurowy && telefonSurowy.startsWith("'"))
    ostrzez(
      'telefon_odpowiedzialnego_za_aed',
      'Usunięto apostrof na początku numeru (ślad po arkuszu kalkulacyjnym).',
      telefonSurowy,
    );

  // E-mail do zgłaszania usterek.
  const email = tekst(wej.email_odpowiedzialnego_za_aed);
  r.email_odpowiedzialnego_za_aed = email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
  if (email && !r.email_odpowiedzialnego_za_aed)
    ostrzez('email_odpowiedzialnego_za_aed', 'Adres e-mail ma zły format' + PUSTE, email);

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
