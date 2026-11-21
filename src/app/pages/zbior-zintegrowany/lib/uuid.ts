/**
 * HackNation 2026 – Misja AED. Plik dodany do forka portalu dane.gov.pl (GPL-3.0), 2026-11-21.
 *
 * Stały identyfikator rekordu (id_aed): UUID w wersji 5 (RFC 4122, SHA-1, przestrzeń nazw URL)
 * wyliczany z adresu zbioru źródłowego i identyfikatora rekordu w źródle. Ten sam rekord dostaje
 * ten sam UUID przy każdym przeliczeniu zbioru zintegrowanego.
 */

/** Przestrzeń nazw URL z RFC 4122, dodatek C. */
const NAMESPACE_URL = '6ba7b811-9dad-11d1-80b4-00c04fd430c8';

function sha1(bajty: Uint8Array): Uint8Array {
  const dl = bajty.length;
  const blokow = ((dl + 8) >> 6) + 1;
  const w = new Uint32Array(blokow * 16);
  for (let i = 0; i < dl; i++) w[i >> 2] |= bajty[i] << (24 - (i % 4) * 8);
  w[dl >> 2] |= 0x80 << (24 - (dl % 4) * 8);
  w[blokow * 16 - 1] = dl * 8;
  let h0 = 0x67452301,
    h1 = 0xefcdab89,
    h2 = 0x98badcfe,
    h3 = 0x10325476,
    h4 = 0xc3d2e1f0;
  const rol = (x: number, n: number) => (x << n) | (x >>> (32 - n));
  const m = new Uint32Array(80);
  for (let b = 0; b < blokow; b++) {
    for (let t = 0; t < 16; t++) m[t] = w[b * 16 + t];
    for (let t = 16; t < 80; t++) m[t] = rol(m[t - 3] ^ m[t - 8] ^ m[t - 14] ^ m[t - 16], 1);
    let a = h0,
      bb = h1,
      c = h2,
      d = h3,
      e = h4;
    for (let t = 0; t < 80; t++) {
      const f =
        t < 20 ? (bb & c) | (~bb & d) : t < 40 ? bb ^ c ^ d : t < 60 ? (bb & c) | (bb & d) | (c & d) : bb ^ c ^ d;
      const k = t < 20 ? 0x5a827999 : t < 40 ? 0x6ed9eba1 : t < 60 ? 0x8f1bbcdc : 0xca62c1d6;
      const tmp = (rol(a, 5) + f + e + k + m[t]) >>> 0;
      e = d;
      d = c;
      c = rol(bb, 30) >>> 0;
      bb = a;
      a = tmp;
    }
    h0 = (h0 + a) >>> 0;
    h1 = (h1 + bb) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
  }
  const wynik = new Uint8Array(20);
  [h0, h1, h2, h3, h4].forEach((h, i) => {
    wynik[i * 4] = h >>> 24;
    wynik[i * 4 + 1] = (h >>> 16) & 0xff;
    wynik[i * 4 + 2] = (h >>> 8) & 0xff;
    wynik[i * 4 + 3] = h & 0xff;
  });
  return wynik;
}

/** SHA-1 jako tekst szesnastkowy – do testu na znanych wektorach. */
export function sha1Hex(tekst: string): string {
  return [...sha1(new TextEncoder().encode(tekst))].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function uuidV5(nazwa: string, przestrzen: string = NAMESPACE_URL): string {
  const ns = przestrzen
    .replace(/-/g, '')
    .match(/../g)!
    .map((h) => parseInt(h, 16));
  const n = new TextEncoder().encode(nazwa);
  const dane = new Uint8Array(16 + n.length);
  dane.set(ns, 0);
  dane.set(n, 16);
  const h = sha1(dane).slice(0, 16);
  h[6] = (h[6] & 0x0f) | 0x50; // wersja 5
  h[8] = (h[8] & 0x3f) | 0x80; // wariant RFC 4122
  const x = [...h].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}
