// Mismo máximo que el check clubs_name_check de la migración.
export const MAX_NAME_LENGTH = 80;

export type NameResult =
  { ok: true; name: string } | { ok: false; error: string };

/** Recorta, deja un solo espacio entre palabras y valida largo. Para clubes, categorías y jugadores. */
export function normalizeName(input: string): NameResult {
  const name = input.trim().replace(/\s+/g, " ");

  if (name === "") {
    return { ok: false, error: "El nombre no puede estar vacío." };
  }
  // [...name] cuenta caracteres como Postgres (char_length): "🏀".length es 2, [..."🏀"].length es 1.
  if ([...name].length > MAX_NAME_LENGTH) {
    return {
      ok: false,
      error: `El nombre puede tener hasta ${MAX_NAME_LENGTH} caracteres.`,
    };
  }
  return { ok: true, name };
}
