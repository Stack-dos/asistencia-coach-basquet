import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Destino de los links de los emails (confirmación y recuperación): valida el código y crea la sesión.
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  // verifyOtp rechaza cualquier type inválido, por eso alcanza con la aserción.
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) redirect(type === "recovery" ? "/nueva-contrasena" : "/clubes");
  }

  redirect("/login?error=link-invalido");
}
