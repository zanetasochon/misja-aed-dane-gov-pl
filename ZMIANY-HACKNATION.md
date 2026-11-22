# Zmiany względem kodu portalu dane.gov.pl (GPL-3.0, §5a)

Ten katalog to zmodyfikowana kopia frontendu portalu dane.gov.pl, pobranego z dane.gov.pl/source-code (`frontend_latest`). Kod jest na licencji GNU GPL v3. Zmodyfikowana wersja jest udostępniana na tej samej licencji (§5b, §5c).

Oryginał bez zmian, do porównania: `../../portal-kod/frontend_latest/`.

Prototyp powstał na HackNation 2026, wyzwanie „Misja AED – Dane na ratunek”. **To nie jest oficjalny portal dane.gov.pl.**

| Data | Plik | Zmiana |
|---|---|---|
| 2026-11-21 | `COPYING` (nowy) | Pełny tekst GNU GPL v3.0 (https://www.gnu.org/licenses/gpl-3.0.txt). |
| 2026-11-21 | `src/app/layout/main-layout/main-layout.component.html` | (usunięte 2026-11-22) Pasek na górze każdej strony: „Prototyp HackNation 2026. Nie jest to oficjalny portal dane.gov.pl.” |
| 2026-11-21 | `src/app/layout/footer/footer.component.html` | W stopce informacja o licencji GPL-3.0, braku gwarancji, liście zmian i link do kodu źródłowego (GPL §5d). |
| 2026-11-21 | `proxy.public.conf.json` (nowy) | Proxy deweloperskie do publicznego API produkcyjnego `api.dane.gov.pl/1.4`. Tylko do odczytu. |
| 2026-11-21 | `angular.json` | Nowa konfiguracja `serve` o nazwie `public`, korzystająca z proxy powyżej. |
| 2026-11-21 | `package.json` | Nowy skrypt `start:public`. |
| 2026-11-21 | `README.md` | Nowa sekcja o prototypie HackNation na początku pliku (rozwiązanie, uruchomienie, „Jak przetestować”, ograniczenia, licencje). Oryginalna treść zostaje niżej, nagłówek ma dopisek „Oryginalna dokumentacja frontendu portalu”. |
| 2026-11-21 | `.gitignore` | Wykluczenie `CLAUDE.md`, `CLAUDE.local.md` i `.claude/` (notatki zespołu poza repozytorium). |
| 2026-11-21 | `src/app/pages/dataset/dataset-routing.module.ts` | Dwie nowe trasy przed `!:id`: `!zbior-zintegrowany-aed` i `!zgodnosc-ze-wzorcem` (ładowane leniwie). |
| 2026-11-21 | `src/app/pages/dataset/dataset-page/dataset.component.ts` | W `setData()` zbiór zintegrowany AED jest dołączany jako pierwszy element listy (na 1. stronie, gdy brak filtrów i fraza pasuje do AED). Renderuje go ten sam szablon co pozostałe zbiory. |
| 2026-11-21 | `src/assets/i18n/pl.json`, `en.json` | Nowe klucze `Datasets.Integrated` („Zbiór zintegrowany” / „Integrated dataset”) i `Datasets.IntegratedTooltip` (opis do ikony). |
| 2026-11-21 | `src/app/shared/result-list/right-column/details-result-item/details-result-item.component.ts`, `.html` | Wejście `localFavoriteKey`: przycisk „Dodaj do ulubionych” i licznik działają tylko lokalnie (localStorage), bez API – placeholder dla zbioru zintegrowanego. Ikona folderu także dla klucza `Datasets.Integrated`. |
| 2026-11-21 | `src/app/shared/result-list/result-list.component.html` | Zbiór zintegrowany (`item.zbiorZintegrowany`) ma niebieską ramkę jak dane promowane (`result-item-promoted`). |
| 2026-11-21 | `src/app/shared/result-list/result-item/default-result-item/default-result-item.component.html` | Etykieta „Zbiór zintegrowany” w miejscu „Dane promowane” i ikona zbioru zintegrowanego z podpowiedzią obok tytułu. Tytuł, opis i słowa kluczowe zbioru zintegrowanego oznaczone `lang="pl"` (WCAG 3.1.2 w wersji EN). |
| 2026-11-21 | `src/app/pages/dataset/dataset-results/dataset-results.component.ts`, `.html` | Pole `zbiorZintegrowany` w elemencie listy. Dla zbioru zintegrowanego nie są pokazywane ulubione ani obserwowanie, bo nie istnieje on w API. |
| 2026-11-21 | `src/app/pages/zbior-zintegrowany/` (nowy katalog) | Kod zespołu: zbiór zintegrowany AED (metadane, źródła, raport harmonizacji, eksport CSV/JSON/GeoJSON, lista z filtrami i mapa Leaflet) oraz narzędzie „Sprawdź zgodność ze wzorcem”. |
| 2026-11-21 | `src/app/pages/zbior-zintegrowany/dane/krosno.ts`, `legionowo.ts` | Prawdziwe dane z dane.gov.pl na licencji CC0 1.0 (źródło i data w nagłówku pliku). `port-lotniczy.ts`: dane fikcyjne. |
| 2026-11-21 | `angular.json` | Nowa konfiguracja `build` o nazwie `vercel`: budżety i `outputHashing` jak w `production`, ale **bez** podmiany `environment.ts` na `environment.prod.ts`. W trybie `production` portal woła `https://api.<host>` i `https://cms.<host>`, a takich adresów na Vercelu nie ma. Z `environment.production = false` używa względnych `/api` i `/cms`, tak jak przy proxy deweloperskim. Logika aplikacji bez zmian. |
| 2026-11-21 | `vercel.json` (nowy) | Konfiguracja wdrożenia statycznego na Vercel: build `npx ng build --configuration vercel`, katalog `dist/frontend/browser`, rewrites `/api`, `/media`, `/flags`, `/cms` (odwzorowanie `proxy.public.conf.json`) i fallback SPA do `index.html`. |
| 2026-11-21 | `.vercelignore` (nowy) | Pliki pomijane przy wysyłce do Vercela (`node_modules`, `dist`, notatki zespołu). |
| 2026-11-21 | `.gitignore` | Dopisane przez Vercel CLI: `.vercel` i `.env*` (lokalne powiązanie projektu i token). |
| 2026-11-21 | `api/proxy.js` (nowy), `vercel.json` | Funkcja Vercel – proxy tylko do odczytu (GET/HEAD, inne metody 405), tylko do `api.dane.gov.pl/1.4`, `dane.gov.pl/media`, `dane.gov.pl/flags` i `cms.dane.gov.pl`, bez nagłówków `X-Forwarded-*`, przekierowania 3xx zwracane przeglądarce. Rewrites `/api`, `/media`, `/flags`, `/cms` kierują na tę funkcję. Wdrożone 21.11 o 18:10. |
| 2026-11-21 | `package.json` | `engines.node`: `>=20` → `22.x`, żeby Vercel uruchamiał funkcję i build na Node 22 (domyślnie ustawił 26.x, którego Angular 18 nie wspiera). |
| 2026-11-21 | `src/scss/layout/_layout.scss` | Poprawka dostępności: `.btn-outline-primary` w stanach `:hover`, `:focus`, `:active` dostaje biały tekst. W oryginale tło zmieniało się na `$primary-hover` (#0753a4), a tekst zostawał `$primary` (#0865c9), więc kliknięty przycisk miał kontrast ok. 1,3:1 (WCAG 1.4.3 wymaga 4,5:1). Dotyczy całego portalu. |
| 2026-11-21 | `src/assets/hacknation/wzorcowy-zakres-danych-AED-v1.2.xlsx` (nowy) | Kopia wzorcowego zakresu danych AED v1.2 (bez zmian) do pobrania na stronie „Sprawdź zgodność ze wzorcem” (krok „Pobierz wzór”). |
| 2026-11-22 | `src/assets/hacknation/szablon-danych-AED-v1.2.xlsx` (nowy, zastąpiony tego samego dnia przez v1.3) | Pusty szablon do wypełnienia: arkusz „Dane” z jednym wierszem nagłówka (27 pól wzorca v1.2 bez `id_aed`, `zrodlo_danych` i `data_aktualizacji`, które nadaje narzędzie), kolumnami tekstowymi, listami wartości i podpowiedziami; arkusz „Jak wypełnić”. |
| 2026-11-22 | `src/app/layout/main-layout/main-layout.component.html` | Usunięty pasek na górze strony (decyzja zespołu). Zastrzeżenie „Prototyp HackNation 2026. Nie jest to oficjalny portal dane.gov.pl.” przeniesione do stopki. |
| 2026-11-22 | `src/app/layout/footer/footer.component.html` | Zastrzeżenie „Prototyp HackNation 2026. Nie jest to oficjalny portal dane.gov.pl.” nad informacją o licencji. |
| 2026-11-22 | `src/index.html` | `<meta name="robots" content="noindex, nofollow">`: wyszukiwarki nie indeksują prototypu. |
| 2026-11-22 | `src/assets/hacknation/wzorcowy-zakres-danych-AED-v1.3.xlsx`, `szablon-danych-AED-v1.3.xlsx` (nowe) | Wzorzec v1.3 (43 pola, 9 wymaganych, nagłówki PL i EN, rozwiązania z formatu AED Sync) i pusty szablon v1.3 (arkusze „Dane PL”, „Data EN”, „Jak wypełnić”). Zastępują pliki v1.2 w `src/assets/hacknation/` (usunięte). |
| 2026-11-22 | `src/assets/i18n/pl.json`, `en.json` | Nowy klucz `Datasets.IntegratedFileLabel` („Plik CSV lub XLSX z danymi o AED”) – etykieta pola pliku portalu (`app-file-upload`) w narzędziu „Sprawdź zgodność ze wzorcem”. |
| 2026-11-22 | `src/app/pages/zbior-zintegrowany/` | Zmiana modelu po rozmowie z mentorem z Ministerstwa Cyfryzacji: dostawcy sami publikują dane według szablonu AED Sync v15, a zbiór zintegrowany je wyświetla. Model rekordu = 28 pól szablonu v15; dwa fikcyjne zbiory dostawców z wzorowymi plikami według szablonu; prawdziwe zbiory (Krosno, Legionowo, Przemyśl, Marki) usunięte; zakładka „Raport harmonizacji” zastąpiona „Kontrolą danych dostawców”. |
| 2026-11-22 | `src/assets/hacknation/szablon-danych-AED-Sync-v15.xlsx`, `instrukcja-i-zasady-AED-Sync-v15.xlsx` (nowe) | Pusty szablon danych AED Sync v15 (arkusze „DANE PL” i „DATA EN”) i instrukcja z zasadami (plik zespołu v15 bez zmian: „OPIS KOLUMN”, „ZASADY”). Zastępują pliki v1.3 (usunięte). |
| 2026-11-22 | `src/main.ts` | Nowy interceptor `FikcyjneZbioryInterceptor` (pierwszy na liście `HTTP_INTERCEPTORS`): na zapytania GET o fikcyjne zbiory 9900001–9900002 i zasoby 9900011–9900012 zwraca odpowiedzi w kształcie api.dane.gov.pl, więc ich strony zbioru i zasobu renderuje niezmieniony kod portalu. Pozostałe zapytania bez zmian. |
| 2026-11-22 | `src/assets/hacknation/dane/` (nowy) | Pliki CSV fikcyjnych zasobów do pobrania ze stron zbiorów (szablon AED Sync v15). |
| 2026-11-22 | `src/scss/views/_item-view.scss` | Poprawka responsywności: przyciski paska akcji strony zbioru (`.item-view__actions`: „Obserwuj”, „Dodaj do ulubionych”, licznik, przycisk akcji) się nie kurczą i przechodzą do kolejnego wiersza, gdy brakuje miejsca (`flex-wrap: wrap`, odstęp 0,75 rem); poniżej 768 px czerwony przycisk akcji (`.btn.ml-auto`) zajmuje całą wolną szerokość wiersza. W oryginale na telefonie były ściśnięte w jednym rzędzie, a tekst łamał się w środku słowa („ulubionyc / h”). Dotyczy całego portalu. |
| 2026-11-22 | `src/scss/components/_info-tooltip.scss` | Poprawka dostępności: przycisk podpowiedzi „?” (`.info-tooltip`) ma co najmniej 24 × 24 px (WCAG 2.2, 2.5.8 Rozmiar celu – minimum). W oryginale miał 20 px szerokości i za mało wolnego miejsca wokół (wynik axe-core). Ikona zostaje 20 px. Dotyczy całego portalu. |

Uruchomienie: `npm ci`, a potem `npm run start:public -- --port 4300`.

## Wdrożenie na Vercel (2026-11-21)

- Adres: https://misja-aed-gamma.vercel.app (projekt Vercel `misja-aed`, bez podłączonego repozytorium GitHub).
- Build lokalny i wysyłka gotowego wyniku: `npx vercel@latest build --prod`, a potem `npx vercel@latest deploy --prebuilt --prod`. Lokalny build pozwala uniknąć Node 26, który Vercel ustawił domyślnie (Angular 18 go nie wspiera).
- **Ograniczenie:** `api.dane.gov.pl`, `cms.dane.gov.pl` i `dane.gov.pl` odpowiadają `301` na każde żądanie z nagłówkiem `X-Forwarded-Host`, a Vercel zawsze go dodaje przy rewrite. Z tego powodu wywołania `/api` i `/cms` nie działają, a lista `/pl/dataset` i modal RODO są puste. Rozwiązanie: funkcja `api/proxy.js` (wdrożona 21.11 o 18:10). Od tego momentu lista, strona główna i modal RODO działają. Strony zbioru zintegrowanego i narzędzie „Sprawdź zgodność ze wzorcem” działają, bo mają dane osadzone w kodzie. Szczegóły: `robocze/wdrozenie.md` (poza repozytorium).
