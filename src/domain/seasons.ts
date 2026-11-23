// US-205: inicio de temporada. Lógica pura (sin base) para armar la lista de jugadores a pasar.

/** Nombre de cada <select> del form: "player:<playerId>" = id de la categoría nueva o "" (No sigue). */
export const PLAYER_FIELD = "player:";

type PlayerLike = { id: string; first_name: string; last_name: string };

/** Una pertenencia de la temporada, con el nombre de su categoría. */
export type SeasonMembership<P extends PlayerLike = PlayerLike> = {
  left_on: string | null;
  player: P;
  category: { name: string };
};

export type SeasonCandidate<P extends PlayerLike = PlayerLike> = {
  player: P;
  /** Categorías donde terminó la temporada anterior (puede ser más de una, D-10). */
  previous: string[];
  /** Categorías donde ya está en la temporada nueva (vacío si todavía no se lo pasó). */
  assignedTo: string[];
};

/**
 * Jugadores activos al cierre de la temporada anterior (pertenencia sin baja: su fin efectivo es
 * el 31/12), una vez cada uno aunque haya estado en dos categorías. Los que tienen baja quedan
 * afuera: ya abandonaron (RN-10). Ordenados por categoría anterior y apellido, para pasar un
 * plantel entero de corrido.
 */
export function seasonCandidates<P extends PlayerLike>(
  previous: SeasonMembership<P>[],
  next: SeasonMembership<P>[],
): SeasonCandidate<P>[] {
  const byPlayer = new Map<string, SeasonCandidate<P>>();
  for (const m of previous) {
    if (m.left_on !== null) continue;
    const candidate = byPlayer.get(m.player.id) ?? {
      player: m.player,
      previous: [],
      assignedTo: [],
    };
    candidate.previous.push(m.category.name);
    byPlayer.set(m.player.id, candidate);
  }
  for (const m of next) {
    byPlayer.get(m.player.id)?.assignedTo.push(m.category.name);
  }

  const candidates = [...byPlayer.values()];
  for (const c of candidates) c.previous.sort(byName);
  return candidates.sort(
    (a, b) =>
      byName(a.previous[0], b.previous[0]) ||
      byName(a.player.last_name, b.player.last_name) ||
      byName(a.player.first_name, b.player.first_name),
  );
}

function byName(a: string, b: string): number {
  return a.localeCompare(b, "es");
}
