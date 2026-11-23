const HOME = "/clubes";
const LOGIN = "/login";

// Páginas para usuarios sin sesión: si ya hay sesión, no tiene sentido mostrarlas.
const AUTH_PAGES = ["/login", "/registro", "/recuperar"];

/**
 * Decide a dónde redirigir según la ruta y la sesión. Devuelve null si el usuario puede pasar.
 * Lista de públicas: cualquier ruta que no esté acá es privada por defecto.
 */
export function getAuthRedirect(
  pathname: string,
  isLoggedIn: boolean,
): string | null {
  // Links de los emails (confirmación, recuperación): tienen que funcionar siempre.
  if (pathname.startsWith("/auth/")) return null;

  // Landing: pública para todos; ella misma adapta los botones según la sesión.
  if (pathname === "/") return null;

  if (AUTH_PAGES.includes(pathname)) return isLoggedIn ? HOME : null;

  return isLoggedIn ? null : LOGIN;
}
