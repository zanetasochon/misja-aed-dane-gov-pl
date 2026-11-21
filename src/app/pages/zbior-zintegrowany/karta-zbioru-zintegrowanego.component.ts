/**
 * HackNation 2026 – Misja AED. Plik dodany do forka portalu dane.gov.pl (GPL-3.0), 2026-11-21.
 * Karta zbioru zintegrowanego nad listą wyników w zakładce „Dane”.
 */

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LocalizeRouterPipe } from '@gilsdav/ngx-translate-router';
import { ZRODLA } from './lib/zrodla';

@Component({
  selector: 'app-karta-zbioru-zintegrowanego',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LocalizeRouterPipe],
  template: `
    <article class="karta-zz" aria-labelledby="karta-zz-tytul">
      <p class="karta-zz__etykieta"><span class="badge-zintegrowany">Zbiór zintegrowany</span></p>
      <h2 id="karta-zz-tytul" class="heading heading--sm heading--primary-link">
        <a class="heading__link" [routerLink]="['/!dataset', '!zbior-zintegrowany-aed'] | localize">
          Defibrylatory AED – zbiór zintegrowany
        </a>
      </h2>
      <p>Łączy {{ zrodla.length }} zbiory o AED od różnych dostawców w jeden zbiór według wzorcowego zakresu danych.</p>
      <p class="karta-zz__zrodla-tytul" id="karta-zz-zrodla">Zbiory źródłowe:</p>
      <ul aria-labelledby="karta-zz-zrodla">
        @for (z of zrodla; track z.id) {
          <li>{{ z.dostawca }} – {{ z.tytul }}</li>
        }
      </ul>
    </article>
  `,
  styles: `
    .karta-zz {
      border: 2px solid #0052a5;
      border-radius: 4px;
      padding: 1rem 1.25rem;
      margin-bottom: 1.5rem;
    }
    .karta-zz__etykieta {
      margin-bottom: 0.5rem;
    }
    .badge-zintegrowany {
      display: inline-block;
      padding: 0.25rem 0.625rem;
      border: 2px solid #0052a5;
      border-radius: 4px;
      color: #0052a5;
      font-weight: 700;
      font-size: 0.875rem;
    }
    .karta-zz__zrodla-tytul {
      font-weight: 700;
      margin-bottom: 0.25rem;
    }
    ul {
      margin-bottom: 0;
    }
  `,
})
export class KartaZbioruZintegrowanegoComponent {
  readonly zrodla = ZRODLA;
}
