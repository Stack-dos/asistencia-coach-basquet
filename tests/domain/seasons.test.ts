import { describe, expect, test } from "vitest";
import { seasonCandidates, type SeasonMembership } from "@/domain/seasons";

const person = (id: string, last_name: string, first_name = "X") => ({
  id,
  first_name,
  last_name,
});
const membership = (
  player: ReturnType<typeof person>,
  category: string,
  left_on: string | null = null,
): SeasonMembership => ({ left_on, player, category: { name: category } });

describe("seasonCandidates", () => {
  test("sólo los activos al cierre: con baja quedan afuera (ya son abandono)", () => {
    const juan = person("1", "Pérez");
    const ana = person("2", "Gómez");
    const result = seasonCandidates(
      [membership(juan, "U13"), membership(ana, "U13", "2026-05-15")],
      [],
    );
    expect(result.map((c) => c.player.id)).toEqual(["1"]);
  });

  test("un jugador en dos categorías aparece una vez, con las dos (D-10)", () => {
    const juan = person("1", "Pérez");
    const result = seasonCandidates(
      [membership(juan, "U15"), membership(juan, "U13")],
      [],
    );
    expect(result).toEqual([
      { player: juan, previous: ["U13", "U15"], assignedTo: [] },
    ]);
  });

  test("marca dónde ya está en la temporada nueva; ignora a quien no venía de la anterior", () => {
    const juan = person("1", "Pérez");
    const nuevo = person("9", "Nuevo");
    const result = seasonCandidates(
      [membership(juan, "U13")],
      [membership(juan, "U15"), membership(nuevo, "U15")],
    );
    expect(result).toEqual([
      { player: juan, previous: ["U13"], assignedTo: ["U15"] },
    ]);
  });

  test("ordena por categoría anterior y después por apellido (con acentos)", () => {
    const result = seasonCandidates(
      [
        membership(person("1", "Zárate"), "U13"),
        membership(person("2", "Álvarez"), "U15"),
        membership(person("3", "Bustos"), "U13"),
      ],
      [],
    );
    expect(result.map((c) => c.player.last_name)).toEqual([
      "Bustos",
      "Zárate",
      "Álvarez",
    ]);
  });
});
