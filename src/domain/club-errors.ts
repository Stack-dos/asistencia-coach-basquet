// Traducen los códigos SQLSTATE de Postgres (error.code de supabase-js) a mensajes para el usuario.
const UNEXPECTED = "Ocurrió un error inesperado. Probá de nuevo.";
const UNIQUE_VIOLATION = "23505";

export function clubErrorMessage(code: string | undefined): string {
  // clubs_coach_id_name_key
  if (code === UNIQUE_VIOLATION) return "Ya tenés un club con ese nombre.";
  return UNEXPECTED;
}

export function playerErrorMessage(code: string | undefined): string {
  switch (code) {
    case "23P01": // exclusion_violation: category_players_no_overlap
      return "Ese jugador ya está en esta categoría en esas fechas.";
    case "23514": // check_violation: trigger de temporada/club o baja anterior al alta
      return "La fecha de alta no es válida para esta categoría (fuera de la temporada o posterior a la baja).";
    default:
      return UNEXPECTED;
  }
}

export function categoryErrorMessage(code: string | undefined): string {
  // categories_club_id_name_season_year_key
  if (code === UNIQUE_VIOLATION)
    return "Ya tenés una categoría con ese nombre en esta temporada.";
  return UNEXPECTED;
}
