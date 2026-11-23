import { EmptyState } from "@/components/EmptyState";

// Clases del mes: llegan en US-301.
export default function CategorySessionsPage() {
  return (
    <EmptyState
      title="Todavía no hay clases"
      description="Las clases de la categoría se van a ver acá."
    />
  );
}
