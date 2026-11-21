# Misja AED – zbiór zintegrowany na dane.gov.pl (HackNation 2026)

Prototyp na HackNation 2026, wyzwanie „Misja AED – Dane na ratunek”. To zmodyfikowany fork frontendu portalu dane.gov.pl, na licencji GNU GPL v3.

**To nie jest oficjalny portal dane.gov.pl.** Wszystkie zmiany w plikach portalu opisuje [ZMIANY-HACKNATION.md](ZMIANY-HACKNATION.md). Pierwszy commit (`chore: import original …`) to niezmieniony kod portalu, więc `git diff` między nim a kolejnymi commitami pokazuje dokładnie naszą pracę.

## Na czym polega rozwiązanie

Dane o defibrylatorach AED są rozproszone: na dane.gov.pl jest kilka zbiorów AED od różnych urzędów, każdy w innym układzie kolumn. Prototyp pokazuje w zakładce „Dane” dodatkowy **zbiór zintegrowany**:

- łączy zbiory AED od różnych dostawców w jeden zbiór według **wzorcowego zakresu danych AED v1.2** (`wzorcowy-zakres-danych-AED-v1.2.xlsx`);
- **każdy dostawca nadal odpowiada za swój zbiór źródłowy**, a każdy rekord zachowuje `zrodlo_danych` (identyfikator zbioru źródłowego) i `data_aktualizacji` ze źródła;
- dane można przeglądać na liście i na mapie, z filtrami i wyszukiwaniem, oraz pobrać w CSV, JSON i GeoJSON;
- dostawca może sprawdzić swój plik narzędziem „Sprawdź zgodność ze wzorcem” i pobrać wersję gotową do publikacji jako zasób swojego zbioru.

### Źródła danych w prototypie

| Źródło | Dostawca | Licencja | Charakter |
| --- | --- | --- | --- |
| [Defibrylatory zlokalizowane w Mieście Krosno](https://dane.gov.pl/pl/dataset/3624,defibrylatory-zlokalizowane-w-miescie-krosno) (zasób 54632, dane z 2024-02-19) | Urząd Miasta Krosna | CC0 1.0 | **prawdziwe**, plik bez zmian |
| [Zdrowie – wykaz defibrylatorów AED w Legionowie](https://dane.gov.pl/pl/dataset/40593,zdowie) (zasób 2625221, dane z 2026-09-14) | Urząd Miasta Legionowo | CC0 1.0 | **prawdziwe**, plik bez zmian |
| [Lokalizacje AED w Przemyślu](https://dane.gov.pl/pl/dataset/4581,lokalizacje-aed-automatycznych-defibrylatorow-zewn) (zasób 62095, dane z 2024-11-06) | Urząd Miejski w Przemyślu | CC0 1.0 | **prawdziwe**, plik bez zmian (współrzędne w kolumnie `geometry` jako GeoJSON) |
| [Defibrylatory na terenie Miasta Marki](https://dane.gov.pl/pl/dataset/4955,defibrylatory-zlokalizowane-na-terenie-miasta-markI) (zasób 68353, dane z 2025-07-10) | Urząd Miasta Marki | CC BY 4.0 – „Źródło: Urząd Miasta Marki, dane.gov.pl, CC BY 4.0” | **prawdziwe**, plik bez zmian (uszkodzony u źródła, naprawiany przy odczycie) |
| [Lokalizacja defibrylatorów (AED)](https://dane.gov.pl/pl/dataset/39512,lokalizacja-defibryzatorow-aed) | Urząd m.st. Warszawy | CC BY 4.0 | **niewykorzystane**: źródło niedostępne maszynowo (link prowadzi do strony HTML); nie pobieramy danych ze strony |
| DANE FIKCYJNE – defibrylatory w porcie lotniczym | Port Lotniczy Przykładowo S.A. | – | **fikcyjne**, plik zostaje w kodzie (`dane/port-lotniczy.ts`), ale strona go nie pokazuje (przełącznik usunięty 21.11) i nie trafia do eksportu |

Pliki leżą w `src/app/pages/zbior-zintegrowany/dane/`, a w nagłówku każdego pliku jest źródło, licencja i data pobrania (2026-11-21).

## Uruchomienie

Wymagany Node.js w wersji 20 lub nowszej (testowane na 22).

```bash
npm ci
npm run start:public -- --port 4300
```

Prototyp będzie pod adresem http://localhost:4300/pl/dataset. Konfiguracja `public` kieruje zapytania przez proxy deweloperskie, tylko do odczytu, na publiczne API `https://api.dane.gov.pl/1.4`. Lista zbiorów pokazuje więc prawdziwe dane portalu. Zbiór zintegrowany jest liczony w przeglądarce z plików źródłowych dołączonych do kodu.

Build i lint:

```bash
npx ng build --configuration development
npx eslint src/app/pages/zbior-zintegrowany
```

## Jak przetestować

1. **Lista zbiorów:** otwórz http://localhost:4300/pl/dataset. Pierwszy na liście jest zbiór **„Defibrylatory AED w Polsce – zbiór zintegrowany”**, wyróżniony niebieską ramką i etykietą „Zbiór zintegrowany”. Wpisz w wyszukiwarkę portalu „defibrylator”: zobaczysz prawdziwe, osobne zbiory AED różnych urzędów.
2. **Zbiór zintegrowany:** kliknij jego tytuł (adres `/pl/dataset/zbior-zintegrowany-aed`).
   - **Informacje o zbiorze:** opis, kategoria, częstotliwość aktualizacji, licencja, data aktualizacji oraz „Prowadzący zbiór zintegrowany: Ministerstwo Cyfryzacji (administrator portalu). Za treść rekordów odpowiadają dostawcy zbiorów źródłowych.”
   - **Zbiory źródłowe:** dostawca, format, licencja i data danych.
   - **Raport harmonizacji** dla każdego źródła: mapowanie kolumn na pola wzorca, kompletność pól wymaganych (Krosno i Legionowo 5/9, port lotniczy 9/9), odrzucone wiersze z powodem i ostrzeżenia, np. adres w jednym polu albo brak numeru budynku.
   - **Możliwe duplikaty:** 2 pary w prawdziwych danych. Nie usuwamy ich automatycznie, bo w jednym budynku mogą być dwa AED.
3. **Filtry i wyszukiwanie:** w sekcji „Dane: lista i mapa” wpisz nazwę albo ulicę i użyj filtrów: miejscowość, dostęp, wewnątrz lub na zewnątrz, dostawca źródłowy, „Dostępny teraz”. Liczba wyników jest ogłaszana czytnikom ekranu.
4. **W pobliżu:** kliknij „Przykładowa lokalizacja (Legionowo)” albo „Użyj mojej lokalizacji” i wybierz promień. Lista pokazuje AED od najbliższego, z odległością i czasem dojścia. Z przykładowej lokalizacji w promieniu 500 m są 4 AED.

5. **Mapa:** znaczniki AED na podkładzie OpenStreetMap. Można przesuwać strzałkami, gdy mapa ma fokus, albo przyciskami „Przesuń…”, „Przybliż”, „Oddal”. Do znaczników prowadzi klawisz Tab, a Enter pokazuje opis. Lista pod mapą jest jej pełnym tekstowym odpowiednikiem. Na telefonie domyślnie widać listę, a mapę włącza przycisk „Pokaż mapę”.
6. **Eksport:** przyciski „Pobierz CSV”, „Pobierz JSON” i „Pobierz GeoJSON”. CSV jest w UTF-8, zgodnie z RFC 4180, bez całkowicie pustych kolumn (Standard techniczny, s. 21). JSON i GeoJSON mają te same pola wzorca.
7. **Narzędzie zgodności:** przycisk „Sprawdź zgodność ze wzorcem” (adres `/pl/dataset/zgodnosc-ze-wzorcem`).
   - Wgraj własny CSV albo kliknij „Użyj przykładu: prawdziwy plik z Krosna”.
   - Zobaczysz propozycję mapowania kolumn, którą możesz zmienić, oraz raport zgodności („Spełnione / Niespełnione”): pola wymagane, adres w osobnych polach, formaty wartości i współrzędne.
   - Pobierz plik zgodny ze wzorcem (CSV albo JSON). Plik nie opuszcza przeglądarki.

### Dlaczego domyślny promień „W pobliżu” to 500 m

Nie ma jednego standardu promienia. Zalecenia mówią o czasie dotarcia do AED:
- wytyczne AHA dla miejsc pracy: AED osiągalny w 3–5 minut w obie strony, czyli w ok. 1,5–2,5 minuty szybkiego marszu w jedną stronę (ok. 150–250 m);
- badania rozmieszczenia AED przyjmują ok. 100 m jako zasięg, który świadek pokona z AED w obie strony w 3 minuty.

500 m (ok. 6 minut marszu) to świadomy kompromis zespołu. Zbiór obejmuje dziś tylko kilka miast, więc przy 150–250 m lista byłaby często pusta. Użytkownik może wybrać 300 m. Gdy w promieniu nie ma AED, strona pokazuje najbliższy z odległością. Lokalizacja jest liczona tylko w przeglądarce i nigdzie nie jest wysyłana. Na stronie zawsze widnieje komunikat „W nagłym wypadku dzwoń 112”.

Źródła: [AHA – AED Implementation Guide (2023)](https://ECCGuidelines.Heart.org/-/media/CPR-Files/Training-Programs/AED-Implementation/2023-updates/KJ1683-AED-Guide.pdf), [badanie rozmieszczenia AED – PMC4992180](https://pmc.ncbi.nlm.nih.gov/articles/PMC4992180).

## Format plików eksportu

Szczegóły techniczne przeniesione ze strony zbioru (21.11), bo użytkownikowi nic nie mówią, a dokumentują zgodność ze Standardem technicznym dane.gov.pl (ST).

- **CSV:** UTF-8, przecinek, CRLF, zgodnie z RFC 4180, dokładnie jeden wiersz nagłówka, bez pustych wierszy (ST s. 20–21).
- **JSON:** zgodny z RFC 8259 (ST s. 23). **GeoJSON:** współrzędne WGS84; w polu `zrodla` lista zbiorów źródłowych z licencją i uznaniem autorstwa.
- **Pola:** wszystkie trzy formaty mają te same pola wzorcowego zakresu danych AED v1.2, w kolejności wzorca. Pole `zrodlo_danych` to adres zbioru źródłowego na dane.gov.pl.
- **Kolumny całkowicie puste są pomijane** (ST s. 21). Przy obecnych źródłach to 17 pól: `opis_lokalizacji`, `opis_lokalizacji_en`, `numer_lokalu`, `teryt_ulic`, `wewnatrz_budynku`, `pietro`, `dostep`, `godziny_dostepnosci`, `typ_dysponenta`, `dysponent_nazwa`, `dysponent_regon`, `producent`, `model`, `status_urzadzenia`, `data_ostatniego_przegladu`, `opis_dodatkowy`, `osm_id`. Lista zmienia się, gdy źródło zacznie dostarczać pole.
- **Uznanie autorstwa:** wymagane licencjami źródeł (np. „Źródło: Urząd Miasta Marki, dane.gov.pl, CC BY 4.0”) jest w pliku „Źródła i licencje (CSV)” i w GeoJSON. Na stronie zbioru zostało jedno zdanie, które o tym przypomina.

## Ograniczenia prototypu

- Zbiór zintegrowany jest liczony w przeglądarce z dołączonych plików. Docelowo powstaje jako zwykły zbiór na dane.gov.pl, z zasobem generowanym przez narzędzie integrujące. Prowadzi go Ministerstwo Cyfryzacji jako administrator portalu, a za treść rekordów odpowiadają dostawcy zbiorów źródłowych.
- Prawdziwe źródła nie mają godzin, dostępu ani informacji o wnętrzu budynku. Filtr „Dostępny teraz” obejmuje więc tylko AED z godzinami. To brak w danych źródłowych, który wzorzec ma uzupełnić.
- Współrzędne nie są geokodowane z adresu. Rekordy bez współrzędnych są odrzucane.
- Nowe ekrany są tylko po polsku. Teksty nie są w plikach tłumaczeń portalu.
- Brak formularza do ręcznego wpisania AED w tym forku.
- Prototyp nie jest wdrożony publicznie. Uruchamia się lokalnie z proxy do publicznego API.

## Licencje

- **Kod:** GNU GPL v3, jak kod portalu dane.gov.pl. Pełny tekst licencji jest w pliku [COPYING](COPYING). Każda strona prototypu ma u góry pasek „Prototyp HackNation 2026. Nie jest to oficjalny portal dane.gov.pl.”, a w stopce informację o licencji, braku gwarancji i link do kodu. Nasze pliki są w `src/app/pages/zbior-zintegrowany/` i mają nagłówek z datą. Zmiany w plikach portalu opisuje `ZMIANY-HACKNATION.md`.
- **Dane źródłowe:** Krosno i Legionowo na CC0 1.0. Źródło „Port Lotniczy Przykładowo” jest fikcyjne.
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

for example if your API stands on ```localhost:8000```, you need change `target` for `/api` in `proxy.conf.json` file,
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
      - "api.mcod.local:172.18.18.100"
      - "cms.mcod.local:172.18.18.100"
```

4. Change the *host* port to 4200
```yaml
  serve:
    ports:
      - "4200:4000"
```

The network name, port, and the addresses need to be coordinated with backend's `docker-compose.yml` and nginx config.
Warning: this configuration *requires* the backend network.

## CI/CD — zmienne konfigurowalne w jobach

Poniższe zmienne można ustawić ręcznie przy uruchamianiu pipeline'u w GitLabie
(*Run pipeline* → *Variables*). Zmienne z domyślną wartością `""` są zaprojektowane
jawnie pod nadpisywanie.

### Zmienne użytkownika

| Zmienna            | Job                     | Domyślnie | Opis                                                                                                                                            |
|--------------------|-------------------------|-----------|-------------------------------------------------------------------------------------------------------------------------------------------------|
| `OVERRIDE_VERSION` | `bump-version`          | `""`      | Wymusza wersję zamiast wyprowadzania jej z nazwy gałęzi `release/<x.y.z>`. Format: `MAJOR.MINOR.PATCH[-suffix]`.                                |
| `RELEASE_VERSION`  | `create-release-branch` | `""`      | Wersja nowej gałęzi `release/<x.y.z>` z `develop`. Puste → automatycznie następny minor z `package.json`. Format: `MAJOR.MINOR.PATCH[-suffix]`. |

### Zmienne środowiskowe release'u (nadpisywane w jobach `release-*`)

| Zmienna                        | Możliwe wartości                                 | Opis                                                                                    |
|--------------------------------|--------------------------------------------------|-----------------------------------------------------------------------------------------|
| `MCOD_BUILD_CONFIGURATION_ENV` | `int`, `production`                              | Przekazywana jako `--build-arg` do `docker build`; wybiera konfigurację Angulara.       |
| `IMAGE_TAG`                    | `pre-dev`, `dev`, `master`, `master-prod-latest` | Tag obrazu publikowany do rejestru; dodatkowo taguje `${IMAGE_TAG}-${PACKAGE_VERSION}`. |
| `RELEASE_DOCKER_BUILD_TARGET`  | `serve-static`                                   | Docelowy stage z `Dockerfile` używany do release'ów.                                    |
| `CODE_DIR`                     | np. `/gluster/mcod/code`                         | Katalog docelowy dla archiwum ZIP z kodem (`publish-code`).                             |

### Zmienne globalne (zwykle nie zmieniane w jobach)

`REGISTRY_HOST`, `REGISTRY`, `REGISTRY_USER`, `IMAGE`, `DEPENDENCIES_IMAGE_TAG`,
`BUILD_IMAGE_TAG`, `NODE_VERSION`, `DOCKER_VERSION`, `VERSION_FILE`.

### Wymagane sekrety CI

Ustawiane w *Settings → CI/CD → Variables*:

- `GITLAB_ACCESS_TOKEN` — token z uprawnieniami do pushowania i tworzenia MR-ów;
  używany przez `scripts/bump-version.sh` i `scripts/create-release-branch.sh`.
