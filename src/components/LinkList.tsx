import Link from "next/link";

type LinkItem = { href: string; label: string; detail?: string };

// Listado de tarjetas-link (clubes, categorías, jugadores…). min-h-11: fácil de tocar en el celular.
export function LinkList({ items }: { items: LinkItem[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            className="flex min-h-11 flex-col justify-center rounded-lg border border-line-strong bg-surface px-4 py-3"
          >
            <span className="font-semibold">{item.label}</span>
            {item.detail && (
              <span className="text-sm text-muted">{item.detail}</span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
