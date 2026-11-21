/**
 * HackNation 2026 – Misja AED. Plik dodany do forka portalu dane.gov.pl (GPL-3.0), 2026-11-21.
 *
 * „Dostępny teraz” z zapisu opening_hours (OSM). Obsługujemy podzbiór składni,
 * który generuje nasz formularz i który występuje w danych: „24/7” oraz reguły
 * „Mo-Fr 08:00-16:00; Sa 09:00-13:00”, listy dni („Tu,Th”) i kilka przedziałów („08:00-12:00,13:00-16:00”).
 * Zapis spoza podzbioru → null („nie wiadomo”), a nie zgadywanie.
 */

const DNI = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const;

/** Indeks dnia 0 = poniedziałek. */
function dzienTygodnia(d: Date): number {
  return (d.getDay() + 6) % 7;
}

function dniZWyrazenia(wyr: string): number[] | null {
  const wynik: number[] = [];
  for (const czesc of wyr.split(',')) {
    const [od, do_] = czesc.split('-');
    const a = DNI.indexOf(od as (typeof DNI)[number]);
    const b = do_ === undefined ? a : DNI.indexOf(do_ as (typeof DNI)[number]);
    if (a < 0 || b < 0) return null;
    for (let i = a; ; i = (i + 1) % 7) {
      wynik.push(i);
      if (i === b) break;
    }
  }
  return wynik;
}

const minuty = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** true / false, albo null, gdy zapis jest pusty lub nieczytelny. */
export function czyDostepnyTeraz(zapis: string | null, teraz: Date = new Date()): boolean | null {
  if (!zapis) return null;
  const z = zapis.trim();
  if (z === '24/7') return true;
  const dzis = dzienTygodnia(teraz);
  const min = teraz.getHours() * 60 + teraz.getMinutes();
  let otwarte = false;
  for (const regula of z
    .split(';')
    .map((r) => r.trim())
    .filter(Boolean)) {
    const m = /^([A-Za-z,-]+)\s+(.+)$/.exec(regula);
    if (!m) return null;
    const dni = dniZWyrazenia(m[1]);
    if (!dni) return null;
    const przedzialy = m[2].split(',').map((p) => p.trim());
    for (const p of przedzialy) {
      const pm = /^(\d{2}:\d{2})-(\d{2}:\d{2})$/.exec(p);
      if (!pm) return null;
      if (dni.includes(dzis) && min >= minuty(pm[1]) && min < minuty(pm[2])) otwarte = true;
    }
  }
  return otwarte;
}
