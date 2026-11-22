/**
 * HackNation 2026 – Misja AED. Plik dodany do forka portalu dane.gov.pl (GPL-3.0), 2026-11-21.
 *
 * JEDNA funkcja walidacji rekordu według szablonu AED Sync v15 (arkusz „ZASADY”) – używana przy
 * wyświetlaniu danych dostawców w zbiorze zintegrowanym i w narzędziu „Sprawdź zgodność ze wzorcem”.
 *
 * - błędy → rekord pominięty: nie wiadomo, gdzie jest AED (brak współrzędnych i miejscowości)
 *   albo nie da się go opisać (brak nazwy obiektu i komentarza);
 * - ostrzeżenia → rekord zostaje, a niepoprawne pole jest puste – komunikat mówi to wprost;
 * - normalizacja: godziny „8-12” → „08:00-12:00”, „24/7” → „Całodobowo”, kod 00-000, kropka dziesiętna,
 *   daty RRRR-MM-DD (ISO 8601).
 */

import { DNI_PL, godzinyZDni, normalizujDzien } from './godziny-dni';
import { KOD_ZBIORU, POLA_DNI, STAN_AED, WOJEWODZTWA } from './model';
import type { PoleRekordu, RekordAed } from './model';

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
  rekord: Partial<RekordAed>;
  /** Godziny jako opening_hours – tylko do filtra „Dostępny teraz”, nie trafiają do pliku. */
  godziny: string | null;
  /** Powody pominięcia całego rekordu. */
  bledy: string[];
  ostrzezenia: OstrzezeniePola[];
}

/** Granice Polski z zapasem. */
export const ZAKRES_SZEROKOSCI: readonly [number, number] = [49, 55];
export const ZAKRES_DLUGOSCI: readonly [number, number] = [14, 25];

const PUSTE = ' – w pliku wynikowym pole będzie puste.';

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
    'nazwa_obiektu',
    'powiat',
    'gmina',
    'miejscowosc',
    'ulica',
    'numer_budynku',
    'komentarz_aed',
    'odpowiedzialny_za_aed',
    'dostawca',
  ] as const) {
    r[p] = tekst(wej[p]);
  }

  if (!r.nazwa_obiektu && !r.komentarz_aed)
    bledy.push('Brak nazwy obiektu i komentarza o AED – rekordu nie da się opisać na liście ani mapie.');

  // Województwo ze słownika 16 województw („Województwo Mazowieckie” → „mazowieckie”).
  const woj = tekst(wej.wojewodztwo);
  const wojNorm = woj ? bezOgonkow(woj).replace(/^wojewodztwo\s+/, '') : null;
  r.wojewodztwo = wojNorm ? (WOJEWODZTWA.find((w) => bezOgonkow(w) === wojNorm) ?? null) : null;
  if (woj && !r.wojewodztwo) ostrzez('wojewodztwo', 'Województwo spoza listy 16 województw' + PUSTE, woj);

  // Kody TERYT: tekst, 7 cyfr, z zerami na początku (reguła 3).
  for (const [pole, nazwa] of [
    ['kod_terc', 'TERC'],
    ['kod_simc', 'SIMC'],
  ] as const) {
    const v = tekst(wej[pole]);
    r[pole] = v && /^\d{7}$/.test(v) ? v : null;
    if (v && !r[pole]) ostrzez(pole, `Kod ${nazwa} powinien mieć 7 cyfr (z zerami na początku)` + PUSTE, v);
  }

  // Kod pocztowy 00-000.
  let kod = tekst(wej.kod_pocztowy);
  if (kod && /^\d{5}$/.test(kod)) kod = `${kod.slice(0, 2)}-${kod.slice(2)}`;
  if (kod && !/^\d{2}-\d{3}$/.test(kod)) {
    ostrzez('kod_pocztowy', 'Kod pocztowy nie ma formatu 00-000' + PUSTE, kod);
    kod = null;
  }
  r.kod_pocztowy = kod;

  // Współrzędne WGS84 – opcjonalne (reguła 5), w granicach Polski.
  let szer = liczba(wej.szerokosc_geograficzna_aed);
  let dlug = liczba(wej.dlugosc_geograficzna_aed);
  const szerTekst = tekst(wej.szerokosc_geograficzna_aed);
  const dlugTekst = tekst(wej.dlugosc_geograficzna_aed);
  r.szerokosc_geograficzna_aed = null;
  r.dlugosc_geograficzna_aed = null;
  if (szer === null || dlug === null) {
    if (szerTekst || dlugTekst)
      ostrzez(
        'szerokosc_geograficzna_aed',
        'Współrzędne są niepełne albo nie są liczbami – AED nie pojawi się na mapie' + PUSTE,
        `${szerTekst ?? ''}, ${dlugTekst ?? ''}`,
      );
  } else {
    if (!wZakresie(szer, ZAKRES_SZEROKOSCI) && wZakresie(szer, ZAKRES_DLUGOSCI) && wZakresie(dlug, ZAKRES_SZEROKOSCI)) {
      [szer, dlug] = [dlug, szer];
      ostrzez(
        'szerokosc_geograficzna_aed',
        'Szerokość i długość geograficzna były zamienione – poprawiono.',
        `${dlug}, ${szer}`,
      );
    }
    if (!wZakresie(szer, ZAKRES_SZEROKOSCI) || !wZakresie(dlug, ZAKRES_DLUGOSCI)) {
      ostrzez('szerokosc_geograficzna_aed', 'Współrzędne poza Polską' + PUSTE, `${szer}, ${dlug}`);
    } else {
      r.szerokosc_geograficzna_aed = Math.round(szer * 1e6) / 1e6;
      r.dlugosc_geograficzna_aed = Math.round(dlug * 1e6) / 1e6;
    }
  }
  if (r.szerokosc_geograficzna_aed === null && !r.miejscowosc)
    bledy.push('Brak współrzędnych i miejscowości – nie wiadomo, gdzie jest AED.');

  // Godziny dla każdego dnia (reguły 6–10). Pusta komórka = brak danych.
  const dni = POLA_DNI.map((pole, i) => {
    const surowa = tekst(wej[pole]);
    const v = normalizujDzien(surowa);
    if (v === undefined) {
      ostrzez(
        pole,
        `Godziny (${DNI_PL[i]}) nie mają formatu 8-12, 08:00-12:30, „Całodobowo” ani „Niedostępny”` + PUSTE,
        surowa,
      );
      return null;
    }
    return v;
  });
  POLA_DNI.forEach((pole, i) => (r[pole] = dni[i]));
  const bezDanych = DNI_PL.filter((_, i) => dni[i] === null && !tekst(wej[POLA_DNI[i]]));
  if (bezDanych.length > 0 && bezDanych.length < 7)
    ostrzez(
      'poniedzialek_godziny',
      'Brak godzin w części dni – pusta komórka oznacza brak danych, a nie dostępność całodobową.',
      bezDanych.join(', '),
    );

  // Stan AED: Sprawny, Niesprawny, Nieznany (reguła 11).
  const stan = tekst(wej.stan_aed);
  const stanNorm = stan ? bezOgonkow(stan).replace(/e$/, 'y') : null;
  r.stan_aed = stanNorm ? (STAN_AED.find((s) => bezOgonkow(s) === stanNorm) ?? null) : null;
  if (stan && !r.stan_aed) ostrzez('stan_aed', `Wartość spoza listy (${STAN_AED.join(', ')})` + PUSTE, stan);

  // Daty RRRR-MM-DD (reguły 11–12).
  for (const pole of ['data_weryfikacji_stanu_aed', 'data_dostarczenia_danych'] as const) {
    const v = tekst(wej[pole]);
    r[pole] = v && poprawnaData(v) ? v : null;
    if (v && !r[pole]) ostrzez(pole, 'Data powinna mieć format RRRR-MM-DD' + PUSTE, v);
  }

  // Kontakt do podmiotu odpowiedzialnego (reguła 13).
  const telefon = tekst(wej.telefon_odpowiedzialnego_za_aed)?.replace(/^'/, '') ?? null;
  const cyfry = telefon?.replace(/[\s\-.()]/g, '') ?? '';
  r.telefon_odpowiedzialnego_za_aed = telefon && /^\+?\d{9,15}$/.test(cyfry) ? telefon : null;
  if (telefon && !r.telefon_odpowiedzialnego_za_aed)
    ostrzez('telefon_odpowiedzialnego_za_aed', 'Telefon powinien mieć co najmniej 9 cyfr' + PUSTE, telefon);

  const email = tekst(wej.email_odpowiedzialnego_za_aed);
  r.email_odpowiedzialnego_za_aed = email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
  if (email && !r.email_odpowiedzialnego_za_aed)
    ostrzez('email_odpowiedzialnego_za_aed', 'Adres e-mail ma zły format' + PUSTE, email);

  // Kod zbioru: stała wartość AED-SYNC-PL (reguła 15).
  const kodZbioru = tekst(wej.kod_zbioru_danych);
  r.kod_zbioru_danych = kodZbioru?.toUpperCase() === KOD_ZBIORU ? KOD_ZBIORU : null;
  if (kodZbioru && !r.kod_zbioru_danych)
    ostrzez('kod_zbioru_danych', `Kod zbioru danych powinien mieć wartość ${KOD_ZBIORU}` + PUSTE, kodZbioru);

  return { rekord: r, godziny: godzinyZDni(dni), bledy, ostrzezenia };
}
