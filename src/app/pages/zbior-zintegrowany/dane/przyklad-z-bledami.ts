/**
 * HackNation 2026 – Misja AED. Plik dodany do forka portalu dane.gov.pl (GPL-3.0), 2026-11-22.
 *
 * DANE FIKCYJNE. Przykładowy plik dostawcy z typowymi błędami – do pokazania narzędzia
 * „Sprawdź zgodność ze wzorcem”. „Gmina Przykładowo” nie istnieje, telefony (+48 00 …)
 * i adresy e-mail (domena .example) są nieprawdziwe. Celowe błędy:
 * - brak kolumn data_dostarczenia_danych i kod_zbioru_danych, nagłówki częściowo po angielsku;
 * - średnik jako separator (jak przy zapisie z polskiego Excela);
 * - daty w formacie DD.MM.RRRR, godziny z kropką („8.00-16.00”), stan „ok”, zły e-mail;
 * - pusta komórka w części dni (brak danych, nie 24h);
 * - wiersz bez współrzędnych i bez miejscowości (zostanie pominięty).
 */

export const CSV_PRZYKLAD_Z_BLEDAMI = [
  'facility_name;wojewodztwo;powiat;gmina;miejscowosc;ulica;numer_budynku;kod_pocztowy;komentarz_aed;aed_latitude;aed_longitude;monday_hours;tuesday_hours;wednesday_hours;thursday_hours;friday_hours;saturday_hours;sunday_hours;stan_aed;data_weryfikacji_stanu_aed;odpowiedzialny_za_aed;telefon_odpowiedzialnego_za_aed;email_odpowiedzialnego_za_aed;dostawca',
  'Urząd Gminy Przykładowo;Łódzkie;przykładowski;Przykładowo;Przykładowo;ul. Główna;1;00-002;Parter, hol przy biurze obsługi;52.0801;19.2401;8-16;8-16;8-16;8-16;8-15;Niedostępny;Niedostępny;Sprawny;2026-10-01;Gmina Przykładowo (fikcyjna);+48 00 000 00 10;aed@gmina-przykladowo.example;Gmina Przykładowo (fikcyjna)',
  'Szkoła Podstawowa nr 1 w Przykładowie;łódzkie;przykładowski;Przykładowo;Przykładowo;ul. Szkolna;4;00002;Sala gimnastyczna, przy wejściu;52.0822;19.2455;8.00-16.00;8.00-16.00;8.00-16.00;8.00-16.00;8.00-16.00;;;ok;15.10.2026;Szkoła Podstawowa nr 1 (fikcyjna);+48 00 000 00 11;sekretariat(at)sp1.example;Gmina Przykładowo (fikcyjna)',
  'Hala sportowa;łódzkie;przykładowski;Przykładowo;Przykładowo;ul. Sportowa;2;00-002;Kapsuła na zewnątrz przy wejściu głównym;52.0790;19.2380;24/7;24/7;24/7;24/7;24/7;24/7;24/7;Sprawny;2026-11-05;Ośrodek Sportu Przykładowo (fikcyjny);+48 00 000 00 12;osir@gmina-przykladowo.example;Gmina Przykładowo (fikcyjna)',
  'Świetlica wiejska;łódzkie;przykładowski;Przykładowo;;;7;;Przy drzwiach wejściowych;;;;;;;;;;Nieznany;2026-06-01;Sołectwo Przykładowo Małe (fikcyjne);+48 00 000 00 13;solectwo@gmina-przykladowo.example;Gmina Przykładowo (fikcyjna)',
].join('\r\n');
