export function authErrorMessage(code: string | undefined): string {
  switch (code) {
    case "invalid_credentials":
      return "Email o contraseña incorrectos.";
    case "email_not_confirmed":
      return "Tenés que confirmar tu email antes de ingresar. Revisá tu bandeja de entrada (y la carpeta de spam).";
    case "weak_password":
      return "La contraseña tiene que tener al menos 8 caracteres.";
    case "over_email_send_rate_limit":
      return "Se enviaron demasiados emails. Esperá unos minutos y probá de nuevo.";
    default:
      return "Ocurrió un error inesperado. Probá de nuevo.";
  }
}
