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

  if (pathname === "/") return isLoggedIn ? HOME : LOGIN;

  if (AUTH_PAGES.includes(pathname)) return isLoggedIn ? HOME : null;

  return isLoggedIn ? null : LOGIN;
}
