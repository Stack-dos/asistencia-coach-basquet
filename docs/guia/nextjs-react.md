# Guía: Next.js 16 y React

Conceptos usados en US-101 y US-102, con ejemplos del proyecto. Next 16 cambió varias APIs respecto
de versiones anteriores: ante la duda, la documentación de la versión instalada está en
`node_modules/next/dist/docs/`.

## 1. Componentes y JSX

Un **componente de React** es una función que devuelve **JSX** (HTML dentro de TypeScript):

```tsx
export default function ClubesPage() {
  return <h1 className="text-2xl">Clubes</h1>;
}
```

Diferencias con HTML: `className` en vez de `class`, `htmlFor` en vez de `for`, `{expresión}` para
insertar valores de JS. Para mostrar algo condicionalmente:

```tsx
{
  state.error && <p role="alert">{state.error}</p>;
} // si error es undefined, no renderiza nada
```

`return null` = no mostrar nada. `<>...</>` (_fragmento_) agrupa elementos sin agregar un `<div>`.

## 2. App Router: las carpetas son rutas

Cada carpeta dentro de `src/app/` es un tramo de la URL, y **los nombres de archivo tienen
significado** (archivos especiales):

| Archivo      | Qué es                                                                                                                            | Ejemplo en el proyecto                |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `page.tsx`   | La página de esa ruta. Sin él, la ruta no existe.                                                                                 | `src/app/clubes/page.tsx` → `/clubes` |
| `layout.tsx` | Marco que envuelve a todas las páginas de esa carpeta y abajo.                                                                    | `src/app/layout.tsx` (raíz)           |
| `route.ts`   | **Route Handler**: responde a un request HTTP con código, sin página. Exporta funciones con el nombre del método (`GET`, `POST`). | `src/app/auth/confirm/route.ts`       |
| `proxy.ts`   | Corre **antes** de cada request (en Next ≤15 se llamaba `middleware.ts`).                                                         | `src/proxy.ts`                        |

**Route groups:** una carpeta entre paréntesis agrupa rutas **sin aparecer en la URL**:
`src/app/(auth)/login/page.tsx` responde en `/login`.

**`export default`:** Next importa el export por defecto de `page.tsx` y `layout.tsx`. Los demás
componentes usan export con nombre (`export function LoginForm`).

## 3. Server Components vs Client Components

|                                      | Server Component (por defecto)    | Client Component (`"use client"`)                         |
| ------------------------------------ | --------------------------------- | --------------------------------------------------------- |
| Dónde corre                          | Servidor; al navegador llega HTML | Navegador (y una vez en el servidor para el HTML inicial) |
| Hooks (`useState`, `useActionState`) | ❌                                | ✅                                                        |
| Leer cookies, base de datos          | ✅                                | ❌                                                        |
| `async` / `await` en el componente   | ✅                                | ❌                                                        |
| Exportar `metadata`                  | ✅                                | ❌                                                        |

**Regla:** Server por defecto; Client sólo donde hay interacción. Un Server Component puede
renderizar un Client Component, **no al revés**. Por eso `/login` es una página de servidor que
contiene `<LoginForm />` (cliente).

## 4. Hooks

Funciones de React que empiezan con `use` y sólo funcionan dentro de componentes de cliente.

**`useActionState`** conecta un formulario con una Server Action y guarda lo que devolvió:

```tsx
const [state, formAction, pending] = useActionState(signIn, {});
// state: lo último que devolvió signIn ({ error } o {});  pending: true mientras corre
return <form action={formAction}>...</form>;
```

La action recibe `(prevState, formData)` y devuelve el nuevo estado.

## 5. Server Actions (`"use server"`)

Funciones que corren **en el servidor** y se llaman desde un `<form action={...}>`. Next hace un
POST por detrás.

- `"use server"` al principio del archivo: **toda** función exportada es una Server Action, y se
  puede llamar con un POST desde cualquier navegador. Por eso las funciones de **lectura**
  (`getCurrentUserEmail`) van en otro archivo sin esa directiva.
- Lo que llega en `FormData` es input no confiable: validar siempre (`typeof x !== "string"`).
- Pueden escribir cookies (los Server Components no).
- **Progressive enhancement:** un `<form action={signOut}>` funciona incluso sin JavaScript.

## 6. `redirect()`

De `next/navigation`. **Lanza una excepción especial** que Next atrapa para redirigir:

- El código después de `redirect()` no se ejecuta.
- **Nunca dentro de `try/catch`**: el `catch` se la "come" y la redirección no ocurre.

## 7. Renderizado: estático, dinámico y Partial Prerender

El build (`npm run build`) muestra cómo se genera cada ruta:

| Símbolo | Tipo              | Qué significa                                                      | Ejemplo             |
| ------- | ----------------- | ------------------------------------------------------------------ | ------------------- |
| `○`     | Static            | HTML generado al compilar; se sirve igual a todos.                 | `/registro`         |
| `◐`     | Partial Prerender | La mayor parte al compilar; un pedazo se completa en cada request. | `/login`, `/clubes` |
| `ƒ`     | Dynamic           | Se ejecuta en cada request.                                        | `/auth/confirm`     |

### `cacheComponents` y `<Suspense>`

Con `cacheComponents: true` (en `next.config.ts`), Next intenta prerenderizar todo. Los **datos del
request** (cookies, query params de la URL) no se conocen al compilar, así que el componente que
los lee **tiene que ir dentro de `<Suspense>`**:

```tsx
async function Greeting() {
  const email = await getCurrentUserEmail(); // lee cookies
  return <p>Hola, {email}</p>;
}

export default function ClubesPage() {
  return (
    <main>
      <h1>Clubes</h1> {/* se prerenderiza */}
      <Suspense fallback={<p>Cargando…</p>}>
        <Greeting /> {/* se completa en cada request */}
      </Suspense>
    </main>
  );
}
```

Sin el `<Suspense>`, el build falla. Si el `await` estuviera en `ClubesPage`, toda la página sería
dinámica.

## 8. Tipos generados: `PageProps` y `LayoutProps`

Next 16 genera tipos globales a partir de tus rutas (`next typegen`, que corre en `npm run
typecheck`):

```tsx
export default function LoginPage(props: PageProps<"/login">) {
  // props.searchParams es una Promise: se lee con await (dentro de <Suspense>)
}
```

## 9. Leer la URL

- Server Component: `props.searchParams` (promesa).
- Client Component: `useSearchParams()` (también exige `<Suspense>`).
- Route Handler / proxy: `request.nextUrl.searchParams.get("token_hash")`.

## 10. Cookies

- En Server Components, Server Actions y Route Handlers: `await cookies()` de `next/headers`
  (async en Next 15+).
- **Sólo Server Actions y Route Handlers pueden escribir.** Un Server Component no: los headers
  HTTP (donde viaja `Set-Cookie`) ya se enviaron.
- En `proxy.ts`: `request.cookies` para leer y `response.cookies` para escribir.

## 11. `proxy.ts`

```ts
export async function proxy(request: NextRequest) {
  // ...decidir
  return NextResponse.next({ request }); // dejar pasar
  // o NextResponse.redirect(new URL("/login", request.url))
}
export const config = { matcher: [/* qué rutas pasan por acá */] };
```

- Hace **chequeos optimistas**: rápido, sólo lee la cookie. La seguridad real de los datos está en
  la base (RLS, desde US-201).
- Sin `matcher`, también procesa CSS, JS e imágenes: con "todo privado por defecto", el CSS del
  login redirigiría a `/login`.

## 12. Variables de entorno

- `.env.local` (no se commitea) → `process.env.X`. Reiniciar `next dev` al cambiarlas.
- El prefijo `NEXT_PUBLIC_` copia el valor **literalmente** en el JavaScript del navegador **al
  compilar**: cualquiera lo ve, y cambiarlo exige un nuevo build/deploy. Sólo para valores públicos
  (URL y publishable key de Supabase).
- Sólo se reemplaza el acceso literal `process.env.NEXT_PUBLIC_X`, no `process.env[nombre]`.

## 13. Otros componentes de Next usados

- `next/link` → `<Link href="/login">`: navega sin recargar la página completa.
- `next/font` → fuentes descargadas al compilar y servidas desde tu dominio.
- `next/image` → `<Image>`: `<img>` optimizada.
- `@vercel/analytics/next` y `@vercel/speed-insights/next` → en el layout raíz para medir todas
  las páginas.

## 14. Accesibilidad en formularios

- `<label htmlFor="email">` + `<input id="email">`: el lector de pantalla anuncia el campo.
- `type="email"`, `autoComplete="email" | "current-password" | "new-password"`: teclado correcto en
  el celular y gestor de contraseñas.
- `required`, `minLength`: validación del navegador (comodidad, **no** seguridad).
- `aria-describedby`: conecta el input con su texto de ayuda.
- `role="alert"` para errores, `role="status"` para confirmaciones.

## 15. Errores comunes

| Error                                                               | Síntoma                                           |
| ------------------------------------------------------------------- | ------------------------------------------------- |
| Hook en un Server Component                                         | `useActionState only works in Client Components`  |
| Leer cookies o la URL fuera de `<Suspense>`                         | El build falla (runtime data during prerendering) |
| `redirect()` dentro de `try/catch`                                  | La redirección nunca ocurre                       |
| `name` del input distinto del que lee la action                     | `formData.get` devuelve `null`                    |
| Importar `server.ts` (usa `next/headers`) desde un Client Component | Error de compilación                              |
| Abrir la app en `127.0.0.1` y el email apunta a `localhost`         | La sesión "desaparece" (cookies distintas)        |
