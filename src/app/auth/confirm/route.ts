import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Destino de los links de los emails (plantillas por defecto, flujo PKCE): Supabase verifica el
// link y redirige acá con un `code`, que se canjea por la sesión.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const isRecovery = request.nextUrl.searchParams.get("type") === "recovery";

  if (code) {
    const supabase = await createClient();
    // Falla si el link se abre en otro navegador: el "code verifier" quedó en una cookie del original.
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) redirect(isRecovery ? "/nueva-contrasena" : "/clubes");
  }

  redirect("/login?error=link-invalido");
}
