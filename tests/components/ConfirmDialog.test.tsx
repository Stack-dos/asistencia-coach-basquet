// @vitest-environment happy-dom
import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmDialog } from "@/components/ConfirmDialog";

afterEach(cleanup);

function setup(confirmText?: string) {
  const onConfirm = vi.fn();
  const user = userEvent.setup();
  render(
    <ConfirmDialog
      triggerLabel="Eliminar club"
      title="¿Eliminar el club?"
      description="Se borran todas sus categorías, jugadores y asistencias."
      confirmLabel="Eliminar"
      confirmText={confirmText}
      onConfirm={onConfirm}
    />,
  );
  const open = () =>
    user.click(screen.getByRole("button", { name: "Eliminar club" }));
  const confirmButton = () => screen.getByRole("button", { name: "Eliminar" });
  return { user, onConfirm, open, confirmButton };
}

describe("ConfirmDialog en modo 'escribí el nombre'", () => {
  test("el botón empieza deshabilitado", async () => {
    const { open, confirmButton } = setup("Club Atlético");
    await open();
    expect(confirmButton()).toHaveProperty("disabled", true);
  });

  test.each([
    ["incompleto", "Club Atl"],
    ["con otras mayúsculas", "club atlético"],
    ["sin tilde", "Club Atletico"],
    ["con espacio de más", "Club Atlético "],
  ])("sigue deshabilitado con el nombre %s", async (_, typed) => {
    const { user, open, confirmButton } = setup("Club Atlético");
    await open();
    await user.type(screen.getByRole("textbox"), typed);
    expect(confirmButton()).toHaveProperty("disabled", true);
  });

  test("se habilita con el nombre exacto y confirma", async () => {
    const { user, open, confirmButton, onConfirm } = setup("Club Atlético");
    await open();
    await user.type(screen.getByRole("textbox"), "Club Atlético");
    expect(confirmButton()).toHaveProperty("disabled", false);
    await user.click(confirmButton());
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  test("al cancelar no confirma y al reabrir el texto está vacío", async () => {
    const { user, open, confirmButton, onConfirm } = setup("Club Atlético");
    await open();
    await user.type(screen.getByRole("textbox"), "Club Atlético");
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onConfirm).not.toHaveBeenCalled();
    await open();
    expect(screen.getByRole("textbox")).toHaveProperty("value", "");
    expect(confirmButton()).toHaveProperty("disabled", true);
  });
});

describe("ConfirmDialog simple (sin nombre)", () => {
  test("no pide escribir nada y confirma directo", async () => {
    const { user, open, confirmButton, onConfirm } = setup();
    await open();
    expect(screen.queryByRole("textbox")).toBeNull();
    await user.click(confirmButton());
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
