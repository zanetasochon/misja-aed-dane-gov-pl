/**
 * HackNation 2026 – Misja AED. Plik dodany do forka portalu dane.gov.pl (GPL-3.0), 2026-11-21.
 *
 * „Jak poprawić” dla komunikatów walidacji (walidacja-rekordu.ts, zgodnosc.ts) – według zasad
 * szablonu AED Sync v15 (arkusz „ZASADY”).
 */

const PORADY: [RegExp, string][] = [
  [
    /poprawiono|Usunięto apostrof|Uzupełniono/i,
    'Nic nie musisz robić – narzędzie poprawiło to samo. Warto poprawić plik źródłowy.',
  ],
  [/Brak nazwy obiektu/i, 'Wpisz nazwę obiektu (np. „Hala sportowa”) i komentarz, gdzie jest AED.'],
  [
    /Brak współrzędnych i miejscowości/i,
    'Wpisz co najmniej miejscowość. Współrzędne są opcjonalne, ale bez nich AED nie pojawi się na mapie.',
  ],
  [/niepełne/i, 'Wpisz obie współrzędne (WGS84) z kropką dziesiętną, np. 53.1234 i 18.0084, albo zostaw obie puste.'],
  [/Puste pole obowiązkowe/i, 'Uzupełnij wartość w podanych wierszach – pól obowiązkowych nie zostawiaj pustych.'],
  [/Województwo/i, 'Wybierz województwo z listy 16 województw, np. mazowieckie.'],
  [/Kod zbioru/i, 'Wpisz AED-SYNC-PL w każdym wierszu.'],
  [/e-mail/i, 'Wpisz adres w postaci nazwa@domena.pl, np. aed@urzad.example.'],
  [
    /poza Polską/i,
    'Sprawdź, czy szerokość (49–55) i długość (14–25) nie są zamienione albo przesunięte o rząd wielkości.',
  ],
  [/Kod pocztowy/i, 'Wpisz kod w formacie 00-000, np. 85-102.'],
  [/TERC|SIMC/, 'Wpisz 7 cyfr jako tekst, z zerami na początku (rejestr TERYT GUS), np. 0461011.'],
  [/spoza listy/i, 'Wybierz wartość z listy: Sprawny, Niesprawny albo Nieznany.'],
  [
    /Brak godzin w części dni/i,
    'Wpisz godziny dla każdego dnia, np. 8-16; dla dni zamkniętych „Niedostępny”, a dla całej doby „Całodobowo”.',
  ],
  [/Godziny \(/i, 'Wpisz 8-12 albo 08:00-12:30; kilka przedziałów oddziel przecinkiem, np. 8-12, 13-16.'],
  [/Telefon/i, 'Wpisz numer z kierunkowym, np. +48 22 123 45 67.'],
  [/RRRR-MM-DD/, 'Wpisz datę jako RRRR-MM-DD, np. 2026-11-21.'],
  [/GeoJSON/i, 'Zapisz położenie w dwóch kolumnach: szerokosc_geograficzna_aed i dlugosc_geograficzna_aed.'],
];

const DOMYSLNA = 'Popraw wartość według opisu pola w instrukcji (arkusz „OPIS KOLUMN”).';

export function jakPoprawic(opis: string): string {
  return PORADY.find(([re]) => re.test(opis))?.[1] ?? DOMYSLNA;
}

/** Problemy, które narzędzie samo naprawiło (wartość trafi do pliku poprawiona). */
export function czyPoprawioneAutomatycznie(opis: string): boolean {
  return /poprawiono|Usunięto apostrof|Uzupełniono/i.test(opis);
}
