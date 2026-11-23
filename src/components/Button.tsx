import type { ComponentProps } from "react";

const VARIANTS = {
  primary: "bg-accent text-white hover:bg-accent-strong",
  secondary: "border border-line-strong bg-surface hover:bg-background",
  danger: "bg-danger text-white hover:bg-red-800",
  // Para fondos oscuros, como la banda del encabezado.
  onDark: "border border-stone-600 text-background hover:bg-white/10",
};

type ButtonProps = ComponentProps<"button"> & {
  variant?: keyof typeof VARIANTS;
};

// min-h-11 = 44 px: tamaño mínimo cómodo para tocar con el dedo.
// Exportada para dar estilo de botón a un <Link> (navegar no es trabajo de un <button>).
export function buttonClasses(variant: keyof typeof VARIANTS = "primary") {
  return `inline-flex min-h-11 items-center justify-center rounded-lg px-4 font-semibold no-underline disabled:pointer-events-none disabled:opacity-45 ${VARIANTS[variant]}`;
}

// Recibe todo lo que acepta un <button> (type, disabled, onClick…) y lo pasa con {...rest}.
export function Button({
  variant = "primary",
  className = "",
  ...rest
}: ButtonProps) {
  return (
    <button className={`${buttonClasses(variant)} ${className}`} {...rest} />
  );
}
