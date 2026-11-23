"use client";

import { useActionState } from "react";
import { Button } from "@/components/Button";
import { FormError } from "@/components/FormError";
import { Input } from "@/components/Input";
import { MAX_NAME_LENGTH } from "@/domain/names";

type NameFormProps = {
  // Una Server Action con la firma de useActionState, ya con sus ids fijados con .bind.
  action: (
    prevState: { error?: string },
    formData: FormData,
  ) => Promise<{ error?: string }>;
  id: string;
  label: string;
  submitLabel: string;
  pendingLabel: string;
  defaultValue?: string;
  variant?: "primary" | "secondary";
};

// Form de un solo campo "name": sirve para crear y renombrar clubes, categorías, etc.
export function NameForm({
  action,
  id,
  label,
  submitLabel,
  pendingLabel,
  defaultValue,
  variant = "primary",
}: NameFormProps) {
  const [state, formAction, pending] = useActionState(action, {});

  // shortcut: React vacía el form después de cada envío, también si hubo error; si molesta,
  // devolver el nombre en el estado y usarlo como defaultValue.
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Input
        id={id}
        label={label}
        name="name"
        defaultValue={defaultValue}
        maxLength={MAX_NAME_LENGTH}
        autoComplete="off"
        required
      />
      <FormError message={state.error} />
      <Button
        type="submit"
        variant={variant}
        disabled={pending}
        className="self-start"
      >
        {pending ? pendingLabel : submitLabel}
      </Button>
    </form>
  );
}
