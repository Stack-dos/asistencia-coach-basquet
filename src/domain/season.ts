// Mismo rango que el check categories_season_year_check de la migración 0003.
export const MIN_SEASON_YEAR = 2000;
export const MAX_SEASON_YEAR = 2100;

/**
 * Fecha de hoy en Argentina como "AAAA-MM-DD" (el formato de <input type="date"> y de Postgres).
 * El servidor corre en UTC: el 31/12 a las 21 h de acá allá ya es el año siguiente.
 */
export function todayInArgentina(now: Date = new Date()): string {
  // en-CA formatea como AAAA-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(now);
}

// La temporada es el año calendario (D-23) en Argentina.
export function currentSeasonYear(now: Date = new Date()): number {
  return Number(todayInArgentina(now).slice(0, 4));
}

/** Año de `?temporada=` de la URL; si falta o no es válido, el año actual. */
export function parseSeasonYear(
  raw: string | string[] | undefined,
  currentYear: number,
): number {
  // /^\d{4}$/ descarta "2026abc", "20.26" y " 2026", que Number() o parseInt() aceptarían.
  if (typeof raw !== "string" || !/^\d{4}$/.test(raw)) return currentYear;
  const year = Number(raw);
  if (year < MIN_SEASON_YEAR || year > MAX_SEASON_YEAR) return currentYear;
  return year;
}

/**
 * Fecha propuesta en los formularios de alta, baja y vuelta: hoy, si cae en la temporada de la
 * categoría; si no, el día de la temporada más cercano a hoy (31/12 de una pasada, 1/1 de una
 * futura).
 */
export function defaultDateInSeason(seasonYear: number, today: string): string {
  const year = Number(today.slice(0, 4));
  if (year === seasonYear) return today;
  return year > seasonYear ? `${seasonYear}-12-31` : `${seasonYear}-01-01`;
}
