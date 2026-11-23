"use client"; // usePathname lee la URL en el navegador para marcar la pestaña activa.

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { segment: "", label: "Grilla" },
  { segment: "/jugadores", label: "Jugadores" },
  { segment: "/clases", label: "Clases" },
  { segment: "/estadisticas", label: "Estadísticas" },
];

export function CategoryTabs({ basePath }: { basePath: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Secciones de la categoría" className="overflow-x-auto">
      <ul className="flex gap-1 border-b border-line-strong">
        {TABS.map((tab) => {
          const href = basePath + tab.segment;
          // Grilla sólo en su ruta exacta; las demás también en sus sub-rutas (.../jugadores/<id>).
          const active =
            tab.segment === ""
              ? pathname === href
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={tab.label}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center whitespace-nowrap px-3 no-underline ${
                  active
                    ? "border-b-2 border-accent font-semibold"
                    : "text-muted"
                }`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
