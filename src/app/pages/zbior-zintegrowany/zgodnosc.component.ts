/**
 * HackNation 2026 – Misja AED. Plik dodany do forka portalu dane.gov.pl (GPL-3.0), 2026-11-21.
 * Strona „Sprawdź zgodność ze wzorcem” dla dostawców danych o AED.
 */

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { SeoService } from '@app/services/seo.service';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LocalizeRouterPipe } from '@gilsdav/ngx-translate-router';
import { FileUploadComponent } from '@app/shared/forms/components/file-upload/file-upload.component';
import { InfoTooltipDirective } from '@app/shared/info-tooltip/info-tooltip.directive';
import { CSV_PRZYKLAD_Z_BLEDAMI } from './dane/przyklad-z-bledami';
import { BladCsv, wierszeJakoObiekty, wykryjSeparator } from './lib/csv';
import { doCsv, doJson, kolumnyEksportu, pobierzPlik } from './lib/eksport';
import { ETYKIETY, POLA_WYMAGANE } from './lib/model';
import type { PoleRekordu } from './lib/model';
import { czyPoprawioneAutomatycznie, jakPoprawic } from './lib/porady';
import { BladXlsx, czytajXlsx } from './lib/xlsx';
import { liczbaKolumnSzablonu, sprawdzZgodnosc } from './lib/zgodnosc';

interface Plik {
  nazwa: string;
  separator: string;
  naglowki: string[];
  wiersze: Record<string, string>[];
}

/** Kroki narzędzia (lista kroków u góry strony). */
const KROKI = [
  { id: 'zg-krok-1', nazwa: 'Wybierz plik' },
  { id: 'zg-krok-2', nazwa: 'Przeczytaj raport' },
  { id: 'zg-krok-3', nazwa: 'Pobierz poprawiony plik' },
] as const;

@Component({
  selector: 'app-zgodnosc',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Treść stron jest po polsku także w wersji EN portalu (WCAG 3.1.2).
  host: { lang: 'pl' },
  imports: [FormsModule, RouterLink, LocalizeRouterPipe, FileUploadComponent, InfoTooltipDirective],
  templateUrl: './zgodnosc.component.html',
  // Wspólny arkusz formularzy portalu + nasze style (tabele, status, przyciski).
  styleUrls: ['../../shared/forms/forms.scss', './zbior-zintegrowany.component.scss'],
})
export class ZgodnoscComponent {
  readonly etykiety = ETYKIETY;

  constructor() {
    // Tytuł strony jak w portalu: „Tytuł - Otwarte Dane” (WCAG 2.4.2).
    inject(SeoService).setPageTitle('Sprawdź zgodność ze wzorcem AED');
  }

  readonly kroki = KROKI;
  readonly plik = signal<Plik | null>(null);
  /** Wartość pola pliku portalu (app-file-upload). */
  readonly wybranePliki = signal<File[]>([]);
  readonly pobrano = signal(false);
  readonly polaWymagane = POLA_WYMAGANE;
  readonly blad = signal('');
  /** Komunikat po wczytaniu pliku (pod polem pliku) i po pobraniu pliku wynikowego (w kroku 2.4). */
  readonly komunikat = signal<{ tekst: string; typ: 'success' | 'danger' } | null>(null);
  readonly komunikatPobierania = signal('');

  readonly raport = computed(() => {
    const p = this.plik();
    if (!p) return null;
    return sprawdzZgodnosc(p.naglowki, p.wiersze);
  });

  /** Bieżący krok: 1 bez pliku, 2 po wczytaniu (raport), 3 po pobraniu. */
  readonly biezacyKrok = computed(() => (!this.plik() ? 1 : this.pobrano() ? 3 : 2));

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
    const doPoprawy =
      this.grupyProblemow().doPoprawy.length + r.odrzucone.length + r.staleKolumny.length + r.kolumnySpoza.length;
    if (r.kolumnyZgodne.length === 0)
      return {
        poziom: 'danger' as const,
        ikona: '✕',
        tekst: 'Plik nie jest w układzie szablonu AED Sync: żadna kolumna nie ma nazwy z szablonu.',
        opis: 'Przepisz dane do pustego szablonu (krok 1) albo zmień nazwy kolumn według podpowiedzi niżej.',
      };
    if (braki > 0)
      return {
        poziom: 'danger' as const,
        ikona: '✕',
        tekst: `Plik wymaga uzupełnienia: brakuje ${braki} z ${POLA_WYMAGANE.length} pól obowiązkowych.`,
        opis: 'Możesz już pobrać plik w układzie szablonu, ale przed publikacją uzupełnij brakujące pola w swoich danych.',
      };
    if (doPoprawy > 0)
      return {
        poziom: 'warning' as const,
        ikona: '!',
        tekst: 'Plik można opublikować, ale warto go poprawić.',
        opis: 'Wszystkie pola obowiązkowe są w pliku. Niektóre wartości mają zły format, wiersze zostaną pominięte albo kolumny są spoza szablonu.',
      };
    return {
      poziom: 'success' as const,
      ikona: '✓',
      tekst: 'Plik jest zgodny z szablonem.',
      opis: 'Pobierz plik w kroku 2.3 i opublikuj go jako zasób swojego zbioru na dane.gov.pl.',
    };
  });

  readonly porada = jakPoprawic;

  readonly pominiete = computed(() => {
    const r = this.raport();
    return r ? kolumnyEksportu(r.rekordy).pominiete : [];
  });

  /** Plik CSV: kodowanie, separator i wiersze. */
  private wczytaj(nazwa: string, tekst: string): void {
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
      this.ustawPlik({ nazwa, separator, naglowki, wiersze });
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
        .map((a) => ({ a, dopasowane: liczbaKolumnSzablonu(a.naglowki) }))
        .filter((x) => x.dopasowane >= 3);
      const zDanymi = arkusze.filter((x) => x.a.wiersze.length > 0);
      const wybor = [...(zDanymi.length ? zDanymi : arkusze)].sort(
        (x, y) => y.a.wiersze.length - x.a.wiersze.length || y.dopasowane - x.dopasowane,
      )[0];
      if (!wybor)
        throw new BladXlsx(
          'W pliku nie ma arkusza z nagłówkami szablonu. Wpisz dane do arkusza „DANE PL” albo „DATA EN” szablonu AED Sync.',
        );
      const { a } = wybor;
      this.ustawPlik(
        { nazwa: `${f.name} (arkusz „${a.nazwa}”)`, separator: '', naglowki: a.naglowki, wiersze: a.wiersze },
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

  private ustawPlik(p: Plik, uwaga = ''): void {
    if (p.wiersze.length === 0) {
      this.bladWczytania('Plik ma tylko nagłówek, bez danych.');
      return;
    }
    this.plik.set(p);
    this.pobrano.set(false);
    this.komunikatPobierania.set('');
    this.blad.set('');
    this.komunikat.set({
      tekst: `Wczytano plik ${p.nazwa}: ${p.wiersze.length} wierszy, ${p.naglowki.length} kolumn.${uwaga} Raport jest w kroku 2.2.`,
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
    else this.wczytaj(f.name, await f.text());
  }

  uzyjPrzykladu(): void {
    this.wczytaj('przyklad-gmina-przykladowo.csv (dane fikcyjne)', CSV_PRZYKLAD_Z_BLEDAMI);
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
    const nazwa = `moj-zbior-aed-sync-v15.${format}`;
    if (format === 'csv') pobierzPlik(doCsv(r.rekordy), nazwa, 'text/csv;charset=utf-8');
    else pobierzPlik(doJson(r.rekordy), nazwa, 'application/json');
    this.pobrano.set(true);
    this.komunikatPobierania.set(`Pobrano plik ${nazwa} (rekordy: ${r.rekordy.length}). Zobacz „Co dalej” poniżej.`);
  }
}
