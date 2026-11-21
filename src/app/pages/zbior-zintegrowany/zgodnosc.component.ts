/**
 * HackNation 2026 – Misja AED. Plik dodany do forka portalu dane.gov.pl (GPL-3.0), 2026-11-21.
 * Strona „Sprawdź zgodność ze wzorcem” dla dostawców danych o AED.
 */

import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LocalizeRouterPipe } from '@gilsdav/ngx-translate-router';
import { CSV_KROSNO } from './dane/krosno';
import { BladCsv, wierszeJakoObiekty, wykryjSeparator } from './lib/csv';
import { doCsv, doJson, kolumnyEksportu, pobierzPlik } from './lib/eksport';
import { ETYKIETY, KOLUMNY, POLA_WYMAGANE } from './lib/model';
import { doDatyCzasuWzorca } from './lib/wiek-danych';
import { ZRODLA } from './lib/zrodla';
import type { PoleRekordu } from './lib/model';
import { czyPoprawioneAutomatycznie, jakPoprawic } from './lib/porady';
import { OPIS_CELU, sprawdzZgodnosc, zaproponujMapowanie } from './lib/zgodnosc';
import type { Cel } from './lib/zgodnosc';

interface Plik {
  nazwa: string;
  separator: string;
  naglowki: string[];
  wiersze: Record<string, string>[];
}

interface Opcja {
  wartosc: Cel;
  etykieta: string;
}

const polaDostawcy = KOLUMNY.filter((k) => k !== 'zrodlo_danych' && k !== 'data_aktualizacji');
const opcjaPola = (k: PoleRekordu): Opcja => ({ wartosc: k as Cel, etykieta: `${k} – ${ETYKIETY[k]}` });

/** Kroki narzędzia (lista kroków u góry strony, USWDS Step indicator / DS Gov.pl Stepper). */
const KROKI = [
  { id: 'zg-krok-1', nazwa: 'Wybierz plik' },
  { id: 'zg-krok-2', nazwa: 'Sprawdź dopasowanie kolumn' },
  { id: 'zg-krok-3', nazwa: 'Przeczytaj raport' },
  { id: 'zg-krok-4', nazwa: 'Pobierz plik zgodny ze wzorcem' },
] as const;

@Component({
  selector: 'app-zgodnosc',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Treść stron jest po polsku także w wersji EN portalu (WCAG 3.1.2).
  host: { lang: 'pl' },
  imports: [FormsModule, RouterLink, LocalizeRouterPipe],
  templateUrl: './zgodnosc.component.html',
  // Wspólny arkusz formularzy portalu + nasze style (tabele, status, przyciski).
  styleUrls: ['../../shared/forms/forms.scss', './zbior-zintegrowany.component.scss'],
})
export class ZgodnoscComponent {
  readonly etykiety = ETYKIETY;
  readonly kroki = KROKI;
  readonly pominOpcja: Opcja = { wartosc: '', etykieta: 'Pomiń tę kolumnę' };
  /** Opcje pola wzorca w grupach (optgroup): najpierw pola wymagane. */
  readonly grupyOpcji: { etykieta: string; opcje: Opcja[] }[] = [
    { etykieta: 'Pola wymagane', opcje: polaDostawcy.filter((k) => POLA_WYMAGANE.includes(k)).map(opcjaPola) },
    { etykieta: 'Pozostałe pola wzorca', opcje: polaDostawcy.filter((k) => !POLA_WYMAGANE.includes(k)).map(opcjaPola) },
    {
      etykieta: 'Kolumny do rozbicia lub połączenia',
      opcje: (['ADRES', 'CECHA_ULICY', 'GEOMETRIA'] as const).map((c) => ({ wartosc: c, etykieta: OPIS_CELU[c] })),
    },
  ];

  readonly plik = signal<Plik | null>(null);
  readonly mapowanie = signal<Cel[]>([]);
  /** Propozycja narzędzia – do oznaczenia „dopasowano automatycznie” / „wybrano ręcznie”. */
  readonly propozycja = signal<Cel[]>([]);
  readonly pobrano = signal(false);
  readonly identyfikator = signal('moj-zbior-aed');
  readonly polaWymagane = POLA_WYMAGANE;
  /** Data i godzina ostatniej zmiany pliku – trafia do data_aktualizacji (nie dzisiejsza data). */
  readonly dataPliku = signal('');
  readonly blad = signal('');
  readonly komunikat = signal('');

  readonly raport = computed(() => {
    const p = this.plik();
    if (!p) return null;
    return sprawdzZgodnosc(
      p.naglowki,
      p.wiersze,
      this.mapowanie(),
      this.identyfikator().trim() || 'moj-zbior-aed',
      this.dataPliku(),
    );
  });

  /** Bieżący krok: 1 bez pliku, 2 po wczytaniu (sprawdź mapowanie i raport), 4 po pobraniu. */
  readonly biezacyKrok = computed(() => (!this.plik() ? 1 : this.pobrano() ? 4 : 2));

  readonly dopasowane = computed(() => this.mapowanie().filter((c) => c !== '').length);

  /** Problemy podzielone na „Warto poprawić” i „Poprawione automatycznie”, z poradą „Jak poprawić”. */
  readonly grupyProblemow = computed(() => {
    const r = this.raport();
    const z = (r?.problemy ?? []).map((p) => ({ ...p, porada: jakPoprawic(p.opis) }));
    return {
      doPoprawy: z.filter((p) => !czyPoprawioneAutomatycznie(p.opis)),
      automatycznie: z.filter((p) => czyPoprawioneAutomatycznie(p.opis)),
    };
  });

  /** Werdykt na początku raportu: jedno zdanie, poziom i ikona (tekst + ikona, nie sam kolor – WCAG 1.4.1). */
  readonly werdykt = computed(() => {
    const r = this.raport();
    if (!r) return null;
    const braki = r.brakujaceWymagane.length;
    const doPoprawy = this.grupyProblemow().doPoprawy.length + r.odrzucone.length + r.staleKolumny.length;
    if (braki > 0)
      return {
        poziom: 'danger' as const,
        ikona: '✕',
        tekst: `Plik wymaga uzupełnienia: brakuje ${braki} z ${POLA_WYMAGANE.length} pól wymaganych.`,
        opis: 'Możesz już pobrać plik w układzie wzorca, ale przed publikacją uzupełnij brakujące pola w swoich danych.',
      };
    if (doPoprawy > 0)
      return {
        poziom: 'warning' as const,
        ikona: '!',
        tekst: 'Plik można opublikować, ale warto go poprawić.',
        opis: 'Wszystkie pola wymagane są w pliku. Niektóre wartości mają zły format albo wiersze zostaną pominięte.',
      };
    return {
      poziom: 'success' as const,
      ikona: '✓',
      tekst: 'Plik jest zgodny ze wzorcem.',
      opis: 'Pobierz plik w kroku 4 i opublikuj go jako zasób swojego zbioru na dane.gov.pl.',
    };
  });

  readonly porada = jakPoprawic;

  readonly pominiete = computed(() => {
    const r = this.raport();
    return r ? kolumnyEksportu(r.rekordy).pominiete : [];
  });

  private wczytaj(nazwa: string, tekst: string, zmodyfikowano: string): void {
    try {
      // Plik zapisany np. w Windows-1250 daje po odczycie jako UTF-8 znaki zastępcze „�”.
      if (tekst.includes('\uFFFD'))
        throw new BladCsv('Plik nie jest zapisany w kodowaniu UTF-8. Zapisz go jako „CSV UTF-8” i wgraj ponownie.');
      this.dataPliku.set(doDatyCzasuWzorca(zmodyfikowano));
      const separator = wykryjSeparator(tekst);
      const { naglowki, wiersze } = wierszeJakoObiekty(tekst, separator);
      if (naglowki.length < 2)
        throw new BladCsv(
          'Plik ma tylko jedną kolumnę. Najczęściej cały wiersz jest ujęty w cudzysłów albo separator jest inny niż przecinek lub średnik.',
        );
      if (wiersze.length === 0) throw new BladCsv('Plik ma tylko nagłówek, bez danych.');
      this.plik.set({ nazwa, separator, naglowki, wiersze });
      const propozycja = zaproponujMapowanie(naglowki, wiersze);
      this.mapowanie.set(propozycja);
      this.propozycja.set(propozycja);
      this.pobrano.set(false);
      this.blad.set('');
      this.komunikat.set(
        `Wczytano plik ${nazwa}: ${wiersze.length} wierszy, ${naglowki.length} kolumn. Sprawdź dopasowanie kolumn w kroku 2.`,
      );
    } catch (e) {
      this.plik.set(null);
      const tresc =
        e instanceof BladCsv ? e.message : 'Nie udało się odczytać pliku. Zapisz go jako CSV w kodowaniu UTF-8.';
      this.blad.set(tresc);
      this.komunikat.set(`Nie wczytano pliku. ${tresc}`);
    }
  }

  async naPlik(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const f = input.files?.[0];
    if (!f) return;
    // Komunikaty jak w GOV.UK File upload: co jest nie tak z wybranym plikiem i jak to naprawić.
    const blad = !/\.csv$/i.test(f.name)
      ? 'Wybrany plik musi być w formacie CSV. Zapisz arkusz jako „CSV UTF-8 (rozdzielany przecinkami)”.'
      : f.size === 0
        ? 'Wybrany plik jest pusty.'
        : f.size > 2 * 1024 * 1024
          ? 'Wybrany plik musi być mniejszy niż 2 MB.'
          : '';
    if (blad) {
      this.plik.set(null);
      this.blad.set(blad);
      this.komunikat.set(`Nie wczytano pliku. ${blad}`);
      return;
    }
    this.wczytaj(f.name, await f.text(), new Date(f.lastModified).toISOString());
  }

  uzyjPrzykladu(): void {
    const krosno = ZRODLA.find((z) => z.id === 'krosno');
    this.wczytaj(
      'Defibrylator_jAmxQcp.csv (Urząd Miasta Krosna, CC0 1.0)',
      CSV_KROSNO,
      krosno?.zmodyfikowano ?? new Date().toISOString(),
    );
  }

  zmienMapowanie(i: number, cel: Cel): void {
    this.mapowanie.update((m) => m.map((x, j) => (j === i ? cel : x)));
  }

  stanMapowania(i: number): string {
    const m = this.mapowanie()[i];
    if (m === '') return 'Pominięta';
    return m === this.propozycja()[i] ? 'Dopasowano automatycznie' : 'Wybrano ręcznie';
  }

  /** Przejście do kroku z listy kroków – ręcznie, bo <base href="/"> psuje zwykłe kotwice. */
  przejdzDo(event: Event, id: string): void {
    event.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ block: 'start' });
    el.focus({ preventScroll: true });
  }

  etykietaPola(p: PoleRekordu): string {
    return ETYKIETY[p];
  }

  pobierz(format: 'csv' | 'json'): void {
    const r = this.raport();
    if (!r) return;
    const nazwa = `${this.identyfikator().trim() || 'moj-zbior-aed'}-wzorzec-v1-2.${format}`;
    if (format === 'csv') pobierzPlik(doCsv(r.rekordy), nazwa, 'text/csv;charset=utf-8');
    else pobierzPlik(doJson(r.rekordy), nazwa, 'application/json');
    this.pobrano.set(true);
    this.komunikat.set(`Pobrano plik ${nazwa} (${r.rekordy.length} rekordów). Zobacz „Co dalej” poniżej.`);
  }
}
