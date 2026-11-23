import { normalizeName } from "@/domain/names";

// Mismo mínimo que players_birth_year_check (0004). El máximo es el año actual.
export const MIN_BIRTH_YEAR = 1900;

/** Los campos tal como llegan del formulario (texto; "" si faltan). */
export type PlayerFields = {
  firstName: string;
  lastName: string;
  birthYear: string;
  joinedOn: string;
};

/** Los mismos campos, validados y normalizados para guardar. */
export type PlayerInput = {
  firstName: string;
  lastName: string;
  birthYear: number | null;
  joinedOn: string;
};

export type PlayerInputResult =
  { ok: true; value: PlayerInput } | { ok: false; error: string };

/** ¿Es "AAAA-MM-DD" y una fecha que existe? ("2026-02-30" no existe). */
export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  // Date.UTC "corrige" las fechas imposibles (30/2 → 2/3): si al volver a texto cambia, no existía.
  const [year, month, day] = value.split("-").map(Number);
  return (
    new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) ===
    value
  );
}

/** Error de la fecha de alta, o null si es válida para la temporada (AC5). */
export function joinedOnError(
  joinedOn: string,
  seasonYear: number,
): string | null {
  if (!isValidIsoDate(joinedOn)) return "La fecha de alta no es válida.";
  if (Number(joinedOn.slice(0, 4)) !== seasonYear) {
    return `La fecha de alta tiene que estar dentro de la temporada ${seasonYear}.`;
  }
  return null;
}

/**
 * Valida el formulario de jugador (AC1, AC2, AC5). Es la misma regla que la base, pero con
 * mensajes claros y sin ida y vuelta al servidor de Supabase.
 */
export function parsePlayerInput(
  fields: PlayerFields,
  seasonYear: number,
  currentYear: number,
): PlayerInputResult {
  const firstName = normalizeName(fields.firstName);
  if (!firstName.ok) return firstName;
  const lastName = normalizeName(fields.lastName, "El apellido");
  if (!lastName.ok) return lastName;

  let birthYear: number | null = null;
  const rawYear = fields.birthYear.trim();
  if (rawYear !== "") {
    birthYear = Number(rawYear);
    if (
      !/^\d{4}$/.test(rawYear) ||
      birthYear < MIN_BIRTH_YEAR ||
      birthYear > currentYear
    ) {
      return {
        ok: false,
        error: `El año de nacimiento tiene que estar entre ${MIN_BIRTH_YEAR} y ${currentYear}.`,
      };
    }
  }

  const dateError = joinedOnError(fields.joinedOn, seasonYear);
  if (dateError) return { ok: false, error: dateError };

  return {
    ok: true,
    value: {
      firstName: firstName.name,
      lastName: lastName.name,
      birthYear,
      joinedOn: fields.joinedOn,
    },
  };
}

/**
 * ¿Es el mismo nombre y apellido? Ignora mayúsculas y acentos: "Perez" y "Pérez" son el mismo
 * (AC6: mejor ofrecer de más que duplicar a la persona).
 */
export function isSameName(
  a: { firstName: string; lastName: string },
  b: { firstName: string; lastName: string },
): boolean {
  const same = (x: string, y: string) =>
    x.localeCompare(y, "es", { sensitivity: "base" }) === 0;
  return same(a.firstName, b.firstName) && same(a.lastName, b.lastName);
}

/** "2026-03-02" → "02/03/2026", sin pasar por Date (que lo leería en UTC y podría correr el día). */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}
