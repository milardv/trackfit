export function getAuthErrorMessage(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  ) {
    const code = (error as { code: string }).code;
    if (code === "auth/popup-closed-by-user") {
      return "La fenetre de connexion a ete fermee.";
    }
    if (code === "auth/cancelled-popup-request") {
      return "Une connexion est deja en cours.";
    }
    if (code === "auth/popup-blocked") {
      return "Le navigateur a bloque la popup. Autorise les popups puis recommence.";
    }
  }

  return "Connexion impossible pour le moment. Reessaie dans quelques secondes.";
}
