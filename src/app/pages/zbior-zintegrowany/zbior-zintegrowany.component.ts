/**
 * HackNation 2026 – Misja AED. Plik dodany do forka portalu dane.gov.pl (GPL-3.0), 2026-11-21.
 *
 * Strona zbioru zintegrowanego „Defibrylatory AED w Polsce – zbiór zintegrowany”:
 * metadane, zbiory źródłowe, raport harmonizacji, eksport oraz widok danych (lista + mapa + filtry).
 */

import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CollapsibleTextComponent } from '@app/shared/collapsible-text/collapsible-text.component';
import { FavoriteCounterComponent } from '@app/shared/favorite-counter/favorite-counter.component';
import { LocalizeRouterPipe } from '@gilsdav/ngx-translate-router';
import { DATA_AKTUALIZACJI, OPIS_ZBIORU, SLOWA_KLUCZOWE, TYTUL_ZBIORU } from './lib/element-listy';
import { doCsv, doCsvZrodel, doGeoJson, doJson, opisyZrodel, pobierzPlik } from './lib/eksport';
import { czyDostepnyTeraz } from './lib/godziny';
import { integruj } from './lib/harmonizacja';
import { ZRODLA, ZRODLA_NIEDOSTEPNE } from './lib/zrodla';
import type { RaportZrodla, RekordZintegrowany } from './lib/harmonizacja';
import { DOSTEP, ETYKIETY, POLA_WYMAGANE } from './lib/model';
import { czyNieaktualne, wiekWMiesiacach } from './lib/wiek-danych';
import { odlegloscM } from './lib/geometria';
import { MapaAedComponent } from './mapa-aed.component';

type TakNie = '' | 'tak' | 'nie' | 'brak';
type Zakladka = 'dane' | 'zrodla' | 'raport';

export interface Lokalizacja {
  szer: number;
  dlug: number;
  opis: string;
}

/** Średnie tempo marszu do szacowania czasu dojścia: 5 km/h ≈ 83 m na minutę. */
const METRY_NA_MINUTE = 5000 / 60;

/**
 * Promień przycisku awaryjnego „Pokaż najbliższe dostępne defibrylatory” (decyzja Żanety, 21.11):
 * AED, do którego świadek zdąży dojść i wrócić w ciągu ok. 3 minut (AHA: 1,5–2,5 min ≈ 150–250 m w jedną stronę).
 */
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
  ],
  templateUrl: './zbior-zintegrowany.component.html',
  styleUrl: './zbior-zintegrowany.component.scss',
})
export class ZbiorZintegrowanyComponent {
  // Tylko prawdziwe źródła (przełącznik danych fikcyjnych usunięty 21.11 na prośbę Żanety).
  readonly wynik = integruj(ZRODLA);
  readonly niedostepne = ZRODLA_NIEDOSTEPNE;
  readonly doEksportu = this.wynik.rekordy;
  readonly opisyZrodelEksportu = opisyZrodel(this.wynik.raporty, ZRODLA_NIEDOSTEPNE);
  /** Ten sam tytuł, opis i słowa kluczowe co na liście zbiorów. */
  readonly tytul = TYTUL_ZBIORU;
  readonly opis = OPIS_ZBIORU;
  readonly slowaKluczowe = SLOWA_KLUCZOWE;

  // Układ strony zbioru jak w portalu: pasek boczny ze szczegółami i zakładki.
  readonly szczegolyWidoczne = signal(true);
  readonly zakladka = signal<Zakladka>('dane');
  readonly zakladki: { id: Zakladka; etykieta: string }[] = [
    { id: 'dane', etykieta: 'Lista i mapa' },
    { id: 'zrodla', etykieta: 'Zbiory źródłowe' },
    { id: 'raport', etykieta: 'Raport harmonizacji' },
  ];
  readonly etykiety = ETYKIETY;
  readonly polaWymagane = POLA_WYMAGANE;
  readonly dostepy = DOSTEP;
  /** Rozmiary plików do pobrania (DS Gov.pl: przy pliku podaj format i rozmiar). Dane są stałe, więc liczymy raz. */
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
  readonly dostep = signal('');
  readonly tylkoTeraz = signal(false);
  readonly wewnatrz = signal<TakNie>('');
  readonly dostawca = signal('');
  readonly mapaNaTelefonie = signal(false);
  readonly komunikat = signal('');

  // „W pobliżu”: lokalizacja użytkownika liczona tylko w przeglądarce (niczego nie wysyłamy).
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
      if (q && !this.normalizuj([r.nazwa_miejsca, r.ulica, r.miejscowosc].join(' ')).includes(q)) return false;
      if (this.miejscowosc() && r.miejscowosc !== this.miejscowosc()) return false;
      if (this.dostep() === 'brak' ? r.dostep !== null : this.dostep() && r.dostep !== this.dostep()) return false;
      const w = this.wewnatrz();
      if (w === 'tak' && r.wewnatrz_budynku !== true) return false;
      if (w === 'nie' && r.wewnatrz_budynku !== false) return false;
      if (w === 'brak' && r.wewnatrz_budynku !== null) return false;
      if (this.dostawca() && r.zrodloId !== this.dostawca()) return false;
      if (this.tylkoTeraz() && (!teraz || czyDostepnyTeraz(r.godziny_dostepnosci, teraz) !== true)) return false;
      return true;
    });
    if (!lok) return lista.map((r) => ({ r, m: null as number | null }));
    return lista
      .map((r) => ({ r, m: odlegloscM(lok, { szer: r.szerokosc_geograficzna, dlug: r.dlugosc_geograficzna }) }))
      .sort((a, b) => a.m - b.m);
  });

  /** Wyniki listy i mapy: przy ustalonej lokalizacji tylko AED w promieniu, od najbliższego. */
  readonly wyniki = computed(() => {
    const lok = this.lokalizacja();
    const p = this.promien();
    return this.poFiltrach()
      .filter((x) => !lok || (x.m ?? 0) <= p)
      .map((x) => x.r);
  });

  /** Aktywne filtry jako usuwalne tagi (MOJ Filter, app-remove-button portalu). */
  readonly aktywneFiltry = computed(() => {
    const t: { klucz: string; etykieta: string }[] = [];
    const opisWewnatrz: Record<string, string> = { tak: 'wewnątrz budynku', nie: 'na zewnątrz', brak: 'brak danych' };
    if (this.szukaj().trim()) t.push({ klucz: 'szukaj', etykieta: `Szukaj: ${this.szukaj().trim()}` });
    if (this.miejscowosc()) t.push({ klucz: 'miejscowosc', etykieta: `Miejscowość: ${this.miejscowosc()}` });
    if (this.dostep())
      t.push({ klucz: 'dostep', etykieta: `Dostęp: ${this.dostep() === 'brak' ? 'brak danych' : this.dostep()}` });
    if (this.wewnatrz()) t.push({ klucz: 'wewnatrz', etykieta: `Położenie: ${opisWewnatrz[this.wewnatrz()]}` });
    if (this.dostawca()) {
      const d = this.dostawcy.find((x) => x.id === this.dostawca());
      t.push({ klucz: 'dostawca', etykieta: `Dostawca: ${d?.nazwa ?? this.dostawca()}` });
    }
    if (this.tylkoTeraz()) t.push({ klucz: 'teraz', etykieta: 'Dostępny teraz' });
    if (this.lokalizacja())
      t.push({ klucz: 'lokalizacja', etykieta: `W pobliżu: ${this.opisPromienia(this.promien())}` });
    return t;
  });

  /** Usuwa jeden filtr; fokus przechodzi na następny tag albo na pole wyszukiwania (WCAG 2.4.3). */
  usunFiltr(klucz: string, indeks: number): void {
    if (klucz === 'szukaj') this.szukaj.set('');
    else if (klucz === 'miejscowosc') this.miejscowosc.set('');
    else if (klucz === 'dostep') this.dostep.set('');
    else if (klucz === 'wewnatrz') this.wewnatrz.set('');
    else if (klucz === 'dostawca') this.dostawca.set('');
    else if (klucz === 'teraz') this.tylkoTeraz.set(false);
    else if (klucz === 'lokalizacja') this.lokalizacja.set(null);
    this.komunikat.set('Usunięto filtr.');
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
    return lok ? odlegloscM(lok, { szer: r.szerokosc_geograficzna, dlug: r.dlugosc_geograficzna }) : null;
  }

  opisOdleglosci(m: number): string {
    const tekst = m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`;
    return `${tekst} (ok. ${Math.max(1, Math.ceil(m / METRY_NA_MINUTE))} min pieszo)`;
  }

  opisPromienia(m: number): string {
    return m < 1000 ? `${m} m` : `${m / 1000} km`;
  }

  /**
   * Przycisk awaryjny: lokalizacja z przeglądarki, potem AED dostępne teraz w promieniu 250 m, od najbliższego.
   * Lokalizacja zostaje w przeglądarce. Gdy nie da się jej ustalić albo nie ma wyników – czerwony komunikat 112.
   */
  pokazNajblizszeDostepne(): void {
    if (this.ustalaLokalizacje()) return;
    if (!this.wPrzegladarce || !('geolocation' in navigator)) {
      this.bladLokalizacji.set('Ta przeglądarka nie udostępnia lokalizacji.');
      return;
    }
    this.ustalaLokalizacje.set(true);
    this.bladLokalizacji.set('');
    this.komunikat.set('Ustalam Twoją lokalizację…');
    navigator.geolocation.getCurrentPosition(
      (poz) => {
        this.ustalaLokalizacje.set(false);
        this.promien.set(PROMIEN_AWARYJNY_M);
        this.tylkoTeraz.set(true);
        this.lokalizacja.set({
          szer: poz.coords.latitude,
          dlug: poz.coords.longitude,
          opis: `Twoja lokalizacja (dokładność ok. ${Math.round(poz.coords.accuracy)} m)`,
        });
        this.komunikat.set('');
      },
      (err) => {
        this.ustalaLokalizacje.set(false);
        this.bladLokalizacji.set(
          err.code === err.PERMISSION_DENIED
            ? 'Nie udzielono zgody na lokalizację.'
            : 'Nie udało się ustalić Twojej lokalizacji.',
        );
        this.komunikat.set('');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  }

  /** Wyjście z trybu awaryjnego: znów wszystkie AED. */
  pokazWszystkie(): void {
    this.lokalizacja.set(null);
    this.tylkoTeraz.set(false);
    this.bladLokalizacji.set('');
    this.komunikat.set('Lista pokazuje wszystkie AED.');
  }

  constructor() {
    afterNextRender(() => {
      if (!this.wPrzegladarce) return;
      this.teraz.set(new Date());
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
    const v = czyDostepnyTeraz(r.godziny_dostepnosci, t);
    return v === null ? 'brak danych' : v ? 'tak' : 'nie';
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

  /** Etykiety pól wymaganych, których źródło nie dostarcza w żadnym rekordzie. */
  brakujaceWymagane(r: RaportZrodla): string[] {
    return r.kompletnosc
      .filter((k) => k.wypelnione === 0 && this.polaWymagane.includes(k.pole))
      .map((k) => ETYKIETY[k.pole]);
  }

  /** Dane starsze niż 12 miesięcy dostają ostrzeżenie tekstowe (nie tylko kolor – WCAG 1.4.1). */
  nieaktualne(dataDanych: string): boolean {
    return czyNieaktualne(dataDanych);
  }

  opisWieku(dataDanych: string): string {
    const m = wiekWMiesiacach(dataDanych);
    const lata = Math.floor(m / 12);
    return lata >= 2 ? `ponad ${lata} lata` : lata === 1 ? 'ponad rok' : `${m} mies.`;
  }

  takNie(v: boolean | null): string {
    return v === null ? 'brak danych' : v ? 'wewnątrz' : 'na zewnątrz';
  }

  procent(n: number, z: number): string {
    return z === 0 ? '0%' : `${Math.round((n / z) * 100)}%`;
  }

  wyczyscFiltry(): void {
    this.szukaj.set('');
    this.miejscowosc.set('');
    this.dostep.set('');
    this.tylkoTeraz.set(false);
    this.wewnatrz.set('');
    this.dostawca.set('');
    this.lokalizacja.set(null);
    this.promien.set(PROMIEN_AWARYJNY_M);
    this.bladLokalizacji.set('');
    this.komunikat.set('Wyczyszczono filtry.');
  }

  /** Treść komunikatu o liczbie wyników – jedno zdanie, bez spacji przed kropką. */
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
      this.komunikat.set(`Pobrano plik ${nazwaZ} (źródła, licencje i wymagane uznanie autorstwa).`);
      return;
    }
    const r = this.doEksportu;
    const nazwa = `defibrylatory-aed-zbior-zintegrowany.${format}`;
    if (format === 'csv') pobierzPlik(doCsv(r), nazwa, 'text/csv;charset=utf-8');
    else if (format === 'json') pobierzPlik(doJson(r), nazwa, 'application/json');
    else pobierzPlik(doGeoJson(r, this.opisyZrodelEksportu), nazwa, 'application/geo+json');
    this.komunikat.set(`Pobrano plik ${nazwa} (${r.length} rekordów).`);
  }
}

function rozmiarPliku(tresc: string): string {
  const bajty = new TextEncoder().encode(tresc).length;
  return bajty < 1024 ? `${bajty} B` : `${Math.round(bajty / 1024)} kB`;
}
