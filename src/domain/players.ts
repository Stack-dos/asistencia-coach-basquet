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

/** "2026-05-15" + 1 → "2026-05-16". En UTC, para que el horario local no corra el día. */
export function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10);
}

/**
 * Error de la fecha de baja (US-204), o null si es válida: dentro de la temporada y no antes del
 * alta. Es la regla del check category_players_dates_check y del trigger, con mensaje claro.
 */
export function leftOnError(
  leftOn: string,
  joinedOn: string,
  seasonYear: number,
): string | null {
  if (!isValidIsoDate(leftOn)) return "La fecha de baja no es válida.";
  if (Number(leftOn.slice(0, 4)) !== seasonYear) {
    return `La fecha de baja tiene que estar dentro de la temporada ${seasonYear}.`;
  }
  // Con "AAAA-MM-DD" el orden alfabético es el orden de las fechas.
  if (leftOn < joinedOn) {
    return `La fecha de baja no puede ser anterior al alta (${formatDate(joinedOn)}).`;
  }
  return null;
}

/**
 * Error de la fecha de vuelta (US-204, AC3), o null si es válida: dentro de la temporada y
 * posterior a la baja. El mismo día de la baja ya se superpone: los rangos incluyen sus extremos.
 */
export function rejoinDateError(
  joinedOn: string,
  previousLeftOn: string,
  seasonYear: number,
): string | null {
  const dateError = joinedOnError(joinedOn, seasonYear);
  if (dateError) return dateError;
  if (joinedOn <= previousLeftOn) {
    return `La vuelta tiene que ser posterior a la baja (${formatDate(previousLeftOn)}).`;
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

/**
 * ¿La pertenencia incluye la fecha? Alta y baja cuentan (mismo rango '[]' que el trigger
 * attendances_validate). Las fechas "AAAA-MM-DD" se comparan como strings.
 */
export function isActiveOn(
  membership: { joined_on: string; left_on: string | null },
  date: string,
): boolean {
  return (
    membership.joined_on <= date &&
    (membership.left_on === null || membership.left_on >= date)
  );
}
