/**
 * HackNation 2026 – Misja AED. Plik dodany do forka portalu dane.gov.pl (GPL-3.0), 2026-11-22.
 *
 * Odpowiedzi API dla FIKCYJNYCH zbiorów dostawców (zrodla.ts) w tym samym kształcie JSON:API co
 * api.dane.gov.pl/1.4 (wzór: odpowiedzi dla prawdziwego zbioru AED 40593 i zasobu 2625221).
 * Dzięki temu strony zbioru i zasobu (tabela) renderuje niezmieniony kod portalu.
 */

import { wierszeJakoObiekty } from './csv';
import { ZRODLA } from './zrodla';
import type { ZrodloDef } from './zrodla';

const API = 'https://api.dane.gov.pl/1.4';
const JSONAPI = { version: '1.4' };
const REGIONY = [{ name: 'Polska', region_id: '85633723', hierarchy_label: 'Polska', is_additional: false }];
const KATEGORIE = [
  { code: 'HEAL', title: 'Zdrowie', id: '147' },
  { code: 'REGI', title: 'Regiony i miasta', id: '149' },
];

const meta = (path: string, params: Record<string, string> = {}, extra: Record<string, unknown> = {}) => ({
  server_time: new Date().toISOString().slice(0, 19) + 'Z',
  path: `/1.4${path}`,
  language: 'pl',
  relative_uri: `/1.4${path}`,
  params,
  ...extra,
});

export const zrodloPoZbiorze = (id: string) => ZRODLA.find((z) => z.portal.id === id) ?? null;
export const zrodloPoZasobie = (id: string) => ZRODLA.find((z) => z.portal.zasob.id === id) ?? null;

function instytucja(z: ZrodloDef) {
  const i = z.portal.instytucja;
  return {
    relationships: {
      resources: { meta: { count: 1 } },
      datasets: { meta: { count: 1 }, links: { related: `${API}/institutions/${i.id},${i.slug}/datasets` } },
    },
    attributes: {
      fax: null,
      institution_type: i.typ,
      website: i.www,
      title: z.dostawca,
      slug: i.slug,
      abbreviation: null,
      regon: null,
      city: i.miasto,
      email: i.email,
      modified: z.portal.created,
      image_url: '',
      street: i.ulica,
      created: z.portal.created,
      street_type: 'ul.',
      notes: '',
      sources: [],
      epuap: null,
      electronic_delivery_address: null,
      street_number: i.numer,
      tel: i.tel,
      description: '',
      postal_code: i.kod,
      flat_number: null,
    },
    type: 'institution',
    links: { self: `${API}/institutions/${i.id},${i.slug}` },
    id: i.id,
  };
}

function rozmiar(z: ZrodloDef): number {
  return new TextEncoder().encode(z.tresc).length;
}

function atrybutyZasobu(z: ZrodloDef) {
  const r = z.portal.zasob;
  return {
    jsonld_download_url: null,
    is_chart_creation_blocked: true,
    csv_file_size: null,
    supplements: [],
    special_signs: [],
    title: r.tytul,
    csv_file_url: null,
    verified: z.zmodyfikowano,
    visualization_types: ['table'],
    jsonld_file_size: null,
    data_date: z.dataDanych,
    download_url: r.plik,
    media_type: 'file',
    downloads_count: 0,
    jsonld_file_url: null,
    format: 'csv',
    modified: z.zmodyfikowano,
    language: 'pl',
    created: z.portal.created,
    category: null,
    has_dynamic_data: false,
    contains_protected_data: false,
    file_url: r.plik,
    views_count: 0,
    has_high_value_data: false,
    openness_score: 3,
    files: [
      { openness_score: 3, compressed_file_format: null, download_url: r.plik, format: 'csv', file_size: rozmiar(z) },
    ],
    has_high_value_data_from_ec_list: false,
    has_research_data: false,
    link: r.plik,
    regions: REGIONY,
    description: r.opis,
    csv_download_url: null,
    file_size: rozmiar(z),
  };
}

function relacjeZasobu(z: ZrodloDef) {
  const { id: zid, slug, zasob, instytucja: i } = z.portal;
  return {
    tabular_data: {
      links: { related: `${API}/resources/${zasob.id}/data` },
      data: { type: 'tabular_data', id: zasob.id },
    },
    institution: {
      links: { related: `${API}/institutions/${i.id},${i.slug}` },
      data: { type: 'institution', id: i.id },
    },
    chart: {
      links: { related: `${API}/resources/${zasob.id},${zasob.slug}/chart` },
      data: { type: 'chart', id: zasob.id },
    },
    dataset: { links: { related: `${API}/datasets/${zid},${slug}` }, data: { type: 'dataset', id: zid } },
  };
}

function elementZasobu(z: ZrodloDef) {
  const r = z.portal.zasob;
  return {
    relationships: relacjeZasobu(z),
    attributes: atrybutyZasobu(z),
    type: 'resource',
    links: { self: `${API}/resources/${r.id},${r.slug}` },
    id: r.id,
  };
}

/** GET /datasets/{id}?include=institution */
export function odpowiedzZbioru(z: ZrodloDef) {
  const p = z.portal;
  return {
    jsonapi: JSONAPI,
    links: { self: `${API}/datasets/${p.id}?include=institution` },
    data: {
      relationships: {
        resources: { meta: { count: 1 }, links: { related: `${API}/datasets/${p.id},${p.slug}/resources` } },
        showcases: { meta: { count: 0 }, links: { related: `${API}/datasets/${p.id},${p.slug}/showcases` } },
        institution: {
          links: { related: `${API}/institutions/${p.instytucja.id},${p.instytucja.slug}` },
          data: { type: 'institution', id: p.instytucja.id },
        },
      },
      attributes: {
        license_condition_personal_data: null,
        types: ['file'],
        license_condition_default_cc40: false,
        openness_scores: [3],
        supplements: [],
        title: z.tytul,
        keywords: p.keywords,
        categories: KATEGORIE,
        slug: p.slug,
        verified: z.zmodyfikowano,
        visualization_types: ['table'],
        license_description: '',
        license_condition_custom_description: '',
        downloads_count: 0,
        license_condition_timestamp: null,
        modified: z.zmodyfikowano,
        is_promoted: false,
        image_url: '',
        created: p.created,
        category: null,
        license_name: 'CC0 1.0',
        source: null,
        archived_resources_files_url: null,
        license_condition_db_or_copyrighted: '',
        image_alt: '',
        has_dynamic_data: false,
        update_frequency: 'Co tydzień',
        license_condition_original: null,
        notes: p.notes,
        views_count: 0,
        has_high_value_data: false,
        has_high_value_data_from_ec_list: false,
        has_research_data: false,
        regions: REGIONY,
        likes_count: 0,
        formats: ['csv'],
        license_chosen: null,
        is_liked_by_current_user: false,
        url: '',
        current_condition_descriptions: {},
      },
      type: 'dataset',
      links: { self: `${API}/datasets/${p.id},${p.slug}` },
      id: p.id,
    },
    meta: meta(`/datasets/${p.id}`, { include: 'institution' }),
    included: [instytucja(z)],
  };
}

/** GET /datasets/{id}/resources */
export function odpowiedzZasobow(z: ZrodloDef) {
  return {
    data: [elementZasobu(z)],
    links: { self: `${API}/datasets/${z.portal.id}/resources` },
    jsonapi: JSONAPI,
    included: [instytucja(z)],
    meta: meta(`/datasets/${z.portal.id}/resources`, {}, { aggregations: {}, count: 1 }),
  };
}

/** GET /resources/{id} */
export function odpowiedzZasobu(z: ZrodloDef) {
  return {
    jsonapi: JSONAPI,
    links: { self: `${API}/resources/${z.portal.zasob.id}` },
    data: elementZasobu(z),
    meta: meta(`/resources/${z.portal.zasob.id}`),
  };
}

/** GET /resources/{id}/charts */
export function odpowiedzWykresow(z: ZrodloDef) {
  const path = `/resources/${z.portal.zasob.id}/charts`;
  return {
    data: [],
    links: { self: `${API}${path}?page=1` },
    jsonapi: JSONAPI,
    meta: meta(path, {}, { aggregations: {}, named_charts: true, count: 0 }),
  };
}

/** GET /histories?table_name=dataset&row_id={id} – brak historii zmian. */
export function odpowiedzHistorii() {
  return {
    data: [],
    links: { self: `${API}/histories` },
    jsonapi: JSONAPI,
    meta: meta('/histories', {}, { count: 0 }),
  };
}

const LICZBOWE = new Set(['szerokosc_geograficzna_aed', 'dlugosc_geograficzna_aed', 'aed_latitude', 'aed_longitude']);

/** GET /resources/{id}/data?page&per_page&q&sort – dane tabelaryczne zasobu (kolumny col1…colN jak w API). */
export function odpowiedzDanych(z: ZrodloDef, page = 1, perPage = 20, q = '', sort = '') {
  const rid = z.portal.zasob.id;
  const { naglowki, wiersze } = wierszeJakoObiekty(z.tresc);
  const kol = naglowki.map((_, i) => `col${i + 1}`);
  const komorki = wiersze.map((w) =>
    Object.fromEntries(
      naglowki.map((h, i) => {
        const v = w[h] ?? '';
        const val = v === '' ? null : LICZBOWE.has(h) ? Number(v) : v;
        return [kol[i], { repr: v, val }];
      }),
    ),
  );
  let wynik = komorki.map((k, i) => ({ k, nr: i + 1 }));
  const fraza = q.trim().toLowerCase();
  if (fraza) wynik = wynik.filter(({ k }) => Object.values(k).some((c) => c.repr.toLowerCase().includes(fraza)));
  if (sort) {
    const malejaco = sort.startsWith('-');
    const c = sort.replace(/^-/, '');
    wynik = [...wynik].sort(
      (a, b) => (a.k[c]?.repr ?? '').localeCompare(b.k[c]?.repr ?? '', 'pl') * (malejaco ? -1 : 1),
    );
  }
  const od = (page - 1) * perPage;
  const path = `/resources/${rid}/data`;
  const ostatnia = Math.max(1, Math.ceil(wynik.length / perPage));
  return {
    jsonapi: JSONAPI,
    links: {
      self: `${API}${path}?page=${page}&per_page=${perPage}`,
      last: `${API}${path}?page=${ostatnia}&per_page=${perPage}`,
      ...(page < ostatnia ? { next: `${API}${path}?page=${page + 1}&per_page=${perPage}` } : {}),
    },
    data: wynik.slice(od, od + perPage).map(({ k, nr }) => ({
      relationships: {
        resource: { links: { related: `${API}/resources/${rid}` }, data: { type: 'resource', id: rid } },
      },
      attributes: k,
      type: 'row',
      links: { self: `${API}${path}/${rid}-${nr}` },
      meta: { updated_at: z.zmodyfikowano, row_no: nr },
      id: `${rid}-${nr}`,
    })),
    meta: meta(
      path,
      { page: String(page), per_page: String(perPage) },
      {
        data_schema: {
          fields: naglowki.map((h, i) => ({
            name: kol[i],
            type: LICZBOWE.has(h) ? 'number' : 'string',
            format: 'default',
          })),
          missingValues: [],
        },
        headers_map: Object.fromEntries(naglowki.map((h, i) => [kol[i], h])),
        aggregations: {},
        count: wynik.length,
      },
    ),
  };
}
