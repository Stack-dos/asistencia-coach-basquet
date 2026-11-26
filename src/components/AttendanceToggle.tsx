// Fila grande para tocar con el dedo en la cancha (AC5). Es un checkbox de verdad dentro de un
// <label>: tocar cualquier parte de la fila lo cambia, el lector de pantalla lo anuncia, y el
// form manda su value (el id del jugador) sólo si está tildado.
export function AttendanceToggle({
  playerId,
  name,
  checked,
  onChange,
}: {
  playerId: string;
  name: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-lg border border-line-strong bg-surface px-4 has-checked:border-accent has-checked:bg-accent has-checked:text-white">
      <span className="font-semibold">{name}</span>
      <input
        type="checkbox"
        name="present"
        value={playerId}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-6 accent-accent-strong"
      />
    </label>
  );
}
