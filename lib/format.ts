/** Tarih/zaman biçimleyiciler (date-fns yok — native Intl). */

export function formatInstant(iso: string): string {
  try {
    return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'medium' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatDateOnly(iso: string): string {
  try {
    return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'long' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/** "15 Oca 2026 09:12:30 · 06:12:30 UTC" — hukuki kayıt için yerel + UTC. */
export function formatInstantWithUtc(iso: string): string {
  try {
    const local = formatInstant(iso);
    const utc = new Intl.DateTimeFormat('tr-TR', {
      dateStyle: 'medium',
      timeStyle: 'medium',
      timeZone: 'UTC'
    }).format(new Date(iso));
    return `${local} · ${utc} UTC`;
  } catch {
    return iso;
  }
}
