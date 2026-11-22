/**
 * HackNation 2026 – Misja AED. Plik dodany do forka portalu dane.gov.pl (GPL-3.0), 2026-11-22.
 *
 * Interceptor HTTP dla FIKCYJNYCH zbiorów dostawców AED (prototyp). Na zapytania o ich identyfikatory
 * (zrodla.ts: 9900001, 9900002 i zasoby 9900011, 9900012) odpowiada danymi z lib/fikcyjne-api.ts
 * w kształcie api.dane.gov.pl. Wszystkie inne zapytania idą bez zmian do API portalu.
 */

import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import {
  odpowiedzDanych,
  odpowiedzHistorii,
  odpowiedzWykresow,
  odpowiedzZasobow,
  odpowiedzZasobu,
  odpowiedzZbioru,
  zrodloPoZasobie,
  zrodloPoZbiorze,
} from './lib/fikcyjne-api';

const ID = '(99000\\d\\d)';

@Injectable()
export class FikcyjneZbioryInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (req.method !== 'GET') return next.handle(req);
    const url = new URL(req.urlWithParams, 'http://x');
    const sciezka = url.pathname.replace(/^.*?\/api(\/1\.4)?/, '');
    const param = (k: string) => url.searchParams.get(k) ?? '';
    const odp = (body: unknown) => of(new HttpResponse({ status: 200, body, url: req.urlWithParams }));
    let m: RegExpExecArray | null;

    if ((m = new RegExp(`^/datasets/${ID}(?:,[^/]*)?/resources/?$`).exec(sciezka))) {
      const z = zrodloPoZbiorze(m[1]);
      if (z) return odp(odpowiedzZasobow(z));
    }
    if ((m = new RegExp(`^/datasets/${ID}(?:,[^/]*)?/?$`).exec(sciezka))) {
      const z = zrodloPoZbiorze(m[1]);
      if (z) return odp(odpowiedzZbioru(z));
    }
    if ((m = new RegExp(`^/catalog/dataset/${ID}`).exec(sciezka)) && zrodloPoZbiorze(m[1])) return odp({});
    if (sciezka.startsWith('/histories') && zrodloPoZbiorze(param('row_id'))) return odp(odpowiedzHistorii());
    if ((m = new RegExp(`^/resources/${ID}(?:,[^/]*)?/charts/?$`).exec(sciezka))) {
      const z = zrodloPoZasobie(m[1]);
      if (z) return odp(odpowiedzWykresow(z));
    }
    if ((m = new RegExp(`^/resources/${ID}(?:,[^/]*)?/data/?$`).exec(sciezka))) {
      const z = zrodloPoZasobie(m[1]);
      if (z)
        return odp(
          odpowiedzDanych(z, Number(param('page')) || 1, Number(param('per_page')) || 20, param('q'), param('sort')),
        );
    }
    if ((m = new RegExp(`^/resources/${ID}(?:,[^/]*)?/?$`).exec(sciezka))) {
      const z = zrodloPoZasobie(m[1]);
      if (z) return odp(odpowiedzZasobu(z));
    }
    return next.handle(req);
  }
}
