# Misja AED – zbiór zintegrowany na dane.gov.pl (HackNation 2026)

Prototyp na HackNation 2026, wyzwanie „Misja AED – Dane na ratunek”. To zmodyfikowany fork frontendu portalu dane.gov.pl, na licencji GNU GPL v3.

**To nie jest oficjalny portal dane.gov.pl.** Wszystkie zmiany w plikach portalu opisuje [ZMIANY-HACKNATION.md](ZMIANY-HACKNATION.md). Pierwszy commit (`chore: import original …`) to niezmieniony kod portalu, więc `git diff` między nim a kolejnymi commitami pokazuje dokładnie naszą pracę.

## Na czym polega rozwiązanie

Dane o defibrylatorach AED są rozproszone i nikt nie bierze za nie odpowiedzialności. Rozwiązanie (zgodnie z ustaleniami z mentorem z Ministerstwa Cyfryzacji):

- **dostawcy sami dostarczają dane** – urzędy, szkoły, szpitale, firmy publikują na dane.gov.pl zbiór o swoich AED, wypełniony według wspólnego **szablonu AED Sync v15** (pusty szablon `szablon-danych-AED-Sync-v15.xlsx` i instrukcja `instrukcja-i-zasady-AED-Sync-v15.xlsx`: 28 pól, 15 obowiązkowych, nagłówki PL i EN, kod zbioru `AED-SYNC-PL`);
- **każdy dostawca odpowiada za swój zbiór**; nie zbieramy danych sami i nie łączymy cudzych, rozproszonych zbiorów w innych układach;
- portal pokazuje w zakładce „Dane” **zbiór zintegrowany**, który wyświetla dane dostawców w uporządkowany sposób: lista i mapa z filtrami i wyszukiwaniem, kontrola kompletności danych każdego dostawcy, pobieranie w CSV, JSON i GeoJSON;
- dostawca może przed publikacją sprawdzić swój plik (CSV albo XLSX) narzędziem „Sprawdź zgodność ze wzorcem” i pobrać wersję w układzie szablonu.

### Dane w prototypie

Prawdziwych zbiorów w formacie AED Sync jeszcze nie ma, więc zbiór zintegrowany pokazuje **dwa fikcyjne zbiory dostawców** (11 AED), wzorowo wypełnione według szablonu v15:

| Zbiór (strona w portalu) | Dostawca | Plik |
| --- | --- | --- |
| Defibrylatory AED w Porcie Lotniczym Przykładowo (`/pl/dataset/9900001`) | Port Lotniczy Przykładowo S.A. (fikcyjny) | `dane/port-lotniczy.ts` – 6 AED, nagłówki PL („DANE PL”) |
| Defibrylatory AED w budynkach Uniwersytetu Przykładowego (`/pl/dataset/9900002`) | Uniwersytet Przykładowy (fikcyjny) | `dane/uczelnia.ts` – 5 AED, nagłówki EN („DATA EN”) |

Każdy z nich ma w portalu **zwykłą stronę zbioru i zasobu** (opis, pasek akcji, zakładki „Dane / Warunki wykorzystywania / Historia zbioru”, zasób CSV z widokiem tabeli i pobieraniem), renderowaną **niezmienionym kodem portalu**. Odpowiedzi API dla ich identyfikatorów (zbiory 9900001–9900002, zasoby 9900011–9900012) podaje interceptor `fikcyjne-zbiory.interceptor.ts` w tym samym kształcie JSON:API co api.dane.gov.pl (`lib/fikcyjne-api.ts`); pliki CSV do pobrania są w `src/assets/hacknation/dane/`. Nazwy, współrzędne, telefony (`+48 00 …`) i adresy e-mail (domena `.example`) są nieprawdziwe. Do narzędzia zgodności jest dodatkowo fikcyjny plik z typowymi błędami (`dane/przyklad-z-bledami.ts`).

## Uruchomienie

Wymagany Node.js w wersji 20 lub nowszej (testowane na 22).

```bash
npm ci
npm run start:public -- --port 4300
```

Prototyp będzie pod adresem http://localhost:4300/pl/dataset (wersja online: https://misja-aed-gamma.vercel.app/pl/dataset). Konfiguracja `public` kieruje zapytania przez proxy deweloperskie, tylko do odczytu, na publiczne API `https://api.dane.gov.pl/1.4`, więc lista zbiorów pokazuje prawdziwe dane portalu. Zbiór zintegrowany jest liczony w przeglądarce z plików dostawców dołączonych do kodu.

Build i lint:

```bash
npx ng build --configuration development
npx eslint src/app/pages/zbior-zintegrowany
```

## Jak przetestować

1. **Lista zbiorów:** otwórz `/pl/dataset`. Pierwszy na liście jest **„Defibrylatory AED w Polsce – zbiór zintegrowany”**, wyróżniony niebieską ramką i etykietą „Zbiór zintegrowany”.
2. **Zbiór zintegrowany** (`/pl/dataset/zbior-zintegrowany-aed`):
   - **Informacje o zbiorze:** prowadzący (Ministerstwo Cyfryzacji, propozycja), licencja, liczba dostawców, szablon danych (AED Sync v15), liczba rekordów, data aktualizacji;
   - **Lista i mapa:** wyszukiwanie i filtry (miejscowość, stan AED, dostawca), potem zakładki **„Tabela” / „Mapa”** jak na stronie zasobu portalu (widać jedno albo drugie). W tabeli: godziny dla każdego dnia, „Dostępny teraz”, stan AED z datą weryfikacji, podmiot odpowiedzialny z telefonem i e-mailem oraz link do zbioru dostawcy;
   - **Zbiory dostawców:** zbiór każdego dostawcy z licencją i datą danych; tytuł prowadzi do strony zbioru w portalu;
   - **Kontrola danych dostawców:** dla każdego dostawcy – ile z 15 pól obowiązkowych jest kompletnych (oba 15/15), pominięte wiersze, ostrzeżenia, możliwe duplikaty (oznaczane, nieusuwane).
3. **Zbiór dostawcy:** kliknij nazwę zbioru (np. „Port Lotniczy Przykładowo S.A. (fikcyjny)”) – otwiera się zwykła strona zbioru portalu, a z niej zasób z tabelą danych w układzie szablonu v15.
4. **Mapa:** zakładka „Mapa” – znaczniki AED na podkładzie OpenStreetMap; przesuwanie strzałkami i przyciskami, Tab do znaczników, Enter otwiera opis. Tekstowym odpowiednikiem mapy jest zakładka „Tabela”.
5. **Eksport:** CSV, JSON, GeoJSON i „Źródła i licencje (CSV)”.
6. **Narzędzie zgodności** (`/pl/dataset/zgodnosc-ze-wzorcem`):
   - krok 1: „Pobierz szablon danych AED” (pusty plik z arkuszami „DANE PL” i „DATA EN”) i „Pobierz instrukcję i zasady” (arkusze „OPIS KOLUMN” i „ZASADY”);
   - krok 2: wgraj plik CSV albo XLSX albo kliknij „Użyj przykładu: plik z błędami (dane fikcyjne)”. Kolumn się nie dopasowuje – dostawca wypełnia szablon. Raport (2.2) pokazuje kolumny zgodne z szablonem, brakujące i spoza szablonu (z podpowiedzią poprawnej nazwy, np. `lat` → `szerokosc_geograficzna_aed`), werdykt i problemy z poradą „Jak poprawić”; plik w innym układzie dostaje werdykt „nie jest w układzie szablonu”. W 2.3 można pobrać plik z poprawkami, które narzędzie robi samo (godziny, kod pocztowy, kod zbioru).

### Przycisk „Pokaż najbliższe dostępne defibrylatory” (promień 250 m)

Przycisk jest na górze zakładki „Lista i mapa” i służy sytuacji awaryjnej: ktoś obok zasłabł, a świadek szuka AED, po który zdąży pójść. Po kliknięciu lista i mapa pokazują tylko AED **dostępne teraz** (według godzin z kolumn dni, z pominięciem AED oznaczonych jako „Niesprawny”) w promieniu **250 m**, od najbliższego. Lokalizacja jest liczona tylko w przeglądarce i nigdzie nie jest wysyłana.

Gdy w promieniu nie ma AED, o którym wiadomo, że jest teraz dostępny, strona pokazuje czerwony komunikat „Dzwoń 112” z przyciskiem „Zadzwoń 112” (`tel:112`).

**Wersja pokazowa:** dane są fikcyjne, więc przycisk nie pyta o lokalizację przeglądarki – szuka od przykładowej lokalizacji przed terminalem Portu Lotniczego Przykładowo (informacja pod przyciskiem). O każdej porze w promieniu 250 m są tam co najmniej 2 dostępne AED (parking i straż, całodobowe). Docelowo przycisk używa lokalizacji z przeglądarki (`navigator.geolocation`), liczonej tylko na urządzeniu.

**Wyniki od razu pod przyciskiem:** do 3 najbliższych dostępnych AED (nazwa i opis, gdzie dokładnie jest) z przyciskiem „Wyznacz trasę”; fokus przechodzi na te wyniki (WCAG 2.4.3).

**Trasa:** przy każdym AED ze współrzędnymi (tabela, karty, dymek na mapie) jest link „Wyznacz trasę” do trasy pieszej w Google Maps (`https://www.google.com/maps/dir/?api=1&destination=…&travelmode=walking`, bez klucza API; nic nie jest wysyłane przed kliknięciem).

Dlaczego 250 m: wytyczne AHA dla miejsc pracy zakładają AED osiągalny w 3–5 minut w obie strony, czyli ok. 1,5–2,5 minuty szybkiego marszu w jedną stronę (ok. 150–250 m). Źródła: [AHA – AED Implementation Guide (2023)](https://ECCGuidelines.Heart.org/-/media/CPR-Files/Training-Programs/AED-Implementation/2023-updates/KJ1683-AED-Guide.pdf), [badanie rozmieszczenia AED – PMC4992180](https://pmc.ncbi.nlm.nih.gov/articles/PMC4992180).

## Szablon AED Sync v15

Szablon jest w dwóch plikach (`src/assets/hacknation/`, te same kopie w materiałach do oddania): **pusty szablon danych** `szablon-danych-AED-Sync-v15.xlsx` z arkuszami do wypełnienia „DANE PL” i „DATA EN” (pola obowiązkowe z żółtym nagłówkiem, listy wartości: województwo, stan AED, kod zbioru; kolumny tekstowe, żeby Excel nie usuwał zer z kodów) oraz **instrukcja i zasady** `instrukcja-i-zasady-AED-Sync-v15.xlsx` – plik `AED_Sync_instrukcja_i_opis_pol_v15.xlsx` bez zmian (arkusze „OPIS KOLUMN” i „ZASADY”).

Najważniejsze zasady (arkusz „ZASADY”), które sprawdza walidacja (`lib/walidacja-rekordu.ts`):

- jeden wiersz to jeden AED; adres: województwo, powiat, gmina, miejscowość i numer budynku obowiązkowe, ulica opcjonalna; kody TERC i SIMC opcjonalne, 7 cyfr jako tekst;
- współrzędne WGS84 opcjonalne – AED bez współrzędnych jest na liście, ale nie na mapie (w GeoJSON `geometry: null`);
- godziny: jedna kolumna na dzień; `8-12`, `08:00-12:30`, kilka przedziałów po przecinku; `Całodobowo` / `24/7`; `Niedostępny` / `Closed`; **pusta komórka = brak danych, nie dostępność całodobowa**;
- stan AED (`Sprawny`, `Niesprawny`, `Nieznany`) i data weryfikacji stanu obowiązkowe; telefon i e-mail podmiotu odpowiedzialnego obowiązkowe; data dostarczenia danych obowiązkowa;
- `kod_zbioru_danych` = `AED-SYNC-PL` w każdym wierszu (narzędzie uzupełnia go, gdy brak kolumny).

Narzędzie rozpoznaje nagłówki PL i EN szablonu, popularne nazwy kolumn (np. `lat`, `telefon`) i nazwy z naszych wcześniejszych wzorców (v1.2, v1.3). **Odczyt XLSX** (`lib/xlsx.ts`) działa w przeglądarce bez dodatkowych bibliotek: plik XLSX to archiwum ZIP z plikami XML, rozpakowywane przez `DecompressionStream`.

## Format plików eksportu

- **CSV:** UTF-8, przecinek, CRLF, zgodnie z RFC 4180, dokładnie jeden wiersz nagłówka, bez pustych wierszy (Standard techniczny dane.gov.pl, s. 20–21).
- **JSON:** zgodny z RFC 8259 (ST s. 23). **GeoJSON:** współrzędne WGS84; w polu `zrodla` lista zbiorów dostawców z licencją.
- **Pola:** kolumny szablonu AED Sync v15 z nagłówkami PL, w kolejności szablonu. Godziny są zapisane w postaci znormalizowanej (`8-12` → `08:00-12:00`, `24/7` → `Całodobowo`).
- **Kolumny całkowicie puste są pomijane** (ST s. 21). Przy obecnych danych eksport ma 26 kolumn (puste są tylko opcjonalne `kod_terc` i `kod_simc`).

## Ograniczenia prototypu

- Zbiór zintegrowany jest liczony w przeglądarce z dołączonych plików. Docelowo powstaje jako zwykły zbiór na dane.gov.pl, z zasobem generowanym okresowo ze zbiorów oznaczonych kodem `AED-SYNC-PL`. Prowadzi go Ministerstwo Cyfryzacji jako administrator portalu (propozycja), a za treść rekordów odpowiadają dostawcy.
- Prawdziwych zbiorów w formacie AED Sync jeszcze nie ma – oba zbiory dostawców są fikcyjne. Ich strony w portalu działają dzięki interceptorowi z odpowiedziami API; strona instytucji dostawcy i zbiory te nie pojawiają się w wyszukiwarce portalu.
- Współrzędne nie są geokodowane z adresu.
- Nowe ekrany są tylko po polsku. Teksty nie są w plikach tłumaczeń portalu.
- Brak formularza do ręcznego wpisania AED; dostawca wypełnia szablon XLSX.

## Licencje

- **Kod:** GNU GPL v3, jak kod portalu dane.gov.pl. Pełny tekst licencji jest w pliku [COPYING](COPYING). Stopka każdej strony prototypu ma zastrzeżenie „Prototyp HackNation 2026. Nie jest to oficjalny portal dane.gov.pl.”, informację o licencji, braku gwarancji i link do kodu. Strony mają `noindex`, więc wyszukiwarki ich nie indeksują. Nasze pliki są w `src/app/pages/zbior-zintegrowany/` i mają nagłówek z datą. Zmiany w plikach portalu opisuje `ZMIANY-HACKNATION.md`.
- **Dane:** wyłącznie fikcyjne („Port Lotniczy Przykładowo”, „Uniwersytet Przykładowy”, „Gmina Przykładowo”).
- **Szablon AED Sync v15:** opis kolumn i zasady – materiał zespołu (plik `AED_Sync_instrukcja_i_opis_pol_v15.xlsx`).
- **Podkład mapy:** © OpenStreetMap contributors (ODbL). Atrybucja jest widoczna na mapie.
- **Biblioteka mapy:** Leaflet 1.9 (BSD-2-Clause), już będąca zależnością portalu.

---

# Oryginalna dokumentacja frontendu portalu (Otwarte Dane 2025 Frontend App)

## Installation

Recommended node and npm versions

- node > 20.10.0
- npm > 10.9.2

Main installation script is simply `npm install`. Other commands are optional, in case you need
Angular CLI for code generation or your Node Package Manager is outdated. Check your version
with `npm --version` command.

```shell
# Global installations are optional
npm install -g npm@latest
npm install -g @angular/cli

npm install
```

### Start application locally

To run your application locally, all you need to run is npm script. Script definition can be
found inside `package.json`.

```shell
npm run start-local
```

### Building application for production

There are multiple scripts that builds frontend application, however only one of them creates
final production release code.

```shell
npm run build:prod
```

### API Proxy settings

Local frontend application does not serve API. Instead, frontend uses proxy to redirect request to running API instance.
Proxy settings are stored in `proxy.conf.json` file. This file is used when frontend is run on localhost with
`npm run start`.
Change the `target` path if you want services to refer to different API address. You can copy, rename and change
`proxy.conf.json` file contents according to your needs.

Usage:
Run local environment with local backend

```shell
npm run start-local
```

Run local environment with dev backend

```shell
npm run start-dev
```

Run local environment with int backend

```shell
npm run start-int
```

Run local environment with preprod backend

```shell
npm run start-preprod
```

Proxy options:

- `target` - what is the target domain for that path
- `pathRewrite` - this option allows you to change parts of your local url to match API urls
- `secure` - determines if https requests are secure and signed with known authority, leave `false` for self-signed ssl
  certificates
- `logLevel` - verbosity of proxy server in your command line tool
- `changeOrigin` - important setting for cross origin calls, needs to stay `true` unless frontend and backend are served
  on the same domain

for example if your API stands on `localhost:8000`, you need change `target` for `/api` in `proxy.conf.json` file,
for your cms you need
do the same; change `target` for `/cms` (in this example is `localhost:8001`).

Example `proxy.conf.json` file:

```shell
{
    "/api/**": {
        "target": "http://localhost:8000",
        "secure": false,
        "pathRewrite": {
            "^/api": ""
        },
        "logLevel": "debug",
        "changeOrigin": true
    },
    "/media": {
        "target": "http://localhost:8000",
        "secure": false,
        "logLevel": "debug",
        "changeOrigin": true
    },
    "/flags": {
        "target": "https://dane.gov.pl/",
        "secure": false,
        "logLevel": "debug",
        "changeOrigin": true
    },
    "/cms": {
        "target": "https://localhost:8001",
        "secure": false,
        "logLevel": "debug",
        "changeOrigin": true,
        "pathRewrite": {
            "^/cms": ""
        }
    }
}
```

## To connect the frontend with the

Modify the `docker-compose.yml` file to:

1. add a connection to the backend network

```yaml
# top level element
networks:
  frontend: # for completeness
  backend:
    name: backend_backend
    external: true
```

2. Connect the `serve` service to these networks

```yaml
serve:
  networks:
    - frontend
    - backend
```

3. Amend `/etc/hosts` of the container

```yaml
serve:
  extra_hosts:
    - 'api.mcod.local:172.18.18.100'
    - 'cms.mcod.local:172.18.18.100'
```

4. Change the _host_ port to 4200

```yaml
serve:
  ports:
    - '4200:4000'
```

The network name, port, and the addresses need to be coordinated with backend's `docker-compose.yml` and nginx config.
Warning: this configuration _requires_ the backend network.

## CI/CD — zmienne konfigurowalne w jobach

Poniższe zmienne można ustawić ręcznie przy uruchamianiu pipeline'u w GitLabie
(_Run pipeline_ → _Variables_). Zmienne z domyślną wartością `""` są zaprojektowane
jawnie pod nadpisywanie.

### Zmienne użytkownika

| Zmienna            | Job                     | Domyślnie | Opis                                                                                                                                            |
| ------------------ | ----------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `OVERRIDE_VERSION` | `bump-version`          | `""`      | Wymusza wersję zamiast wyprowadzania jej z nazwy gałęzi `release/<x.y.z>`. Format: `MAJOR.MINOR.PATCH[-suffix]`.                                |
| `RELEASE_VERSION`  | `create-release-branch` | `""`      | Wersja nowej gałęzi `release/<x.y.z>` z `develop`. Puste → automatycznie następny minor z `package.json`. Format: `MAJOR.MINOR.PATCH[-suffix]`. |

### Zmienne środowiskowe release'u (nadpisywane w jobach `release-*`)

| Zmienna                        | Możliwe wartości                                 | Opis                                                                                    |
| ------------------------------ | ------------------------------------------------ | --------------------------------------------------------------------------------------- |
| `MCOD_BUILD_CONFIGURATION_ENV` | `int`, `production`                              | Przekazywana jako `--build-arg` do `docker build`; wybiera konfigurację Angulara.       |
| `IMAGE_TAG`                    | `pre-dev`, `dev`, `master`, `master-prod-latest` | Tag obrazu publikowany do rejestru; dodatkowo taguje `${IMAGE_TAG}-${PACKAGE_VERSION}`. |
| `RELEASE_DOCKER_BUILD_TARGET`  | `serve-static`                                   | Docelowy stage z `Dockerfile` używany do release'ów.                                    |
| `CODE_DIR`                     | np. `/gluster/mcod/code`                         | Katalog docelowy dla archiwum ZIP z kodem (`publish-code`).                             |

### Zmienne globalne (zwykle nie zmieniane w jobach)

`REGISTRY_HOST`, `REGISTRY`, `REGISTRY_USER`, `IMAGE`, `DEPENDENCIES_IMAGE_TAG`,
`BUILD_IMAGE_TAG`, `NODE_VERSION`, `DOCKER_VERSION`, `VERSION_FILE`.

### Wymagane sekrety CI

Ustawiane w _Settings → CI/CD → Variables_:

- `GITLAB_ACCESS_TOKEN` — token z uprawnieniami do pushowania i tworzenia MR-ów;
  używany przez `scripts/bump-version.sh` i `scripts/create-release-branch.sh`.
