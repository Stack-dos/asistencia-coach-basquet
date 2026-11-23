// Códigos SQLSTATE de Postgres que llegan en error.code de supabase-js.
export function clubErrorMessage(code: string | undefined): string {
  switch (code) {
    case "23505": // unique_violation: clubs_coach_id_name_key
      return "Ya tenés un club con ese nombre.";
    default:
      return "Ocurrió un error inesperado. Probá de nuevo.";
  }
}
