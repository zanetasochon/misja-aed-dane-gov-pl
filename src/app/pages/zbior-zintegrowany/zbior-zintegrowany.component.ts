/**
 * HackNation 2026 – Misja AED. Plik dodany do forka portalu dane.gov.pl (GPL-3.0), 2026-11-21.
 *
 * Strona zbioru zintegrowanego „Defibrylatory AED w Polsce – zbiór zintegrowany”:
 * metadane, zbiory dostawców, kontrola danych dostawców, eksport oraz widok danych (lista + mapa + filtry).
 * Dane pochodzą od dostawców, którzy publikują je na dane.gov.pl według szablonu AED Sync v15.
 */

import { isPlatformBrowser, LowerCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CollapsibleTextComponent } from '@app/shared/collapsible-text/collapsible-text.component';
import { FavoriteCounterComponent } from '@app/shared/favorite-counter/favorite-counter.component';
import { LocalizeRouterPipe } from '@gilsdav/ngx-translate-router';
import { FavoriteButtonComponent } from '@app/shared/buttons/favorite-button/favorite-button.component';
import { SubscribeButtonComponent } from '@app/shared/subscribe-button/subscribe-button.component';
import { TranslatePipe } from '@ngx-translate/core';
import {
  DATA_AKTUALIZACJI,
  ID_ZBIORU_ZINTEGROWANEGO,
  OPIS_ZBIORU,
  SLOWA_KLUCZOWE,
  TYTUL_ZBIORU,
} from './lib/element-listy';
import { doCsv, doCsvZrodel, doGeoJson, doJson, opisyZrodel, pobierzPlik } from './lib/eksport';
import { czyDostepnyTeraz } from './lib/godziny';
import { integruj } from './lib/integracja';
import { ZRODLA } from './lib/zrodla';
import type { RaportZrodla, RekordZintegrowany } from './lib/integracja';
import { ETYKIETY, POLA_DNI, POLA_WYMAGANE, STAN_AED } from './lib/model';
import { opisGodzin } from './lib/godziny-dni';
import { trasaDoAed } from './lib/trasa';
import { czyNieaktualne, wiekWMiesiacach } from './lib/wiek-danych';
import { odlegloscM } from './lib/geometria';
import { InfoTooltipDirective } from '@app/shared/info-tooltip/info-tooltip.directive';
import { ItemsPerPageComponent } from '@app/shared/items-per-page/items-per-page.component';
import { PaginationComponent } from '@app/shared/pagination/pagination.component';
import { MapaAedComponent } from './mapa-aed.component';
import { SeoService } from '@app/services/seo.service';

type Zakladka = 'dane' | 'zrodla' | 'raport';

export interface Lokalizacja {
  szer: number;
  dlug: number;
  opis: string;
}

/** Promień wyszukiwania najbliższych dostępnych AED: ok. 3 minuty marszu tam i z powrotem. */
export const PROMIEN_AWARYJNY_M = 250;

@Component({
  selector: 'app-zbior-zintegrowany',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Treść stron jest po polsku także w wersji EN portalu (WCAG 3.1.2).
  host: { lang: 'pl' },
  imports: [
    FormsModule,
    RouterLink,
    LocalizeRouterPipe,
    MapaAedComponent,
    CollapsibleTextComponent,
    FavoriteCounterComponent,
    InfoTooltipDirective,
    ItemsPerPageComponent,
    PaginationComponent,
    SubscribeButtonComponent,
    FavoriteButtonComponent,
    TranslatePipe,
    LowerCasePipe,
  ],
  templateUrl: './zbior-zintegrowany.component.html',
  styleUrl: './zbior-zintegrowany.component.scss',
})
export class ZbiorZintegrowanyComponent {
  // Dane dostawców wgrane według szablonu AED Sync v15 (w prototypie dwa fikcyjne zbiory).
  readonly wynik = integruj(ZRODLA);
  readonly doEksportu = this.wynik.rekordy;
  readonly opisyZrodelEksportu = opisyZrodel(this.wynik.raporty);

  /** Ten sam tytuł, opis i słowa kluczowe co na liście zbiorów. */
  readonly tytul = TYTUL_ZBIORU;
  readonly opis = OPIS_ZBIORU;
  readonly slowaKluczowe = SLOWA_KLUCZOWE;

  readonly szczegolyWidoczne = signal(true);

  // Zbioru nie ma w API: ulubione tylko w localStorage, pod tym samym kluczem co na liście zbiorów.
  readonly elementObserwowany = { id: ID_ZBIORU_ZINTEGROWANEGO, attributes: { title: TYTUL_ZBIORU } };
  readonly ulubiony = signal(false);
  private readonly kluczUlubionych = `hacknation-favourite-${ID_ZBIORU_ZINTEGROWANEGO}`;

  przelaczUlubione(): void {
    const nowy = !this.ulubiony();
    this.ulubiony.set(nowy);
    try {
      localStorage.setItem(this.kluczUlubionych, String(nowy));
    } catch {
      // brak dostępu do localStorage – stan zostaje tylko w pamięci
    }
  }
  readonly zakladka = signal<Zakladka>('dane');
  /** Zakładki z podpowiedziami (appInfoTooltip). */
  readonly zakladki: { id: Zakladka; etykieta: string; podpowiedz: string }[] = [
    {
      id: 'dane',
      etykieta: 'Lista i mapa',
      podpowiedz:
        'Wszystkie AED od dostawców na liście i mapie. Możesz je przeszukiwać, filtrować, znaleźć najbliższe dostępne i pobrać zbiór w CSV, JSON albo GeoJSON.',
    },
    {
      id: 'zrodla',
      etykieta: 'Zbiory dostawców',
      podpowiedz:
        'Zbiory o AED, które dostawcy sami publikują na dane.gov.pl według szablonu AED Sync. Za dane w każdym zbiorze odpowiada jego dostawca.',
    },
    {
      id: 'raport',
      etykieta: 'Kontrola danych dostawców',
      podpowiedz:
        'Czy dane każdego dostawcy są kompletne według szablonu: pola obowiązkowe, pominięte wiersze, ostrzeżenia i możliwe duplikaty. Poprawić dane może tylko dostawca.',
    },
  ];
  readonly etykiety = ETYKIETY;
  readonly polaWymagane = POLA_WYMAGANE;
  readonly stany = STAN_AED;
  /** Rozmiary plików do pobrania – dane są stałe, więc liczymy raz. */
  readonly rozmiary = {
    csv: rozmiarPliku(doCsv(this.doEksportu)),
    json: rozmiarPliku(doJson(this.doEksportu)),
    geojson: rozmiarPliku(doGeoJson(this.doEksportu, this.opisyZrodelEksportu)),
    zrodla: rozmiarPliku(doCsvZrodel(this.opisyZrodelEksportu)),
  };
  readonly dataAktualizacji = DATA_AKTUALIZACJI;
  get miejscowosci(): string[] {
    return [...new Set(this.wynik.rekordy.map((r) => r.miejscowosc).filter((m): m is string => !!m))].sort((a, b) =>
      a.localeCompare(b, 'pl'),
    );
  }
  get dostawcy(): { id: string; nazwa: string }[] {
    return this.wynik.raporty.map((r) => ({ id: r.zrodlo.id, nazwa: r.zrodlo.dostawca }));
  }

  // Filtry i wyszukiwanie
  readonly szukaj = signal('');
  readonly miejscowosc = signal('');
  readonly stan = signal('');
  readonly tylkoTeraz = signal(false);
  readonly dostawca = signal('');
  /** Tabela albo mapa – zakładki jak na stronie zasobu portalu (teksty z kluczy tłumaczeń portalu). */
  readonly widok = signal<'tabela' | 'mapa'>('tabela');
  readonly widoki = [
    { id: 'tabela' as const, etykieta: 'Resources.TableView', podpowiedz: 'Tour.Tooltip.DataResource.Table.text' },
    { id: 'mapa' as const, etykieta: 'Resources.MapView', podpowiedz: 'Tour.Tooltip.DataResource.Map.text' },
  ];
  /** Komunikat po pobraniu pliku – pokazywany pod przyciskami „Pobierz zbiór”. */
  readonly komunikatPobierania = signal('');

  // Lokalizacja użytkownika – liczona tylko w przeglądarce, niczego nie wysyłamy.
  readonly lokalizacja = signal<Lokalizacja | null>(null);
  readonly promien = signal(PROMIEN_AWARYJNY_M);
  readonly ustalaLokalizacje = signal(false);
  readonly bladLokalizacji = signal('');

  /** Czas liczymy dopiero w przeglądarce, żeby render serwerowy i kliencki dały to samo. */
  readonly teraz = signal<Date | null>(null);
  private readonly wPrzegladarce = isPlatformBrowser(inject(PLATFORM_ID));

  /** Rekordy po filtrach (bez promienia), z odległością od lokalizacji użytkownika. */
  private readonly poFiltrach = computed(() => {
    const q = this.normalizuj(this.szukaj());
    const teraz = this.teraz();
    const lok = this.lokalizacja();
    const lista = this.wynik.rekordy.filter((r) => {
      if (q && !this.normalizuj([r.etykieta, r.komentarz_aed, r.ulica, r.miejscowosc].join(' ')).includes(q))
        return false;
      if (this.miejscowosc() && r.miejscowosc !== this.miejscowosc()) return false;
      if (this.stan() === 'brak' ? r.stan_aed !== null : this.stan() && r.stan_aed !== this.stan()) return false;
      if (this.dostawca() && r.zrodloId !== this.dostawca()) return false;
      // „Dostępny teraz”: godziny obejmują aktualną porę i AED nie jest oznaczony jako niesprawny.
      if (this.tylkoTeraz() && (!teraz || czyDostepnyTeraz(r.godziny, teraz) !== true || r.stan_aed === 'Niesprawny'))
        return false;
      return true;
    });
    if (!lok) return lista.map((r) => ({ r, m: null as number | null }));
    // AED bez współrzędnych (opcjonalne w szablonie) nie ma odległości – nie trafia do wyników w promieniu.
    return lista
      .map((r) => ({ r, m: this.odleglosc(r) }))
      .filter((x): x is { r: RekordZintegrowany; m: number } => x.m !== null)
      .sort((a, b) => a.m - b.m);
  });

  /** Wyniki listy i mapy: przy ustalonej lokalizacji tylko AED w promieniu, od najbliższego. */
  readonly wyniki = computed(() => {
    const lok = this.lokalizacja();
    const p = this.promien();
    return this.poFiltrach()
      .filter((x) => !lok || (x.m !== null && x.m <= p))
      .map((x) => x.r);
  });

  // Paginacja listy jak w portalu (app-items-per-page + app-pagination, domyślnie 20). Mapa pokazuje wszystkie wyniki.
  readonly strona = signal(1);
  readonly naStronie = signal(20);
  readonly wynikiStrony = computed(() => {
    const od = (this.strona() - 1) * this.naStronie();
    return this.wyniki().slice(od, od + this.naStronie());
  });
  /** Stan filtrów – bez zegara „teraz”, żeby lista nie wracała na stronę 1 co minutę. */
  private readonly filtry = computed(() => [
    this.szukaj(),
    this.miejscowosc(),
    this.stan(),
    this.dostawca(),
    this.tylkoTeraz(),
    this.lokalizacja(),
    this.promien(),
  ]);
  private readonly powrotNaPierwszaStrone = effect(
    () => {
      this.filtry();
      untracked(() => this.strona.set(1));
    },
    { allowSignalWrites: true },
  );

  zmienStrone(strona: number): void {
    this.strona.set(strona);
    document.getElementById('lista-aed')?.focus();
  }

  zmienNaStronie(ile: number): void {
    this.naStronie.set(+ile);
    this.strona.set(1);
  }

  /** Aktywne filtry jako usuwalne tagi. */
  readonly aktywneFiltry = computed(() => {
    const t: { klucz: string; etykieta: string }[] = [];
    if (this.szukaj().trim()) t.push({ klucz: 'szukaj', etykieta: `Szukaj: ${this.szukaj().trim()}` });
    if (this.miejscowosc()) t.push({ klucz: 'miejscowosc', etykieta: `Miejscowość: ${this.miejscowosc()}` });
    if (this.stan())
      t.push({ klucz: 'stan', etykieta: `Stan AED: ${this.stan() === 'brak' ? 'brak danych' : this.stan()}` });
    if (this.dostawca()) {
      const d = this.dostawcy.find((x) => x.id === this.dostawca());
      t.push({ klucz: 'dostawca', etykieta: `Dostawca: ${d?.nazwa ?? this.dostawca()}` });
    }
    if (this.tylkoTeraz()) t.push({ klucz: 'teraz', etykieta: 'Dostępny teraz' });
    if (this.lokalizacja())
      t.push({ klucz: 'lokalizacja', etykieta: `W pobliżu: ${this.opisPromienia(this.promien())}` });
    return t;
  });

  /** Usuwa jeden filtr; fokus przechodzi na następny tag albo na pole wyszukiwania. */
  usunFiltr(klucz: string, indeks: number): void {
    if (klucz === 'szukaj') this.szukaj.set('');
    else if (klucz === 'miejscowosc') this.miejscowosc.set('');
    else if (klucz === 'stan') this.stan.set('');
    else if (klucz === 'dostawca') this.dostawca.set('');
    else if (klucz === 'teraz') this.tylkoTeraz.set(false);
    else if (klucz === 'lokalizacja') this.lokalizacja.set(null);
    setTimeout(() => {
      const tagi = document.querySelectorAll<HTMLButtonElement>('.zz-tagi button');
      (tagi[Math.min(indeks, tagi.length - 1)] ?? document.getElementById('zz-szukaj'))?.focus();
    });
  }

  /** Tryb awaryjny bez wyników: brak AED dostępnego teraz w promieniu 250 m → czerwony komunikat „dzwoń 112”. */
  readonly brakDostepnychWPoblizu = computed(
    () => !!this.lokalizacja() && this.tylkoTeraz() && this.wyniki().length === 0,
  );

  /** Odległość w metrach od lokalizacji użytkownika (null bez lokalizacji). */
  odleglosc(r: RekordZintegrowany): number | null {
    const lok = this.lokalizacja();
    if (!lok || r.szerokosc_geograficzna_aed === null || r.dlugosc_geograficzna_aed === null) return null;
    return odlegloscM(lok, { szer: r.szerokosc_geograficzna_aed, dlug: r.dlugosc_geograficzna_aed });
  }

  opisPromienia(m: number): string {
    return m < 1000 ? `${m} m` : `${m / 1000} km`;
  }

  /**
   * Przycisk awaryjny: lokalizacja z przeglądarki, potem AED dostępne teraz w promieniu 250 m, od najbliższego.
   * Lokalizacja zostaje w przeglądarce. Gdy nie da się jej ustalić albo nie ma wyników – czerwony komunikat 112.
   */
  pokazNajblizszeDostepne(): void {
    // Wersja pokazowa: dane są fikcyjne, więc zamiast lokalizacji z przeglądarki używamy przykładowej –
    // przed terminalem fikcyjnego portu. W promieniu 250 m są tam AED dostępne całą dobę (parking 82 m,
    // straż 218 m), a w godzinach 4:00–23:30 także oba terminale.
    this.bladLokalizacji.set('');
    this.promien.set(PROMIEN_AWARYJNY_M);
    this.tylkoTeraz.set(true);
    this.lokalizacja.set({
      szer: 52.0706,
      dlug: 19.2252,
      opis: 'Twoja lokalizacja (przykładowa): przed terminalem Portu Lotniczego Przykładowo',
    });
    // Fokus na wynikach pod przyciskiem (WCAG 2.4.3) – albo na komunikacie 112, gdy wyników nie ma.
    setTimeout(() =>
      (document.getElementById('zz-najblizsze') ?? document.querySelector<HTMLElement>('.zz-112'))?.focus(),
    );
  }

  /** Do 3 najbliższych AED dostępnych teraz – pokazywane od razu pod przyciskiem awaryjnym. */
  readonly najblizsze = computed(() => (this.lokalizacja() && this.tylkoTeraz() ? this.wyniki().slice(0, 3) : []));

  /** Wyjście z trybu awaryjnego: znów wszystkie AED. */
  pokazWszystkie(): void {
    this.lokalizacja.set(null);
    this.tylkoTeraz.set(false);
    this.bladLokalizacji.set('');
    // Przewinięcie do tabeli i fokus na niej (WCAG 2.4.3) – po odświeżeniu widoku.
    this.widok.set('tabela');
    setTimeout(() => {
      const tabela = document.getElementById('lista-aed');
      tabela?.scrollIntoView({ block: 'start' });
      tabela?.focus({ preventScroll: true });
    });
  }

  constructor() {
    // Tytuł strony jak na stronach zbiorów portalu: „Tytuł - Otwarte Dane” (WCAG 2.4.2).
    inject(SeoService).setPageTitle(TYTUL_ZBIORU);
    afterNextRender(() => {
      if (!this.wPrzegladarce) return;
      this.teraz.set(new Date());
      try {
        this.ulubiony.set(localStorage.getItem(this.kluczUlubionych) === 'true');
      } catch {
        // brak dostępu do localStorage (np. tryb prywatny)
      }
      setInterval(() => this.teraz.set(new Date()), 60_000);
    });
  }

  /** Wzorzec ARIA „tabs”: strzałki, Home i End przenoszą fokus i aktywują zakładkę. */
  klawiszZakladki(event: KeyboardEvent, i: number): void {
    const n = this.zakladki.length;
    const cel: Record<string, number> = { ArrowRight: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, Home: 0, End: n - 1 };
    if (!(event.key in cel)) return;
    event.preventDefault();
    const j = cel[event.key];
    this.zakladka.set(this.zakladki[j].id);
    document.getElementById(`zz-tab-${this.zakladki[j].id}`)?.focus();
  }

  private normalizuj(s: string): string {
    return s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  stanTeraz(r: RekordZintegrowany): string {
    const t = this.teraz();
    if (!t) return '–';
    const v = czyDostepnyTeraz(r.godziny, t);
    return v === null ? 'brak danych' : v ? 'tak' : 'nie';
  }

  /** Godziny z 7 kolumn dni w skrócie, np. „pon.–pt. 08:00-16:00; sob.–niedz. Niedostępny”. */
  godziny(r: RekordZintegrowany): string | null {
    return opisGodzin(POLA_DNI.map((p) => r[p]));
  }

  /** Trasa piesza w Google Maps od bieżącej lokalizacji do AED (bez klucza API; nic nie jest wysyłane przed kliknięciem). */
  trasa(r: RekordZintegrowany): string | null {
    return trasaDoAed(r);
  }

  /** Numer do linku tel: bez spacji. */
  bezSpacji(s: string): string {
    return s.replace(/\s/g, '');
  }

  adres(r: RekordZintegrowany): string {
    return [
      [r.ulica, r.numer_budynku].filter(Boolean).join(' '),
      [r.kod_pocztowy, r.miejscowosc].filter(Boolean).join(' '),
    ]
      .filter(Boolean)
      .join(', ');
  }

  /** Data jak w portalu, np. „14 września 2026”. */
  data(iso: string): string {
    const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
    return Number.isNaN(d.getTime())
      ? iso
      : d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  /** Data z godziną jak w portalu (format D MMMM YYYY, HH:mm), np. „20 listopada 2026, 13:10”. */
  dataGodzina(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const dzien = d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
    const godzina = d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
    return `${dzien}, ${godzina}`;
  }

  /** Pola obowiązkowe, które nie są wypełnione we wszystkich rekordach dostawcy (z liczbą pustych). */
  niekompletneWymagane(r: RaportZrodla): string[] {
    return r.kompletnosc
      .filter((k) => k.wypelnione < r.przyjete)
      .map((k) => `${ETYKIETY[k.pole]} (puste: ${r.przyjete - k.wypelnione})`);
  }

  /** Dane starsze niż 12 miesięcy dostają ostrzeżenie. */
  nieaktualne(dataDanych: string): boolean {
    return czyNieaktualne(dataDanych);
  }

  opisWieku(dataDanych: string): string {
    const m = wiekWMiesiacach(dataDanych);
    const lata = Math.floor(m / 12);
    return lata >= 2 ? `ponad ${lata} lata` : lata === 1 ? 'ponad rok' : `${m} mies.`;
  }

  procent(n: number, z: number): string {
    return z === 0 ? '0%' : `${Math.round((n / z) * 100)}%`;
  }

  wyczyscFiltry(): void {
    this.szukaj.set('');
    this.miejscowosc.set('');
    this.stan.set('');
    this.tylkoTeraz.set(false);
    this.dostawca.set('');
    this.lokalizacja.set(null);
    this.promien.set(PROMIEN_AWARYJNY_M);
    this.bladLokalizacji.set('');
  }

  tekstWynikow(): string {
    if (this.lokalizacja() && this.tylkoTeraz())
      return `Znaleziono ${this.wyniki().length} AED dostępnych teraz w promieniu ${this.opisPromienia(this.promien())} od Ciebie.`;
    const promien = this.lokalizacja() ? ` w promieniu ${this.opisPromienia(this.promien())}` : '';
    return `Znaleziono ${this.wyniki().length} z ${this.wynik.rekordy.length} AED${promien}.`;
  }

  pobierz(format: 'csv' | 'json' | 'geojson' | 'zrodla'): void {
    if (format === 'zrodla') {
      const nazwaZ = 'defibrylatory-aed-zbior-zintegrowany-zrodla-i-licencje.csv';
      pobierzPlik(doCsvZrodel(this.opisyZrodelEksportu), nazwaZ, 'text/csv;charset=utf-8');
      this.komunikatPobierania.set(`Pobrano plik ${nazwaZ} (źródła, licencje i wymagane uznanie autorstwa).`);
      return;
    }
    const r = this.doEksportu;
    const nazwa = `defibrylatory-aed-zbior-zintegrowany.${format}`;
    if (format === 'csv') pobierzPlik(doCsv(r), nazwa, 'text/csv;charset=utf-8');
    else if (format === 'json') pobierzPlik(doJson(r), nazwa, 'application/json');
    else pobierzPlik(doGeoJson(r, this.opisyZrodelEksportu), nazwa, 'application/geo+json');
    this.komunikatPobierania.set(`Pobrano plik ${nazwa} (rekordy: ${r.length}).`);
  }
}

function rozmiarPliku(tresc: string): string {
  const bajty = new TextEncoder().encode(tresc).length;
  return bajty < 1024 ? `${bajty} B` : `${Math.round(bajty / 1024)} kB`;
}
