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
import { ETYKIETY, KOLUMNY } from './lib/model';
import type { PoleRekordu } from './lib/model';
import { OPIS_CELU, sprawdzZgodnosc, zaproponujMapowanie } from './lib/zgodnosc';
import type { Cel } from './lib/zgodnosc';

interface Plik {
  nazwa: string;
  separator: string;
  naglowki: string[];
  wiersze: Record<string, string>[];
}

@Component({
  selector: 'app-zgodnosc',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, LocalizeRouterPipe],
  templateUrl: './zgodnosc.component.html',
  styleUrl: './zbior-zintegrowany.component.scss',
})
export class ZgodnoscComponent {
  readonly etykiety = ETYKIETY;
  readonly opcje: { wartosc: Cel; etykieta: string }[] = [
    { wartosc: '', etykieta: OPIS_CELU[''] },
    { wartosc: 'ADRES', etykieta: OPIS_CELU.ADRES },
    { wartosc: 'CECHA_ULICY', etykieta: OPIS_CELU.CECHA_ULICY },
    { wartosc: 'GEOMETRIA', etykieta: OPIS_CELU.GEOMETRIA },
    ...KOLUMNY.filter((k) => k !== 'zrodlo_danych' && k !== 'data_aktualizacji').map((k) => ({
      wartosc: k as Cel,
      etykieta: `${k} – ${ETYKIETY[k]}`,
    })),
  ];

  readonly plik = signal<Plik | null>(null);
  readonly mapowanie = signal<Cel[]>([]);
  readonly identyfikator = signal('moj-zbior-aed');
  readonly blad = signal('');
  readonly komunikat = signal('');

  readonly raport = computed(() => {
    const p = this.plik();
    if (!p) return null;
    const dzis = new Date().toISOString().slice(0, 10);
    return sprawdzZgodnosc(
      p.naglowki,
      p.wiersze,
      this.mapowanie(),
      this.identyfikator().trim() || 'moj-zbior-aed',
      dzis,
    );
  });

  readonly pominiete = computed(() => {
    const r = this.raport();
    return r ? kolumnyEksportu(r.rekordy).pominiete : [];
  });

  private wczytaj(nazwa: string, tekst: string): void {
    try {
      const separator = wykryjSeparator(tekst);
      const { naglowki, wiersze } = wierszeJakoObiekty(tekst, separator);
      if (naglowki.length < 2)
        throw new BladCsv(
          'Plik ma tylko jedną kolumnę. Najczęściej cały wiersz jest ujęty w cudzysłów albo separator jest inny niż przecinek lub średnik.',
        );
      if (wiersze.length === 0) throw new BladCsv('Plik ma tylko nagłówek, bez danych.');
      this.plik.set({ nazwa, separator, naglowki, wiersze });
      this.mapowanie.set(zaproponujMapowanie(naglowki, wiersze));
      this.blad.set('');
      this.komunikat.set(
        `Wczytano plik ${nazwa}: ${wiersze.length} wierszy, ${naglowki.length} kolumn. Zaproponowano mapowanie kolumn.`,
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
    if (f.size > 2 * 1024 * 1024) {
      this.blad.set('Plik jest większy niż 2 MB.');
      this.komunikat.set('Nie wczytano pliku. Plik jest większy niż 2 MB.');
      return;
    }
    this.wczytaj(f.name, await f.text());
  }

  uzyjPrzykladu(): void {
    this.wczytaj('Defibrylator_jAmxQcp.csv (Urząd Miasta Krosna, CC0 1.0)', CSV_KROSNO);
  }

  zmienMapowanie(i: number, cel: Cel): void {
    this.mapowanie.update((m) => m.map((x, j) => (j === i ? cel : x)));
  }

  etykietaPola(p: PoleRekordu): string {
    return ETYKIETY[p];
  }

  pobierz(format: 'csv' | 'json'): void {
    const r = this.raport();
    if (!r) return;
    const nazwa = `${this.identyfikator().trim() || 'moj-zbior-aed'}-wzorzec-v1-1.${format}`;
    if (format === 'csv') pobierzPlik(doCsv(r.rekordy), nazwa, 'text/csv;charset=utf-8');
    else pobierzPlik(doJson(r.rekordy), nazwa, 'application/json');
    this.komunikat.set(`Pobrano plik ${nazwa} (${r.rekordy.length} rekordów).`);
  }
}
