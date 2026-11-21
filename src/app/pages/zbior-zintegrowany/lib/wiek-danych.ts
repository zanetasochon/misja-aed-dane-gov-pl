/**
 * HackNation 2026 – Misja AED. Plik dodany do forka portalu dane.gov.pl (GPL-3.0), 2026-11-21.
 * Wiek danych źródłowych: dane starsze niż 12 miesięcy oznaczamy ostrzeżeniem
 * (T §2: „możliwie aktualny zbiór”).
 */

export const PROG_NIEAKTUALNOSCI_MIESIACE = 12;

/** Pełne miesiące między datą danych (yyyy-mm-dd) a dniem `teraz`. */
export function wiekWMiesiacach(dataDanych: string, teraz: Date = new Date()): number {
  const d = new Date(`${dataDanych.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return 0;
  let m = (teraz.getFullYear() - d.getFullYear()) * 12 + (teraz.getMonth() - d.getMonth());
  if (teraz.getDate() < d.getDate()) m--;
  return Math.max(0, m);
}

export function czyNieaktualne(dataDanych: string, teraz: Date = new Date()): boolean {
  return wiekWMiesiacach(dataDanych, teraz) >= PROG_NIEAKTUALNOSCI_MIESIACE;
}

/**
 * Data i czas w formacie wzorca (ISO 8601, yyyy-mm-ddThh:mm) w czasie polskim (Europe/Warsaw),
 * niezależnie od strefy przeglądarki. Dla wartości bez godziny (yyyy-mm-dd) zwraca ją bez zmian.
 */
export function doDatyCzasuWzorca(iso: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const cz = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Warsaw',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  return `${cz['year']}-${cz['month']}-${cz['day']}T${cz['hour']}:${cz['minute']}`;
}
