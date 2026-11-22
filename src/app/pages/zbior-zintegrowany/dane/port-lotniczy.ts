/**
 * HackNation 2026 – Misja AED. Plik dodany do forka portalu dane.gov.pl (GPL-3.0), 2026-11-21.
 *
 * DANE FIKCYJNE. „Port Lotniczy Przykładowo” nie istnieje. Współrzędne są przykładowe
 * i nie wskazują żadnego AED. Plik celowo ma inne nazwy kolumn i średnik jako separator,
 * jak w prawdziwych zbiorach (np. Przemyśl). Wiersz 4 celowo nie ma współrzędnych –
 * we wzorcu v1.3 są opcjonalne, więc ten AED jest na liście, ale nie na mapie.
 */

export const CSV_PORT_LOTNICZY = [
  'ID;Obiekt;Gdzie;Ulica;Nr;Kod;Miasto;Lat;Lon;Dostepnosc;Godziny;W_budynku;Poziom',
  'PL-01;Terminal pasażerski, hala odlotów;Przy stanowiskach odprawy 1–4, obok punktu informacji;ul. Lotnicza;1;00-000;Przykładowo;52.071200;19.226500;ogólnodostępny;Mo-Su 04:00-23:30;TAK;1',
  'PL-02;Terminal pasażerski, hala przylotów;Przy wyjściu z odbioru bagażu;ul. Lotnicza;1;00-000;Przykładowo;52.071050;19.226900;ogólnodostępny;Mo-Su 04:00-23:30;TAK;0',
  'PL-03;Parking wielopoziomowy P2;Kapsuła przy kasach parkingowych, poziom 0;ul. Lotnicza;3;00-000;Przykładowo;52.070300;19.224100;ogólnodostępny;24/7;NIE;',
  'PL-04;Hangar techniczny;Pomieszczenie socjalne, tylko dla pracowników;ul. Lotnicza;9;00-000;Przykładowo;;;tylko personel;Mo-Fr 06:00-18:00;TAK;0',
].join('\r\n');
