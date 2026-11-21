/**
 * HackNation 2026 – Misja AED. Plik dodany do forka portalu dane.gov.pl (GPL-3.0), 2026-11-21.
 *
 * Strona zbioru zintegrowanego „Defibrylatory AED – zbiór zintegrowany”:
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
import { doCsv, doGeoJson, doJson, kolumnyEksportu, pobierzPlik } from './lib/eksport';
import { czyDostepnyTeraz } from './lib/godziny';
import { integruj } from './lib/harmonizacja';
import type { RekordZintegrowany } from './lib/harmonizacja';
import { DOSTEP, ETYKIETY, POLA_WYMAGANE } from './lib/model';
import { MapaAedComponent } from './mapa-aed.component';

type TakNie = '' | 'tak' | 'nie' | 'brak';
type Zakladka = 'dane' | 'zrodla' | 'raport';

@Component({
  selector: 'app-zbior-zintegrowany',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  readonly wynik = integruj();
  /** Ten sam tytuł, opis i słowa kluczowe co na liście zbiorów. */
  readonly tytul = TYTUL_ZBIORU;
  readonly opis = OPIS_ZBIORU;
  readonly slowaKluczowe = SLOWA_KLUCZOWE;

  // Układ strony zbioru jak w portalu: pasek boczny ze szczegółami i zakładki.
  readonly szczegolyWidoczne = signal(true);
  readonly zakladka = signal<Zakladka>('dane');
  readonly zakladki: { id: Zakladka; etykieta: string }[] = [
    { id: 'dane', etykieta: 'Dane: lista i mapa' },
    { id: 'zrodla', etykieta: 'Zbiory źródłowe' },
    { id: 'raport', etykieta: 'Raport harmonizacji' },
  ];
  readonly etykiety = ETYKIETY;
  readonly polaWymagane = POLA_WYMAGANE;
  readonly dostepy = DOSTEP;
  readonly pominieteKolumny = kolumnyEksportu(this.wynik.rekordy).pominiete;
  readonly dataAktualizacji = DATA_AKTUALIZACJI;
  readonly miejscowosci = [
    ...new Set(this.wynik.rekordy.map((r) => r.miejscowosc).filter((m): m is string => !!m)),
  ].sort((a, b) => a.localeCompare(b, 'pl'));
  readonly dostawcy = this.wynik.raporty.map((r) => ({ id: r.zrodlo.id, nazwa: r.zrodlo.dostawca }));

  // Filtry i wyszukiwanie
  readonly szukaj = signal('');
  readonly miejscowosc = signal('');
  readonly dostep = signal('');
  readonly tylkoTeraz = signal(false);
  readonly wewnatrz = signal<TakNie>('');
  readonly dostawca = signal('');
  readonly mapaNaTelefonie = signal(false);
  readonly komunikat = signal('');

  /** Czas liczymy dopiero w przeglądarce, żeby render serwerowy i kliencki dały to samo. */
  readonly teraz = signal<Date | null>(null);
  private readonly wPrzegladarce = isPlatformBrowser(inject(PLATFORM_ID));

  readonly wyniki = computed(() => {
    const q = this.normalizuj(this.szukaj());
    const teraz = this.teraz();
    return this.wynik.rekordy.filter((r) => {
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
  });

  readonly bezGodzin = this.wynik.rekordy.filter((r) => !r.godziny_dostepnosci).length;

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
    this.komunikat.set('Wyczyszczono filtry.');
  }

  pobierz(format: 'csv' | 'json' | 'geojson'): void {
    const r = this.wynik.rekordy;
    const nazwa = `defibrylatory-aed-zbior-zintegrowany.${format}`;
    if (format === 'csv') pobierzPlik(doCsv(r), nazwa, 'text/csv;charset=utf-8');
    else if (format === 'json') pobierzPlik(doJson(r), nazwa, 'application/json');
    else pobierzPlik(doGeoJson(r), nazwa, 'application/geo+json');
    this.komunikat.set(`Pobrano plik ${nazwa} (${r.length} rekordów).`);
  }
}
