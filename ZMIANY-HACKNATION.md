# Zmiany względem kodu portalu dane.gov.pl (GPL-3.0, §5a)

Ten katalog to zmodyfikowana kopia frontendu portalu dane.gov.pl, pobranego z dane.gov.pl/source-code (`frontend_latest`). Kod jest na licencji GNU GPL v3. Zmodyfikowana wersja jest udostępniana na tej samej licencji (§5b, §5c).

Oryginał bez zmian, do porównania: `../../portal-kod/frontend_latest/`.

Prototyp powstał na HackNation 2026, wyzwanie „Misja AED – Dane na ratunek”. **To nie jest oficjalny portal dane.gov.pl.**

| Data | Plik | Zmiana |
|---|---|---|
| 2026-11-21 | `COPYING` (nowy) | Pełny tekst GNU GPL v3.0 (https://www.gnu.org/licenses/gpl-3.0.txt). |
| 2026-11-21 | `src/app/layout/main-layout/main-layout.component.html` | Pasek na górze każdej strony: „Prototyp HackNation 2026. Nie jest to oficjalny portal dane.gov.pl.” |
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
| 2026-11-21 | `src/app/shared/result-list/result-item/default-result-item/default-result-item.component.html` | Etykieta „Zbiór zintegrowany” w miejscu „Dane promowane” i ikona zbioru zintegrowanego z podpowiedzią obok tytułu. |
| 2026-11-21 | `src/app/pages/dataset/dataset-results/dataset-results.component.ts`, `.html` | Pole `zbiorZintegrowany` w elemencie listy. Dla zbioru zintegrowanego nie są pokazywane ulubione ani obserwowanie, bo nie istnieje on w API. |
| 2026-11-21 | `src/app/pages/zbior-zintegrowany/` (nowy katalog) | Kod zespołu: zbiór zintegrowany AED (metadane, źródła, raport harmonizacji, eksport CSV/JSON/GeoJSON, lista z filtrami i mapa Leaflet) oraz narzędzie „Sprawdź zgodność ze wzorcem”. |
| 2026-11-21 | `src/app/pages/zbior-zintegrowany/dane/krosno.ts`, `legionowo.ts` | Prawdziwe dane z dane.gov.pl na licencji CC0 1.0 (źródło i data w nagłówku pliku). `port-lotniczy.ts`: dane fikcyjne. |

Uruchomienie: `npm ci`, a potem `npm run start:public -- --port 4300`.
