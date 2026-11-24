import { defaultDateInSeason } from "@/domain/season";

// Un mes es un string "AAAA-MM" (mes con cero a la izquierda). Así va directo a la URL (?mes=)
// y se ordena igual alfabética que cronológicamente ("2026-09" < "2026-10").

/** Suma `delta` meses (positivo o negativo) a "AAAA-MM". */
function addMonths(month: string, delta: number): string {
  const year = Number(month.slice(0, 4));
  const monthIndex = Number(month.slice(5, 7)) - 1; // 0..11 para poder usar división y módulo
  const total = year * 12 + monthIndex + delta;
  const newYear = Math.floor(total / 12);
  const newMonth = (total % 12) + 1;
  return `${newYear}-${String(newMonth).padStart(2, "0")}`;
}

export function nextMonth(month: string): string {
  return addMonths(month, 1);
}

export function previousMonth(month: string): string {
  return addMonths(month, -1);
}

/**
 * Rango semiabierto [from, to) del mes, para filtrar con held_on >= from and held_on < to.
 * Como `to` es el 1° del mes siguiente, no hace falta saber cuántos días tiene el mes.
 */
export function monthRange(month: string): { from: string; to: string } {
  return { from: `${month}-01`, to: `${nextMonth(month)}-01` };
}

/**
 * Mes de `?mes=` si es válido y cae en la temporada de la categoría; si no, el mes por defecto:
 * el actual si hoy está en la temporada, si no enero (futura) o diciembre (pasada).
 */
export function parseMonth(
  raw: string | string[] | undefined,
  seasonYear: number,
  today: string,
): string {
  // Formato exacto AAAA-MM con mes 01..12: descarta "2026-13", "2026-3", "hola" y arrays.
  if (
    typeof raw === "string" &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(raw) &&
    Number(raw.slice(0, 4)) === seasonYear
  ) {
    return raw;
  }
  return defaultDateInSeason(seasonYear, today).slice(0, 7);
}
