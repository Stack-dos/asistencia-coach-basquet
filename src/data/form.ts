import { normalizeName, type NameResult } from "@/domain/names";

// El FormData llega del navegador: el campo puede faltar o venir como archivo.
// En ese caso se trata como vacío, y normalizeName devuelve su error.
export function readName(formData: FormData): NameResult {
  const name = formData.get("name");
  return normalizeName(typeof name === "string" ? name : "");
}
