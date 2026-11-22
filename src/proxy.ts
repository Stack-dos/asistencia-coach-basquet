import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getAuthRedirect } from "@/domain/auth-redirect";

// Corre antes de cada request: refresca la sesión y aplica la regla de rutas públicas/privadas.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          // En el request, para que las páginas de este mismo request vean el token renovado.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          // En la respuesta, para que el navegador lo guarde.
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          // Anti-caché: un CDN no debe servir la cookie de sesión de un usuario a otro.
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value),
          );
        },
      },
    },
  );

  // getClaims verifica la firma del JWT (y lo renueva si venció); getSession no verifica nada.
  const { data } = await supabase.auth.getClaims();
  const destination = getAuthRedirect(
    request.nextUrl.pathname,
    Boolean(data?.claims),
  );
  if (!destination) return response;

  const redirect = NextResponse.redirect(new URL(destination, request.url));
  // Si el token se renovó, la redirección tiene que llevar las cookies nuevas.
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export const config = {
  // Sin esto, el CSS/JS/imágenes también pasarían por acá y redirigirían a /login.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
