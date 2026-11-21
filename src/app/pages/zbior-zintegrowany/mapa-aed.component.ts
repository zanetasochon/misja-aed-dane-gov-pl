/**
 * HackNation 2026 – Misja AED. Plik dodany do forka portalu dane.gov.pl (GPL-3.0), 2026-11-21.
 *
 * Mapa AED (Leaflet, podkład OpenStreetMap). Dostępność:
 * - lista obok jest pełnym tekstowym odpowiednikiem mapy (WCAG 1.1.1) – link „Przejdź do listy”;
 * - znaczniki 28×28 px (2.5.8), dostępne z klawiatury (Tab, Enter otwiera opis);
 * - przyciski przesuwania i powiększania jako alternatywa dla przeciągania (2.5.7);
 * - kontener mapy ma etykietę; strzałki przesuwają mapę, gdy ma fokus.
 */

import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
  afterNextRender,
  effect,
  inject,
  input,
} from '@angular/core';
import type * as Leaflet from 'leaflet';
import type { RekordZintegrowany } from './lib/harmonizacja';

@Component({
  selector: 'app-mapa-aed',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mapa-aed">
      <p class="mapa-aed__opis" id="mapa-aed-opis">
        Mapa pokazuje {{ rekordy().length }} AED z listy. Ten sam zestaw jest w tabeli –
        <a href="#lista-aed">przejdź do listy</a>. Przesuwaj mapę strzałkami, gdy ma fokus, albo przyciskami.
      </p>
      <div class="mapa-aed__przyciski" role="group" aria-label="Sterowanie mapą">
        <button type="button" class="btn btn-sm btn-outline-primary" (click)="przesun(0, -1)">Przesuń w górę</button>
        <button type="button" class="btn btn-sm btn-outline-primary" (click)="przesun(0, 1)">Przesuń w dół</button>
        <button type="button" class="btn btn-sm btn-outline-primary" (click)="przesun(-1, 0)">Przesuń w lewo</button>
        <button type="button" class="btn btn-sm btn-outline-primary" (click)="przesun(1, 0)">Przesuń w prawo</button>
        <button type="button" class="btn btn-sm btn-outline-primary" (click)="powieksz(1)">Przybliż</button>
        <button type="button" class="btn btn-sm btn-outline-primary" (click)="powieksz(-1)">Oddal</button>
        <button type="button" class="btn btn-sm btn-outline-primary" (click)="dopasuj()">Pokaż wszystkie AED</button>
      </div>
      <div
        #kontener
        class="mapa-aed__kontener"
        role="region"
        aria-label="Mapa defibrylatorów AED"
        aria-describedby="mapa-aed-opis"></div>
    </div>
  `,
  styleUrl: './zbior-zintegrowany.component.scss',
})
export class MapaAedComponent implements OnDestroy {
  rekordy = input.required<RekordZintegrowany[]>();
  /** Lokalizacja użytkownika („W pobliżu”) – punkt i okrąg promienia na mapie. */
  lokalizacja = input<{ szer: number; dlug: number; opis: string } | null>(null);
  promienM = input<number | null>(null);

  @ViewChild('kontener', { static: true }) kontener!: ElementRef<HTMLDivElement>;

  private L: typeof Leaflet | null = null;
  private mapa: Leaflet.Map | null = null;
  private warstwa: Leaflet.LayerGroup | null = null;
  private readonly wPrzegladarce = isPlatformBrowser(inject(PLATFORM_ID));

  constructor() {
    afterNextRender(async () => {
      if (!this.wPrzegladarce) return;
      // Leaflet to moduł UMD/CommonJS – po imporcie dynamicznym obiekt bywa pod `default`.
      const mod = (await import('leaflet')) as typeof Leaflet & { default?: typeof Leaflet };
      this.L = mod.default ?? mod;
      const L = this.L;
      this.mapa = L.map(this.kontener.nativeElement, { keyboard: true, zoomControl: false });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
      }).addTo(this.mapa);
      this.warstwa = L.layerGroup().addTo(this.mapa);
      this.rysuj();
    });
    effect(() => {
      this.rekordy();
      this.lokalizacja();
      this.promienM();
      this.rysuj();
    });
  }

  private rysuj(): void {
    const L = this.L;
    if (!L || !this.mapa || !this.warstwa) return;
    this.warstwa.clearLayers();
    const ikona = L.divIcon({
      className: 'znacznik-aed',
      html: '<span aria-hidden="true">AED</span>',
      iconSize: [28, 28],
    });
    const ikonaFikcyjna = L.divIcon({
      className: 'znacznik-aed znacznik-aed--fikcyjny',
      html: '<span aria-hidden="true">DEMO</span>',
      iconSize: [28, 28],
    });
    for (const r of this.rekordy()) {
      const adres = [r.ulica, r.numer_budynku, r.miejscowosc].filter(Boolean).join(' ');
      const etykieta = `${r.fikcyjne ? 'DANE FIKCYJNE – ' : ''}AED: ${r.nazwa_miejsca}${adres ? ', ' + adres : ''}`;
      const m = L.marker([r.szerokosc_geograficzna, r.dlugosc_geograficzna], {
        icon: r.fikcyjne ? ikonaFikcyjna : ikona,
        keyboard: true,
        title: etykieta,
      })
        .bindPopup(this.opisPopup(r))
        .addTo(this.warstwa);
      m.on('add', () => m.getElement()?.setAttribute('aria-label', etykieta));
      m.getElement()?.setAttribute('aria-label', etykieta);
    }
    const lok = this.lokalizacja();
    if (lok) {
      const promien = this.promienM();
      if (promien)
        L.circle([lok.szer, lok.dlug], { radius: promien, color: '#0865c9', weight: 2, fillOpacity: 0.08 }).addTo(
          this.warstwa,
        );
      L.circleMarker([lok.szer, lok.dlug], {
        radius: 9,
        color: '#ffffff',
        weight: 3,
        fillColor: '#0865c9',
        fillOpacity: 1,
      })
        .bindTooltip(lok.opis)
        .addTo(this.warstwa);
    }
    this.dopasuj();
  }

  private opisPopup(r: RekordZintegrowany): HTMLElement {
    // Budujemy DOM, a nie HTML z napisów – dane ze źródeł nie są interpretowane jako kod.
    const div = document.createElement('div');
    const h = document.createElement('strong');
    h.textContent = r.nazwa_miejsca;
    div.append(h);
    const linie = [
      [r.ulica, r.numer_budynku].filter(Boolean).join(' '),
      [r.kod_pocztowy, r.miejscowosc].filter(Boolean).join(' '),
      r.opis_lokalizacji ?? '',
      `Godziny: ${r.godziny_dostepnosci ?? 'brak danych w źródle'}`,
    ].filter(Boolean);
    for (const l of linie) {
      const p = document.createElement('div');
      p.textContent = l;
      div.append(p);
    }
    // Źródło z linkiem do zbioru na dane.gov.pl – kto odpowiada za ten rekord.
    const zrodlo = document.createElement('div');
    zrodlo.append('Źródło: ');
    if (r.adresZbioruZrodla) {
      const a = document.createElement('a');
      a.href = r.adresZbioruZrodla;
      a.textContent = r.dostawcaZrodla;
      zrodlo.append(a);
    } else zrodlo.append(r.dostawcaZrodla);
    zrodlo.append(`, dane z ${r.dataDanychZrodla}`);
    div.append(zrodlo);
    if (r.atrybucjaZrodla) {
      const at = document.createElement('div');
      at.textContent = r.atrybucjaZrodla;
      div.append(at);
    }
    if (r.fikcyjne) {
      const f = document.createElement('strong');
      f.textContent = 'DANE FIKCYJNE – nie wskazują prawdziwego AED.';
      div.prepend(f);
    }
    return div;
  }

  przesun(dx: number, dy: number): void {
    this.mapa?.panBy([dx * 150, dy * 150]);
  }

  powieksz(o: number): void {
    if (this.mapa) this.mapa.setZoom(this.mapa.getZoom() + o);
  }

  dopasuj(): void {
    const L = this.L;
    const r = this.rekordy();
    if (!L || !this.mapa) return;
    const lok = this.lokalizacja();
    const promien = this.promienM();
    if (lok && promien) {
      // Widok obejmuje okrąg promienia wokół użytkownika.
      this.mapa.fitBounds(L.latLng(lok.szer, lok.dlug).toBounds(promien * 2), { padding: [24, 24] });
      return;
    }
    if (r.length === 0) this.mapa.setView([52.0, 19.4], 6);
    else
      this.mapa.fitBounds(L.latLngBounds(r.map((x) => [x.szerokosc_geograficzna, x.dlugosc_geograficzna])), {
        padding: [24, 24],
        maxZoom: 15,
      });
  }

  ngOnDestroy(): void {
    this.mapa?.remove();
  }
}
