/**
 * HackNation 2026 – Misja AED. Plik dodany do forka portalu dane.gov.pl (GPL-3.0), 2026-11-22.
 *
 * Odczyt arkusza XLSX w przeglądarce bez dodatkowych bibliotek: XLSX to archiwum ZIP z plikami XML
 * (ECMA-376). Rozpakowanie: DecompressionStream('deflate-raw'), odczyt XML: DOMParser.
 * Zwracamy wiersze jak z CSV (nagłówek + obiekty), żeby narzędzie sprawdzało oba formaty tak samo.
 */

export class BladXlsx extends Error {}

export interface ArkuszXlsx {
  nazwa: string;
  naglowki: string[];
  wiersze: Record<string, string>[];
}

const u16 = (d: DataView, o: number) => d.getUint16(o, true);
const u32 = (d: DataView, o: number) => d.getUint32(o, true);

/** Pliki z archiwum ZIP (tylko metody 0 – bez kompresji i 8 – deflate). */
async function rozpakuj(bufor: ArrayBuffer): Promise<Map<string, () => Promise<string>>> {
  const d = new DataView(bufor);
  let eocd = -1;
  for (let i = bufor.byteLength - 22; i >= Math.max(0, bufor.byteLength - 65557); i--)
    if (u32(d, i) === 0x06054b50) {
      eocd = i;
      break;
    }
  if (eocd < 0) throw new BladXlsx('Plik nie jest poprawnym plikiem XLSX.');
  const liczba = u16(d, eocd + 10);
  let o = u32(d, eocd + 16);
  const pliki = new Map<string, () => Promise<string>>();
  const dekoder = new TextDecoder('utf-8');
  for (let n = 0; n < liczba; n++) {
    if (u32(d, o) !== 0x02014b50) throw new BladXlsx('Plik XLSX jest uszkodzony.');
    const metoda = u16(d, o + 10);
    const rozmiar = u32(d, o + 20);
    const dlNazwy = u16(d, o + 28);
    const lokalny = u32(d, o + 42);
    const nazwa = dekoder.decode(new Uint8Array(bufor, o + 46, dlNazwy));
    o += 46 + dlNazwy + u16(d, o + 30) + u16(d, o + 32);
    pliki.set(nazwa, async () => {
      const start = lokalny + 30 + u16(d, lokalny + 26) + u16(d, lokalny + 28);
      const dane = new Uint8Array(bufor, start, rozmiar);
      if (metoda === 0) return dekoder.decode(dane);
      if (metoda !== 8) throw new BladXlsx('Plik XLSX używa nieobsługiwanej kompresji.');
      const strumien = new Blob([dane]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      return dekoder.decode(await new Response(strumien).arrayBuffer());
    });
  }
  return pliki;
}

const xml = (tekst: string) => new DOMParser().parseFromString(tekst, 'application/xml');

/** „AB12” → 27 (indeks kolumny od 0). */
function kolumna(ref: string): number {
  let n = 0;
  for (const ch of ref.replace(/\d+$/, '')) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function wartosc(c: Element, wspolne: string[]): string {
  const typ = c.getAttribute('t');
  if (typ === 'inlineStr') return c.getElementsByTagName('is')[0]?.textContent ?? '';
  const v = c.getElementsByTagName('v')[0]?.textContent ?? '';
  if (typ === 's') return wspolne[Number(v)] ?? '';
  if (typ === 'b') return v === '1' ? 'true' : 'false';
  return v;
}

/** Wszystkie widoczne arkusze z niepustym nagłówkiem. */
export async function czytajXlsx(bufor: ArrayBuffer): Promise<ArkuszXlsx[]> {
  const pliki = await rozpakuj(bufor);
  const czytaj = async (sciezka: string) => {
    const f = pliki.get(sciezka);
    return f ? f() : null;
  };
  const skoroszyt = await czytaj('xl/workbook.xml');
  if (!skoroszyt) throw new BladXlsx('Plik nie jest arkuszem XLSX.');

  const tekstyWspolne = await czytaj('xl/sharedStrings.xml');
  const wspolne = tekstyWspolne
    ? Array.from(xml(tekstyWspolne).getElementsByTagName('si')).map((si) =>
        Array.from(si.getElementsByTagName('t'))
          .filter((t) => t.parentElement?.tagName !== 'rPh')
          .map((t) => t.textContent ?? '')
          .join(''),
      )
    : [];

  const relacje = new Map<string, string>();
  const rels = await czytaj('xl/_rels/workbook.xml.rels');
  if (rels)
    for (const r of Array.from(xml(rels).getElementsByTagName('Relationship'))) {
      const cel = r.getAttribute('Target') ?? '';
      relacje.set(r.getAttribute('Id') ?? '', cel.startsWith('/') ? cel.slice(1) : `xl/${cel}`);
    }

  const arkusze: ArkuszXlsx[] = [];
  for (const s of Array.from(xml(skoroszyt).getElementsByTagName('sheet'))) {
    if (s.getAttribute('state') === 'hidden' || s.getAttribute('state') === 'veryHidden') continue;
    const id = s.getAttribute('r:id') ?? s.getAttributeNS('*', 'id') ?? '';
    const tresc = await czytaj(relacje.get(id) ?? '');
    if (!tresc) continue;
    const wiersze: string[][] = [];
    for (const row of Array.from(xml(tresc).getElementsByTagName('row'))) {
      const w: string[] = [];
      for (const c of Array.from(row.getElementsByTagName('c'))) {
        const i = kolumna(c.getAttribute('r') ?? '');
        if (i >= 0) w[i] = wartosc(c, wspolne).trim();
      }
      if (w.some(Boolean)) wiersze.push(Array.from(w, (x) => x ?? ''));
    }
    if (!wiersze.length) continue;
    const naglowki = wiersze[0].map((h, i) => h || `kolumna_${i + 1}`);
    while (naglowki.length && naglowki[naglowki.length - 1].startsWith('kolumna_')) naglowki.pop();
    arkusze.push({
      nazwa: s.getAttribute('name') ?? '',
      naglowki,
      wiersze: wiersze.slice(1).map((w) => Object.fromEntries(naglowki.map((h, i) => [h, w[i] ?? '']))),
    });
  }
  return arkusze;
}
