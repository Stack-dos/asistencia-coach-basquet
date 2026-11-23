// Traducen los códigos SQLSTATE de Postgres (error.code de supabase-js) a mensajes para el usuario.
const UNEXPECTED = "Ocurrió un error inesperado. Probá de nuevo.";
const UNIQUE_VIOLATION = "23505";

export function clubErrorMessage(code: string | undefined): string {
  // clubs_coach_id_name_key
  if (code === UNIQUE_VIOLATION) return "Ya tenés un club con ese nombre.";
  return UNEXPECTED;
}

export function categoryErrorMessage(code: string | undefined): string {
  // categories_club_id_name_season_year_key
  if (code === UNIQUE_VIOLATION)
    return "Ya tenés una categoría con ese nombre en esta temporada.";
  return UNEXPECTED;
}
