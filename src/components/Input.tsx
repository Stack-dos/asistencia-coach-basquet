import type { ComponentProps } from "react";

type InputProps = ComponentProps<"input"> & {
  id: string;
  label: string;
  hint?: string;
};

// El label es obligatorio: un input sin label no se puede usar con lector de pantalla.
export function Input({
  id,
  label,
  hint,
  className = "",
  ...rest
}: InputProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        aria-describedby={hintId}
        className={`rounded border px-3 py-2 ${className}`}
        {...rest}
      />
      {hint && (
        <p id={hintId} className="text-sm opacity-70">
          {hint}
        </p>
      )}
    </div>
  );
}
