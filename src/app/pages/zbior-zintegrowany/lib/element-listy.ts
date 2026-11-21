/**
 * HackNation 2026 – Misja AED. Plik dodany do forka portalu dane.gov.pl (GPL-3.0), 2026-11-21.
 *
 * Zbiór zintegrowany jako zwykły element listy w zakładce „Dane”, w tym samym kształcie
 * co wyniki z API po ListViewDetailsService.extendDataset(). Dzięki temu lista renderuje go
 * tym samym szablonem co pozostałe zbiory (tytuł, opis, słowa kluczowe, typ, data aktualizacji).
 */

import { ApiModel } from '@app/services/api/api-model';
import type { ISearchResult } from '@app/services/models/search';
import { RouterEndpoints } from '@app/services/models/routerEndpoints';
import { ZRODLA } from './zrodla';

export const ID_ZBIORU_ZINTEGROWANEGO = 'zbior-zintegrowany-aed';

export const TYTUL_ZBIORU = 'Defibrylatory AED – zbiór zintegrowany';
export const OPIS_ZBIORU =
  '<p>Ogólnopolski zbiór lokalizacji i dostępności defibrylatorów AED. Powstaje z połączenia zbiorów o AED publikowanych na dane.gov.pl przez różnych dostawców i jest ujednolicony według wzorcowego zakresu danych AED. Każdy rekord wskazuje zbiór źródłowy i datę danych, a za dane odpowiada dostawca zbioru źródłowego.</p>';
export const SLOWA_KLUCZOWE = ['AED', 'defibrylator', 'pierwsza pomoc', 'zbiór zintegrowany'];

/** Najnowsza data danych wśród zbiorów źródłowych – data aktualizacji zbioru zintegrowanego. */
export const DATA_AKTUALIZACJI =
  ZRODLA.map((z) => z.dataDanych)
    .sort()
    .at(-1) ?? '';

export type ElementZbioruZintegrowanego = ISearchResult & { zbiorZintegrowany: true };

export function elementZbioruZintegrowanego(): ElementZbioruZintegrowanego {
  return {
    id: ID_ZBIORU_ZINTEGROWANEGO,
    type: 'dataset',
    zbiorZintegrowany: true,
    url: `../${RouterEndpoints.DATASETS}/${ID_ZBIORU_ZINTEGROWANEGO}`,
    // Klucz dodany do assets/i18n (pl: „Zbiór zintegrowany”, en: „Integrated dataset”).
    titleTranslationKey: 'Datasets.Integrated',
    detailsData: [
      { titleTranslationKey: 'Attribute.UpdateDate', data: DATA_AKTUALIZACJI, isDate: true, dateFormat: 'D MMMM YYYY' },
    ],
    relationships: {} as ISearchResult['relationships'],
    attributes: {
      model: ApiModel.DATASET,
      title: TYTUL_ZBIORU,
      slug: ID_ZBIORU_ZINTEGROWANEGO,
      notes: OPIS_ZBIORU,
      keywords: SLOWA_KLUCZOWE,
      verified: DATA_AKTUALIZACJI,
      modified: DATA_AKTUALIZACJI,
      created: DATA_AKTUALIZACJI,
      data_date: DATA_AKTUALIZACJI,
      tags: [],
      author: '',
      category: { description: '', title: 'Zdrowie', id: '' },
      // Placeholder licznika ulubionych: zbiór nie istnieje w API, więc nie ma prawdziwych polubień.
      likes_count: 0,
      is_liked_by_current_user: false,
    } as ISearchResult['attributes'] & { likes_count: number; is_liked_by_current_user: boolean },
  };
}

/**
 * Zbiór zintegrowany pokazujemy na pierwszej stronie wyników, gdy pasuje do zapytania:
 * bez frazy albo z frazą o AED, bez innych filtrów i z wynikami obejmującymi zbiory danych.
 */
export function dolaczZbiorZintegrowany(
  elementy: ISearchResult[],
  params: Record<string, unknown> | undefined,
  liczbaFiltrow: number,
): ISearchResult[] {
  const strona = Number(params?.['page'] ?? 1);
  const q = String(params?.['q'] ?? '').trim();
  const model = String(params?.['model[terms]'] ?? params?.['model'] ?? '');
  const pasujeFraza = q === '' || /aed|defibryl|zintegrowan/i.test(q);
  const pasujeModel = model === '' || model.includes(ApiModel.DATASET);
  if (strona !== 1 || !pasujeFraza || !pasujeModel || liczbaFiltrow > 0) return elementy;
  return [elementZbioruZintegrowanego(), ...elementy];
}
