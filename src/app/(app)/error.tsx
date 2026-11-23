"use client"; // Los error boundaries tienen que ser Client Components.

import { useEffect } from "react";
import { Button } from "@/components/Button";

// Ataja los errores no manejados de las páginas privadas (por ejemplo, listClubs que lanza).
export default function AppError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="flex flex-col items-start gap-3">
      <h1 className="text-4xl">Algo salió mal</h1>
      <p>No pudimos cargar esta página. Probá de nuevo en unos segundos.</p>
      <Button type="button" onClick={retry}>
        Reintentar
      </Button>
    </section>
  );
}
