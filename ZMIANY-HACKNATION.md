# Zmiany względem kodu portalu dane.gov.pl (GPL-3.0, §5a)

Ten katalog to zmodyfikowana kopia frontendu portalu dane.gov.pl, pobranego z dane.gov.pl/source-code (`frontend_latest`). Kod jest na licencji GNU GPL v3. Zmodyfikowana wersja jest udostępniana na tej samej licencji (§5b, §5c).

Oryginał bez zmian, do porównania: `../../portal-kod/frontend_latest/`.

Prototyp powstał na HackNation 2026, wyzwanie „Misja AED – Dane na ratunek”. **To nie jest oficjalny portal dane.gov.pl.**

| Data | Plik | Zmiana |
|---|---|---|
| 2026-11-21 | `proxy.public.conf.json` (nowy) | Proxy deweloperskie do publicznego API produkcyjnego `api.dane.gov.pl/1.4`. Tylko do odczytu. |
| 2026-11-21 | `angular.json` | Nowa konfiguracja `serve` o nazwie `public`, korzystająca z proxy powyżej. |
| 2026-11-21 | `package.json` | Nowy skrypt `start:public`. |
| 2026-11-21 | `.gitignore` | Wykluczenie `CLAUDE.md`, `CLAUDE.local.md` i `.claude/` (notatki zespołu poza repozytorium). |
| 2026-11-21 | `src/app/pages/dataset/dataset-routing.module.ts` | Dwie nowe trasy przed `!:id`: `!zbior-zintegrowany-aed` i `!zgodnosc-ze-wzorcem` (ładowane leniwie). |
| 2026-11-21 | `src/app/pages/dataset/dataset-page/dataset.component.html` | Karta zbioru zintegrowanego nad listą wyników (`<app-karta-zbioru-zintegrowanego>`). |
| 2026-11-21 | `src/app/pages/dataset/dataset-page/dataset.component.ts` | Import komponentu karty (2 linie). |
| 2026-11-21 | `src/app/pages/zbior-zintegrowany/` (nowy katalog) | Kod zespołu: zbiór zintegrowany AED (metadane, źródła, raport harmonizacji, eksport CSV/JSON/GeoJSON, lista z filtrami i mapa Leaflet) oraz narzędzie „Sprawdź zgodność ze wzorcem”. |
| 2026-11-21 | `src/app/pages/zbior-zintegrowany/dane/krosno.ts`, `legionowo.ts` | Prawdziwe dane z dane.gov.pl na licencji CC0 1.0 (źródło i data w nagłówku pliku). `port-lotniczy.ts`: dane fikcyjne. |

Uruchomienie: `npm ci`, a potem `npm run start:public -- --port 4300`.
