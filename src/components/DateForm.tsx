"use client";

import { useActionState } from "react";
import { Button } from "@/components/Button";
import { FormError } from "@/components/FormError";
import { Input } from "@/components/Input";

type DateFormProps = {
  // Server Action con sus ids ya fijados con .bind (markLeft o rejoinPlayer).
  action: (
    prevState: { error?: string },
    formData: FormData,
  ) => Promise<{ error?: string }>;
  id: string;
  name: string;
  label: string;
  defaultValue: string;
  // El navegador no deja elegir fuera de [min, max]; el servidor lo vuelve a validar.
  min: string;
  max: string;
  submitLabel: string;
  pendingLabel: string;
  variant?: "primary" | "secondary" | "danger";
};

// Form de un solo campo fecha: dar de baja y volver a cargar (US-204).
export function DateForm({
  action,
  id,
  name,
  label,
  defaultValue,
  min,
  max,
  submitLabel,
  pendingLabel,
  variant = "primary",
}: DateFormProps) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Input
        id={id}
        label={label}
        name={name}
        type="date"
        defaultValue={defaultValue}
        min={min}
        max={max}
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
