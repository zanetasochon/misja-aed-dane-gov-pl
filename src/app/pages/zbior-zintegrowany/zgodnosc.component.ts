/**
 * HackNation 2026 – Misja AED. Plik dodany do forka portalu dane.gov.pl (GPL-3.0), 2026-11-21.
 * Strona „Sprawdź zgodność ze wzorcem” dla dostawców danych o AED.
 */

import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LocalizeRouterPipe } from '@gilsdav/ngx-translate-router';
import { FileUploadComponent } from '@app/shared/forms/components/file-upload/file-upload.component';
import { CSV_KROSNO } from './dane/krosno';
import { BladCsv, wierszeJakoObiekty, wykryjSeparator } from './lib/csv';
import { doCsv, doJson, kolumnyEksportu, pobierzPlik } from './lib/eksport';
import { ETYKIETY, KOLUMNY, POLA_WYMAGANE } from './lib/model';
import { doDatyCzasuWzorca } from './lib/wiek-danych';
import { ZRODLA } from './lib/zrodla';
import type { PoleRekordu } from './lib/model';
import { czyPoprawioneAutomatycznie, jakPoprawic } from './lib/porady';
import { BladXlsx, czytajXlsx } from './lib/xlsx';
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

/** Kroki narzędzia (lista kroków u góry strony). */
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
  imports: [FormsModule, RouterLink, LocalizeRouterPipe, FileUploadComponent],
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
      opcje: (['ADRES', 'CECHA_ULICY', 'GEOMETRIA'] as const).map((c) => ({
        wartosc: c,
        etykieta: OPIS_CELU[c],
      })),
    },
  ];

  readonly plik = signal<Plik | null>(null);
  /** Wartość pola pliku portalu (app-file-upload). */
  readonly wybranePliki = signal<File[]>([]);
  readonly mapowanie = signal<Cel[]>([]);
  /** Propozycja narzędzia – do oznaczenia „dopasowano automatycznie” / „wybrano ręcznie”. */
  readonly propozycja = signal<Cel[]>([]);
  readonly pobrano = signal(false);
  readonly identyfikator = signal('moj-zbior-aed');
  readonly polaWymagane = POLA_WYMAGANE;
  /** Data i godzina ostatniej zmiany pliku – trafia do data_aktualizacji (nie dzisiejsza data). */
  readonly dataPliku = signal('');
  readonly blad = signal('');
  /** Komunikat po wczytaniu pliku (pod polem pliku) i po pobraniu pliku wynikowego (w kroku 2.4). */
  readonly komunikat = signal<{ tekst: string; typ: 'success' | 'danger' } | null>(null);
  readonly komunikatPobierania = signal('');

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

  /** Werdykt na początku raportu: jedno zdanie, poziom i ikona. */
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

  /** Plik CSV: kodowanie, separator i wiersze. */
  private wczytaj(nazwa: string, tekst: string, zmodyfikowano: string): void {
    try {
      // Plik zapisany np. w Windows-1250 daje po odczycie jako UTF-8 znaki zastępcze „�”.
      if (tekst.includes('\uFFFD'))
        throw new BladCsv('Plik nie jest zapisany w kodowaniu UTF-8. Zapisz go jako „CSV UTF-8” i wgraj ponownie.');
      const separator = wykryjSeparator(tekst);
      const { naglowki, wiersze } = wierszeJakoObiekty(tekst, separator);
      if (naglowki.length < 2)
        throw new BladCsv(
          'Plik ma tylko jedną kolumnę. Najczęściej cały wiersz jest ujęty w cudzysłów albo separator jest inny niż przecinek lub średnik.',
        );
      this.ustawPlik({ nazwa, separator, naglowki, wiersze }, zmodyfikowano);
    } catch (e) {
      this.bladWczytania(
        e instanceof BladCsv ? e.message : 'Nie udało się odczytać pliku. Zapisz go jako CSV w kodowaniu UTF-8.',
      );
    }
  }

  /**
   * Plik XLSX: arkusz z danymi to ten, którego nagłówki najlepiej pasują do wzorca
   * (w szablonie „Dane PL” albo „Data EN”; arkusz „Jak wypełnić” odpada).
   */
  private async wczytajXlsx(f: File): Promise<void> {
    try {
      const arkusze = (await czytajXlsx(await f.arrayBuffer()))
        .map((a) => ({ a, dopasowane: zaproponujMapowanie(a.naglowki, a.wiersze).filter(Boolean).length }))
        .filter((x) => x.dopasowane >= 3);
      const zDanymi = arkusze.filter((x) => x.a.wiersze.length > 0);
      const wybor = [...(zDanymi.length ? zDanymi : arkusze)].sort(
        (x, y) => y.a.wiersze.length - x.a.wiersze.length || y.dopasowane - x.dopasowane,
      )[0];
      if (!wybor)
        throw new BladXlsx(
          'W pliku nie ma arkusza z nagłówkami wzorca. Wpisz dane do arkusza „Dane PL” albo „Data EN” z pustego szablonu.',
        );
      const { a } = wybor;
      this.ustawPlik(
        { nazwa: `${f.name} (arkusz „${a.nazwa}”)`, separator: '', naglowki: a.naglowki, wiersze: a.wiersze },
        new Date(f.lastModified).toISOString(),
        zDanymi.length > 1 ? ` Dane są w kilku arkuszach – sprawdzam arkusz „${a.nazwa}” (najwięcej wierszy).` : '',
      );
    } catch (e) {
      this.bladWczytania(
        e instanceof BladXlsx
          ? e.message
          : 'Nie udało się odczytać pliku XLSX. Zapisz go ponownie w Excelu albo jako CSV UTF-8.',
      );
    }
  }

  private ustawPlik(p: Plik, zmodyfikowano: string, uwaga = ''): void {
    if (p.wiersze.length === 0) {
      this.bladWczytania('Plik ma tylko nagłówek, bez danych.');
      return;
    }
    this.dataPliku.set(doDatyCzasuWzorca(zmodyfikowano));
    this.plik.set(p);
    const propozycja = zaproponujMapowanie(p.naglowki, p.wiersze);
    this.mapowanie.set(propozycja);
    this.propozycja.set(propozycja);
    this.pobrano.set(false);
    this.komunikatPobierania.set('');
    this.blad.set('');
    this.komunikat.set({
      tekst: `Wczytano plik ${p.nazwa}: ${p.wiersze.length} wierszy, ${p.naglowki.length} kolumn.${uwaga} Sprawdź dopasowanie kolumn w kroku 2.`,
      typ: 'success',
    });
  }

  private bladWczytania(tresc: string): void {
    this.plik.set(null);
    this.wybranePliki.set([]);
    this.blad.set(tresc);
    this.komunikat.set({ tekst: `Nie wczytano pliku. ${tresc}`, typ: 'danger' });
  }

  /** Zmiana w polu pliku portalu: dodanie albo usunięcie pliku. */
  async naPliki(pliki: File[] | null): Promise<void> {
    const f = pliki?.[0];
    if (!f) {
      this.wybranePliki.set([]);
      this.plik.set(null);
      this.blad.set('');
      this.komunikat.set(null);
      return;
    }
    const blad = !/\.(csv|xlsx)$/i.test(f.name)
      ? 'Wybrany plik musi być w formacie CSV albo XLSX.'
      : f.size === 0
        ? 'Wybrany plik jest pusty.'
        : f.size > 2 * 1024 * 1024
          ? 'Wybrany plik musi być mniejszy niż 2 MB.'
          : '';
    if (blad) {
      // Pole wraca do stanu „Dodaj plik” – komunikaty walidatora portalu mają inne limity (30 MB, 3 pliki).
      this.wybranePliki.set([]);
      this.plik.set(null);
      this.blad.set(blad);
      this.komunikat.set({ tekst: `Nie wczytano pliku. ${blad}`, typ: 'danger' });
      return;
    }
    this.wybranePliki.set([f]);
    if (/\.xlsx$/i.test(f.name)) await this.wczytajXlsx(f);
    else this.wczytaj(f.name, await f.text(), new Date(f.lastModified).toISOString());
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
    const nazwa = `${this.identyfikator().trim() || 'moj-zbior-aed'}-wzorzec-v1-3.${format}`;
    if (format === 'csv') pobierzPlik(doCsv(r.rekordy), nazwa, 'text/csv;charset=utf-8');
    else pobierzPlik(doJson(r.rekordy), nazwa, 'application/json');
    this.pobrano.set(true);
    this.komunikatPobierania.set(`Pobrano plik ${nazwa} (rekordy: ${r.rekordy.length}). Zobacz „Co dalej” poniżej.`);
  }
}
