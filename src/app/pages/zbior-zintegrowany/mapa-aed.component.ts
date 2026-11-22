/**
 * HackNation 2026 – Misja AED. Plik dodany do forka portalu dane.gov.pl (GPL-3.0), 2026-11-21.
 *
 * Mapa AED (Leaflet, podkład OpenStreetMap). Lista AED pod mapą jest jej tekstowym odpowiednikiem.
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
  computed,
  effect,
  inject,
  input,
} from '@angular/core';
import type * as Leaflet from 'leaflet';
import { InfoTooltipDirective } from '@app/shared/info-tooltip/info-tooltip.directive';
import type { RekordZintegrowany } from './lib/integracja';
import { opisGodzin } from './lib/godziny-dni';
import { trasaDoAed } from './lib/trasa';
import { POLA_DNI } from './lib/model';

@Component({
  selector: 'app-mapa-aed',
  standalone: true,
  imports: [InfoTooltipDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mapa-aed">
      <!-- Opis mapy w podpowiedzi „?”; tekstowy odpowiednik mapy to zakładka „Tabela”. -->
      <p class="mapa-aed__opis">
        <span tooltipTitle="Mapa AED" [appInfoTooltip]="opis()" withoutMargin>Mapa ({{ naMapie().length }} AED)</span>
      </p>
      <p class="visually-hidden" id="mapa-aed-opis">{{ opis() }}</p>
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
  /** Lokalizacja użytkownika – punkt i okrąg promienia na mapie. */
  lokalizacja = input<{ szer: number; dlug: number; opis: string } | null>(null);
  promienM = input<number | null>(null);

  /** Współrzędne są opcjonalne (wzorzec v1.3) – na mapie tylko AED, które je mają. */
  readonly naMapie = computed(() =>
    this.rekordy().filter(
      (r): r is RekordZintegrowany & { szerokosc_geograficzna_aed: number; dlugosc_geograficzna_aed: number } =>
        r.szerokosc_geograficzna_aed !== null && r.dlugosc_geograficzna_aed !== null,
    ),
  );
  readonly bezWspolrzednych = computed(() => this.rekordy().length - this.naMapie().length);
  readonly opis = computed(
    () =>
      `Mapa pokazuje ${this.naMapie().length} AED z listy.` +
      (this.bezWspolrzednych() > 0 ? ` ${this.bezWspolrzednych()} AED bez współrzędnych jest tylko na liście.` : '') +
      ' Pełny zestaw jest w zakładce „Tabela”. Przesuwaj mapę strzałkami, gdy ma fokus, albo przyciskami.',
  );

  @ViewChild('kontener', { static: true }) kontener!: ElementRef<HTMLDivElement>;

  private L: typeof Leaflet | null = null;
  private mapa: Leaflet.Map | null = null;
  private warstwa: Leaflet.LayerGroup | null = null;
  private readonly wPrzegladarce = isPlatformBrowser(inject(PLATFORM_ID));
  private obserwatorRozmiaru: ResizeObserver | null = null;

  constructor() {
    afterNextRender(async () => {
      if (!this.wPrzegladarce) return;
      // Leaflet to moduł UMD/CommonJS – po imporcie dynamicznym obiekt bywa pod `default`.
      const mod = (await import('leaflet')) as typeof Leaflet & { default?: typeof Leaflet };
      this.L = mod.default ?? mod;
      const L = this.L;
      this.mapa = L.map(this.kontener.nativeElement, {
        keyboard: true,
        zoomControl: false,
        // Kółko myszy przewija stronę, a nie mapę.
        scrollWheelZoom: false,
      });
      // Polska etykieta przycisku zamknięcia dymka.
      this.mapa.on('popupopen', (e: Leaflet.PopupEvent) => {
        const zamknij = e.popup.getElement()?.querySelector('.leaflet-popup-close-button');
        zamknij?.setAttribute('aria-label', 'Zamknij dymek');
        zamknij?.setAttribute('title', 'Zamknij dymek');
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
      }).addTo(this.mapa);
      this.warstwa = L.layerGroup().addTo(this.mapa);
      this.rysuj();
      // Na telefonie mapa startuje w ukrytym kontenerze (display: none). Po pokazaniu
      // (przełącznik „Pokaż mapę”) Leaflet musi przeliczyć rozmiar i dopasować widok.
      if ('ResizeObserver' in window) {
        this.obserwatorRozmiaru = new ResizeObserver(() => {
          if (!this.mapa || this.kontener.nativeElement.offsetWidth === 0) return;
          this.mapa.invalidateSize();
          this.dopasuj();
        });
        this.obserwatorRozmiaru.observe(this.kontener.nativeElement);
      }
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
      iconSize: [36, 36],
    });
    for (const r of this.naMapie()) {
      const adres = [r.ulica, r.numer_budynku, r.miejscowosc].filter(Boolean).join(' ');
      const etykieta = `AED: ${r.etykieta}${adres ? ', ' + adres : ''}`;
      const m = L.marker([r.szerokosc_geograficzna_aed, r.dlugosc_geograficzna_aed], {
        icon: ikona,
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
    h.textContent = r.etykieta;
    div.append(h);
    // Klucz pogrubiony, wartość zwykłym tekstem (np. „Godziny: pon.–pt. 08:00-16:00”).
    const pole = (klucz: string, wartosc: string | Node) => {
      const w = document.createElement('div');
      const k = document.createElement('strong');
      k.textContent = `${klucz}: `;
      w.append(k, wartosc);
      div.append(w);
    };
    const adres = [
      [r.ulica, r.numer_budynku].filter(Boolean).join(' '),
      [r.kod_pocztowy, r.miejscowosc].filter(Boolean).join(' '),
    ]
      .filter(Boolean)
      .join(', ');
    if (adres) pole('Adres', adres);
    if (r.nazwa_obiektu && r.komentarz_aed) pole('Gdzie', r.komentarz_aed);
    pole('Godziny', opisGodzin(POLA_DNI.map((p) => r[p])) ?? 'brak danych');
    pole('Stan', r.stan_aed ?? 'brak danych');
    if (r.odpowiedzialny_za_aed)
      pole(
        'Odpowiedzialny',
        `${r.odpowiedzialny_za_aed}${r.telefon_odpowiedzialnego_za_aed ? ', tel. ' + r.telefon_odpowiedzialnego_za_aed : ''}`,
      );
    const url = trasaDoAed(r);
    if (url) {
      const trasa = document.createElement('a');
      trasa.href = url;
      trasa.target = '_blank';
      trasa.rel = 'noopener';
      trasa.textContent = 'Wyznacz trasę (Google Maps, nowa karta)';
      const w = document.createElement('div');
      w.append(trasa);
      div.append(w);
    }
    // Zbiór dostawcy z linkiem – kto odpowiada za ten rekord.
    const zbior = document.createDocumentFragment();
    if (r.adresZbioruZrodla) {
      const a = document.createElement('a');
      a.href = r.adresZbioruZrodla;
      a.textContent = r.dostawcaZrodla;
      zbior.append(a);
    } else zbior.append(r.dostawcaZrodla);
    zbior.append(`, dane z ${r.dataDanychZrodla}`);
    pole('Zbiór', zbior);
    if (r.atrybucjaZrodla) {
      const at = document.createElement('div');
      at.textContent = r.atrybucjaZrodla;
      div.append(at);
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
    const r = this.naMapie();
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
      this.mapa.fitBounds(L.latLngBounds(r.map((x) => [x.szerokosc_geograficzna_aed, x.dlugosc_geograficzna_aed])), {
        padding: [24, 24],
        maxZoom: 15,
      });
  }

  ngOnDestroy(): void {
    this.obserwatorRozmiaru?.disconnect();
    this.mapa?.remove();
  }
}
