// Mismo rango que el check categories_season_year_check de la migración 0003.
export const MIN_SEASON_YEAR = 2000;
export const MAX_SEASON_YEAR = 2100;

// La temporada es el año calendario (D-23) en Argentina: el servidor corre en UTC y el
// 31/12 a las 21 h de acá ya sería el año siguiente.
export function currentSeasonYear(now: Date = new Date()): number {
  const year = new Intl.DateTimeFormat("en", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
  }).format(now);
  return Number(year);
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
