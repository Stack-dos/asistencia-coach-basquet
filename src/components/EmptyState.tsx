import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description?: string;
  // Acción opcional, por ejemplo el botón "Crear club" (US-201).
  children?: ReactNode;
};

export function EmptyState({ title, description, children }: EmptyStateProps) {
  return (
    <section className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line-strong bg-surface p-8 text-center">
      <h2 className="text-2xl">{title}</h2>
      {description && <p className="text-muted">{description}</p>}
      {children}
    </section>
  );
}
