import type { ComponentProps } from "react";

const VARIANTS = {
  primary: "bg-foreground text-background",
  secondary: "border",
  danger: "bg-red-600 text-white",
};

type ButtonProps = ComponentProps<"button"> & {
  variant?: keyof typeof VARIANTS;
};

// Recibe todo lo que acepta un <button> (type, disabled, onClick…) y lo pasa con {...rest}.
export function Button({
  variant = "primary",
  className = "",
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`rounded px-4 py-2 disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...rest}
    />
  );
}
