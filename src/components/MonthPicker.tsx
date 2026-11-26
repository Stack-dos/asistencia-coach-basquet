import Link from "next/link";
import { nextMonth, previousMonth } from "@/domain/months";

// "2026-03" → "marzo 2026". UTC en los dos lados: así el 1° no se corre al mes anterior.
function monthLabel(month: string): string {
  const name = new Intl.DateTimeFormat("es-AR", {
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00Z`));
  return `${name} ${month.slice(0, 4)}`;
}

// ‹ marzo 2026 ›: links comunes a ?mes=, como SeasonPicker. Sin flechas fuera de la temporada (AC4).
export function MonthPicker({
  basePath,
  month,
  seasonYear,
}: {
  basePath: string;
  month: string;
  seasonYear: number;
}) {
  const previous = previousMonth(month);
  const next = nextMonth(month);
  // "AAAA-MM" se ordena alfabéticamente igual que cronológicamente.
  const first = `${seasonYear}-01`;
  const last = `${seasonYear}-12`;
  const arrow =
    "flex size-11 items-center justify-center rounded-lg border border-line-strong bg-surface text-xl no-underline";
  return (
    <nav aria-label="Mes" className="flex items-center gap-3">
      {previous >= first && (
        <Link
          href={`${basePath}?mes=${previous}`}
          aria-label={monthLabel(previous)}
          className={arrow}
        >
          ‹
        </Link>
      )}
      <span
        className="text-2xl font-semibold first-letter:uppercase"
        aria-current="page"
      >
        {monthLabel(month)}
      </span>
      {next <= last && (
        <Link
          href={`${basePath}?mes=${next}`}
          aria-label={monthLabel(next)}
          className={arrow}
        >
          ›
        </Link>
      )}
    </nav>
  );
}
