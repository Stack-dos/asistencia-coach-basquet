import { EmptyState } from "@/components/EmptyState";

// Grilla de asistencia: llega en US-303.
export default function CategoryGridPage() {
  return (
    <EmptyState
      title="Todavía no hay grilla de asistencia"
      description="Cuando cargues jugadores y clases, vas a tomar asistencia acá."
    />
  );
}
