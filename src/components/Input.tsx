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
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      <input
        id={id}
        aria-describedby={hintId}
        className={`min-h-11 rounded-lg border border-line-strong bg-surface px-3 text-base ${className}`}
        {...rest}
      />
      {hint && (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
