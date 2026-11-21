/**
 * HackNation 2026 – Misja AED. Plik dodany do forka portalu dane.gov.pl (GPL-3.0), 2026-11-21.
 *
 * Atrapa logowania dostawcy dla jury: flaga w sessionStorage, bez hasła i bez wywołań API auth.
 * Prawdziwe logowanie portalu nie jest zmieniane.
 */

const KLUCZ = 'hacknation-demo-dostawca';

export const NAZWA_DOSTAWCY_DEMO = 'Urząd Miasta – demo';

export function wlaczTrybDemo(): void {
  try {
    sessionStorage.setItem(KLUCZ, 'true');
  } catch {
    // brak dostępu do sessionStorage – tryb demo działa tylko do odświeżenia strony
  }
}

export function wylaczTrybDemo(): void {
  try {
    sessionStorage.removeItem(KLUCZ);
  } catch {
    // brak dostępu do sessionStorage
  }
}

export function czyTrybDemo(): boolean {
  try {
    return sessionStorage.getItem(KLUCZ) === 'true';
  } catch {
    return false;
  }
}
