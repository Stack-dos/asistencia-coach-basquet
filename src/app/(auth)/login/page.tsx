import { Suspense } from "react";
import { LoginForm } from "./login-form";

// Lee la URL (dato del request): va dentro de <Suspense> para que el resto de la página se prerenderice.
async function LinkError({
  searchParams,
}: {
  searchParams: PageProps<"/login">["searchParams"];
}) {
  const { error } = await searchParams;
  if (error !== "link-invalido") return null;
  return (
    <p role="alert" className="rounded-lg bg-red-100 px-3 py-2 text-red-800">
      El enlace no es válido o ya venció. Ingresá con tu email y contraseña, o
      pedí uno nuevo.
    </p>
  );
}

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-col gap-6 p-6">
      <h1 className="text-4xl">Ingresar</h1>
      <Suspense>
        <LinkError searchParams={props.searchParams} />
      </Suspense>
      <LoginForm />
    </main>
  );
}
