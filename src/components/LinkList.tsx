import Link from "next/link";

// Listado de tarjetas-link (clubes, categorías…). min-h-11: fácil de tocar en el celular.
export function LinkList({
  items,
}: {
  items: { href: string; label: string }[];
}) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            className="flex min-h-11 items-center rounded-lg border border-line-strong bg-surface px-4 py-3 font-semibold"
          >
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
