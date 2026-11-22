# Zmiany względem kodu portalu dane.gov.pl (GPL-3.0, §5a)

Ten katalog to zmodyfikowana kopia frontendu portalu dane.gov.pl, pobranego z dane.gov.pl/source-code (`frontend_latest`). Kod jest na licencji GNU GPL v3. Zmodyfikowana wersja jest udostępniana na tej samej licencji (§5b, §5c).

Oryginał bez zmian, do porównania: `../../portal-kod/frontend_latest/`.

Prototyp powstał na HackNation 2026, wyzwanie „Misja AED – Dane na ratunek”. **To nie jest oficjalny portal dane.gov.pl.**

Tabela opisuje stan obecny: każdy plik portalu, który różni się od oryginału (`git diff` względem pierwszego commita), i nowe pliki poza naszym katalogiem `src/app/pages/zbior-zintegrowany/`.

| Data | Plik | Zmiana |
|---|---|---|
| 2026-11-21 | `COPYING` (nowy) | Pełny tekst GNU GPL v3.0 (https://www.gnu.org/licenses/gpl-3.0.txt). |
| 2026-11-21 | `README.md` | Nowa sekcja o prototypie HackNation na początku pliku (rozwiązanie, uruchomienie, „Jak przetestować”, ograniczenia, licencje). Oryginalna treść zostaje niżej, nagłówek ma dopisek „Oryginalna dokumentacja frontendu portalu”. |
| 2026-11-21, 2026-11-22 | `src/app/layout/footer/footer.component.html` | W stopce zastrzeżenie „Prototyp HackNation 2026. Nie jest to oficjalny portal dane.gov.pl.”, informacja o licencji GPL-3.0, braku gwarancji, liście zmian i link do kodu źródłowego (GPL §5d). |
| 2026-11-22 | `src/index.html` | `<meta name="robots" content="noindex, nofollow">`: wyszukiwarki nie indeksują prototypu. |
| 2026-11-21 | `src/app/pages/dataset/dataset-routing.module.ts` | Dwie nowe trasy przed `!:id`: `!zbior-zintegrowany-aed` i `!zgodnosc-ze-wzorcem` (ładowane leniwie). |
| 2026-11-21 | `src/app/pages/dataset/dataset-page/dataset.component.ts` | W `setData()` zbiór zintegrowany AED jest dołączany jako pierwszy element listy (na 1. stronie, gdy brak filtrów i fraza pasuje do AED). Renderuje go ten sam szablon co pozostałe zbiory. |
| 2026-11-21 | `src/app/pages/dataset/dataset-results/dataset-results.component.ts`, `.html` | Pole `zbiorZintegrowany` w elemencie listy. Dla zbioru zintegrowanego nie są pokazywane ulubione ani obserwowanie, bo nie istnieje on w API. |
| 2026-11-21 | `src/app/shared/result-list/result-list.component.html` | Zbiór zintegrowany (`item.zbiorZintegrowany`) ma niebieską ramkę jak dane promowane (`result-item-promoted`). |
| 2026-11-21 | `src/app/shared/result-list/result-item/default-result-item/default-result-item.component.html` | Etykieta „Zbiór zintegrowany” w miejscu „Dane promowane” i ikona zbioru zintegrowanego z podpowiedzią obok tytułu. Tytuł, opis i słowa kluczowe zbioru zintegrowanego oznaczone `lang="pl"` (WCAG 3.1.2 w wersji EN). |
| 2026-11-21 | `src/app/shared/result-list/right-column/details-result-item/details-result-item.component.ts`, `.html` | Wejście `localFavoriteKey`: przycisk „Dodaj do ulubionych” i licznik działają tylko lokalnie (localStorage), bez API – dla zbioru zintegrowanego. Ikona folderu także dla klucza `Datasets.Integrated`. |
| 2026-11-21, 2026-11-22 | `src/assets/i18n/pl.json`, `en.json` | Nowe klucze `Datasets.Integrated` („Zbiór zintegrowany” / „Integrated dataset”), `Datasets.IntegratedTooltip` (opis do ikony) i `Datasets.IntegratedFileLabel` („Plik CSV lub XLSX z danymi o AED” – etykieta pola pliku portalu w narzędziu zgodności). |
| 2026-11-22 | `src/main.ts` | Nowy interceptor `FikcyjneZbioryInterceptor` (pierwszy na liście `HTTP_INTERCEPTORS`): na zapytania GET o fikcyjne zbiory 9900001–9900002 i zasoby 9900011–9900012 zwraca odpowiedzi w kształcie api.dane.gov.pl, więc ich strony zbioru i zasobu renderuje niezmieniony kod portalu. Pozostałe zapytania bez zmian. |
| 2026-11-21 | `src/scss/layout/_layout.scss` | Poprawka dostępności: `.btn-outline-primary` w stanach `:hover`, `:focus`, `:active` dostaje biały tekst. W oryginale tło zmieniało się na `$primary-hover` (#0753a4), a tekst zostawał `$primary` (#0865c9), więc kliknięty przycisk miał kontrast ok. 1,3:1 (WCAG 1.4.3 wymaga 4,5:1). Dotyczy całego portalu. |
| 2026-11-22 | `src/scss/components/_info-tooltip.scss` | Poprawka dostępności: przycisk podpowiedzi „?” (`.info-tooltip`) ma co najmniej 24 × 24 px (WCAG 2.2, 2.5.8 Rozmiar celu – minimum). W oryginale miał 20 px szerokości i za mało wolnego miejsca wokół (wynik axe-core). Ikona zostaje 20 px. Dotyczy całego portalu. |
| 2026-11-22 | `src/scss/views/_item-view.scss` | Poprawka responsywności: przyciski paska akcji strony zbioru (`.item-view__actions`) się nie kurczą i przechodzą do kolejnego wiersza, gdy brakuje miejsca (`flex-wrap: wrap`); poniżej 768 px przycisk akcji (`.btn.ml-auto`) zajmuje całą wolną szerokość wiersza. W oryginale na telefonie były ściśnięte w jednym rzędzie, a tekst łamał się w środku słowa. Dotyczy całego portalu. |
| 2026-11-22 | `src/assets/hacknation/` (nowy katalog) | Szablon danych AED Sync v15 (`szablon-danych-AED-Sync-v15.xlsx`: arkusze „DANE PL” i „DATA EN”), instrukcja z zasadami (`instrukcja-i-zasady-AED-Sync-v15.xlsx`) oraz pliki CSV fikcyjnych zasobów (`dane/`) do pobrania. |
| 2026-11-21 | `proxy.public.conf.json` (nowy) | Proxy deweloperskie do publicznego API produkcyjnego `api.dane.gov.pl/1.4`. Tylko do odczytu. |
| 2026-11-21 | `angular.json` | Nowa konfiguracja `serve` o nazwie `public` (z proxy powyżej) i konfiguracja `build` o nazwie `vercel`: budżety i `outputHashing` jak w `production`, ale **bez** podmiany `environment.ts` na `environment.prod.ts` (w trybie `production` portal woła `https://api.<host>`, a takiego adresu na Vercelu nie ma; z `environment.production = false` używa względnych `/api` i `/cms`). Logika aplikacji bez zmian. |
| 2026-11-21 | `package.json`, `package-lock.json` | Nowy skrypt `start:public`; `engines.node`: `>=20` → `22.x` (Vercel domyślnie ustawiał Node 26, którego Angular 18 nie wspiera). |
| 2026-11-21 | `vercel.json` (nowy) | Konfiguracja wdrożenia statycznego na Vercel: build `npx ng build --configuration vercel`, katalog `dist/frontend/browser`, rewrites `/api`, `/media`, `/flags`, `/cms` (odwzorowanie `proxy.public.conf.json`) i fallback SPA do `index.html`. |
| 2026-11-21 | `api/proxy.js` (nowy) | Funkcja Vercel – proxy tylko do odczytu (GET/HEAD, inne metody 405), tylko do `api.dane.gov.pl/1.4`, `dane.gov.pl/media`, `dane.gov.pl/flags` i `cms.dane.gov.pl`, bez nagłówków `X-Forwarded-*`. |
| 2026-11-21 | `.vercelignore` (nowy) | Pliki pomijane przy wysyłce do Vercela (`node_modules`, `dist`, `.angular`, `coverage`). |
| 2026-11-21 | `.gitignore` | Wykluczenie `.vercel` i `.env*` (lokalne powiązanie z Vercel i token). |
| 2026-11-21 | `src/app/pages/zbior-zintegrowany/` (nowy katalog) | Kod zespołu: zbiór zintegrowany AED (lista i mapa, zbiory dostawców, kontrola danych dostawców, eksport CSV/JSON/GeoJSON), narzędzie „Sprawdź zgodność ze wzorcem” według szablonu AED Sync v15 i interceptor fikcyjnych zbiorów. Dane wyłącznie fikcyjne (`dane/`). Każdy plik ma nagłówek z licencją i datą. |

Uruchomienie: `npm ci`, a potem `npm run start:public -- --port 4300`.

## Wdrożenie na Vercel (2026-11-21)

- Adres: https://misja-aed-gamma.vercel.app (projekt Vercel `misja-aed`, bez podłączonego repozytorium GitHub).
- Build lokalny i wysyłka gotowego wyniku: `npx vercel@latest build --prod`, a potem `npx vercel@latest deploy --prebuilt --prod`. Lokalny build pozwala uniknąć Node 26, który Vercel ustawił domyślnie (Angular 18 go nie wspiera).
- **Ograniczenie:** `api.dane.gov.pl`, `cms.dane.gov.pl` i `dane.gov.pl` odpowiadają `301` na każde żądanie z nagłówkiem `X-Forwarded-Host`, a Vercel zawsze go dodaje przy rewrite. Z tego powodu wywołania `/api` i `/cms` nie działają, a lista `/pl/dataset` i modal RODO są puste. Rozwiązanie: funkcja `api/proxy.js` (wdrożona 21.11 o 18:10). Od tego momentu lista, strona główna i modal RODO działają. Strony zbioru zintegrowanego i narzędzie „Sprawdź zgodność ze wzorcem” działają, bo mają dane osadzone w kodzie. Szczegóły: `robocze/wdrozenie.md` (poza repozytorium).
