import { EmptyState } from "@/components/EmptyState";

// Estadísticas de la categoría: llegan en US-402.
export default function CategoryStatsPage() {
  return (
    <EmptyState
      title="Todavía no hay estadísticas"
      description="Cuando tomes asistencia, las estadísticas se van a ver acá."
    />
  );
}
