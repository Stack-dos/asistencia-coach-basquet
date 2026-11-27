// @vitest-environment happy-dom
import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AttendanceList } from "@/components/AttendanceList";
import type { AttendanceRow } from "@/data/attendances";

afterEach(cleanup);

function row(id: string, lastName: string, present: boolean): AttendanceRow {
  return {
    player: {
      id,
      first_name: "Nombre",
      last_name: lastName,
      birth_year: null,
      guardian_name: null,
      guardian_phone: null,
    },
    present,
  };
}

const rows = [row("p-1", "Álvarez", true), row("p-2", "Benítez", false)];
const action = vi.fn(async () => ({}));

const checkbox = (name: string) =>
  screen.getByLabelText<HTMLInputElement>(name);

describe("AttendanceList", () => {
  test("AC3: muestra lo guardado y cuenta los presentes", () => {
    render(<AttendanceList rows={rows} action={action} />);

    expect(checkbox("Álvarez, Nombre").checked).toBe(true);
    expect(checkbox("Benítez, Nombre").checked).toBe(false);
    expect(screen.getByText("1 de 2 presentes")).toBeTruthy();
    expect(screen.queryByText("Cambios sin guardar")).toBeNull();
  });

  test("tocar un jugador actualiza el contador y avisa que hay cambios sin guardar", async () => {
    const user = userEvent.setup();
    render(<AttendanceList rows={rows} action={action} />);

    await user.click(screen.getByLabelText("Benítez, Nombre"));

    expect(screen.getByText("2 de 2 presentes")).toBeTruthy();
    expect(screen.getByText("Cambios sin guardar")).toBeTruthy();
  });

  test("AC4: un jugador agregado después de abrir la página aparece presente sin perder los toques", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<AttendanceList rows={rows} action={action} />);
    await user.click(screen.getByLabelText("Álvarez, Nombre")); // lo destilda

    // Lo que pasa cuando el servidor re-renderiza después de agregar a Castro.
    rerender(
      <AttendanceList
        rows={[...rows, row("p-3", "Castro", false)]}
        action={action}
      />,
    );

    expect(checkbox("Castro, Nombre").checked).toBe(true);
    expect(checkbox("Álvarez, Nombre").checked).toBe(false);
    expect(screen.getByText("1 de 3 presentes")).toBeTruthy();
  });

  test("AC2: al guardar manda los tildados y los checkboxes siguen tildados", async () => {
    const user = userEvent.setup();
    const save = vi.fn(async (_prev: unknown, formData: FormData) => {
      void formData;
      return { saved: true };
    });
    render(<AttendanceList rows={rows} action={save} />);
    await user.click(screen.getByLabelText("Benítez, Nombre"));

    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(save).toHaveBeenCalledOnce());
    const formData = save.mock.calls[0][1];
    expect(formData.getAll("present")).toEqual(["p-1", "p-2"]);
    // La acción terminó cuando el botón deja de decir "Guardando…".
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Guardar" })).toBeTruthy(),
    );
    // Bug: React reseteaba el form (form.reset()) después de la acción y los destildaba.
    expect(checkbox("Álvarez, Nombre").checked).toBe(true);
    expect(checkbox("Benítez, Nombre").checked).toBe(true);
  });
});
