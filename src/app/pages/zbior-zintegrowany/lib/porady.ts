/**
 * HackNation 2026 – Misja AED. Plik dodany do forka portalu dane.gov.pl (GPL-3.0), 2026-11-21.
 *
 * „Jak poprawić” dla komunikatów walidacji (walidacja-rekordu.ts, zgodnosc.ts).
 */

const PORADY: [RegExp, string][] = [
  [
    /poprawiono|Usunięto apostrof/i,
    'Nic nie musisz robić – narzędzie poprawiło to samo. Warto poprawić plik źródłowy.',
  ],
  [/Brak nazwy miejsca/i, 'Wpisz nazwę miejsca, np. „Urząd Miejski” albo „Hala sportowa”.'],
  [/Brak współrzędnych/i, 'Wpisz szerokość i długość geograficzną (WGS84) z kropką dziesiętną, np. 49.6887 i 21.7706.'],
  [
    /poza Polską/i,
    'Sprawdź, czy szerokość (49–55) i długość (14–25) nie są zamienione albo przesunięte o rząd wielkości.',
  ],
  [/Kod pocztowy/i, 'Wpisz kod w formacie 00-000, np. 38-400.'],
  [/numeru budynku/i, 'Przenieś numer budynku z kolumny ulicy do osobnej kolumny.'],
  [/TERC|SIMC|ULIC/, 'Skopiuj kod z rejestru TERYT GUS (eteryt.stat.gov.pl) – same cyfry, bez spacji.'],
  [/true albo false/i, 'Wpisz true (AED wewnątrz budynku) albo false (na zewnątrz).'],
  [/Piętro/i, 'Wpisz liczbę całkowitą: 0 = parter, 1 = pierwsze piętro, -1 = piwnica.'],
  [/spoza słownika/i, 'Użyj jednej z wartości z arkusza „Słowniki” we wzorcu.'],
  [/opening_hours/i, 'Zapisz godziny jak w przykładach: 24/7 albo Mo-Fr 08:00-16:00; Sa 09:00-13:00.'],
  [/REGON/i, 'Wpisz 9 albo 14 cyfr REGON, bez spacji i kresek.'],
  [/Telefon/i, 'Wpisz 9 cyfr albo numer z kierunkowym kraju, np. +48123456789.'],
  [/rrrr-mm-dd/i, 'Wpisz datę jako rrrr-mm-dd, np. 2026-03-15.'],
  [/OSM/i, 'Wpisz identyfikator w postaci node/123456.'],
  [/GeoJSON/i, 'Zapisz położenie jako punkt GeoJSON albo w dwóch kolumnach: szerokość i długość.'],
];

const DOMYSLNA = 'Popraw wartość według opisu pola w arkuszu „Zakres danych” wzorca.';

export function jakPoprawic(opis: string): string {
  return PORADY.find(([re]) => re.test(opis))?.[1] ?? DOMYSLNA;
}

/** Problemy, które narzędzie samo naprawiło (wartość trafi do pliku poprawiona). */
export function czyPoprawioneAutomatycznie(opis: string): boolean {
  return /poprawiono|Usunięto apostrof/i.test(opis);
}
