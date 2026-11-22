// Pelota de básquet: decorativa, el nombre de la app va siempre al lado en texto.
export function Logo({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
      className="shrink-0 text-accent"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2v20M5 5c3 3 3 11 0 14M19 5c-3 3-3 11 0 14" />
    </svg>
  );
}
