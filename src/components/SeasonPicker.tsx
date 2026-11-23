import Link from "next/link";
import { MAX_SEASON_YEAR, MIN_SEASON_YEAR } from "@/domain/season";

// ‹ 2026 ›: links comunes a ?temporada=; no necesita estado en el cliente.
export function SeasonPicker({
  basePath,
  year,
}: {
  basePath: string;
  year: number;
}) {
  const arrow =
    "flex size-11 items-center justify-center rounded-lg border border-line-strong bg-surface text-xl no-underline";
  return (
    <nav aria-label="Temporada" className="flex items-center gap-3">
      {year > MIN_SEASON_YEAR && (
        <Link
          href={`${basePath}?temporada=${year - 1}`}
          aria-label={`Temporada ${year - 1}`}
          className={arrow}
        >
          ‹
        </Link>
      )}
      <span className="text-2xl font-semibold" aria-current="page">
        Temporada {year}
      </span>
      {year < MAX_SEASON_YEAR && (
        <Link
          href={`${basePath}?temporada=${year + 1}`}
          aria-label={`Temporada ${year + 1}`}
          className={arrow}
        >
          ›
        </Link>
      )}
    </nav>
  );
}
