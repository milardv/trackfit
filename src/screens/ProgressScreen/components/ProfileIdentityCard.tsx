import type { ProfileIdentityCardProps } from "./types.ts";

export function ProfileIdentityCard({
  displayName,
  email,
  photoURL,
  completedSessions,
  thisMonthSessions,
  onSignOut,
  isSigningOut,
}: ProfileIdentityCardProps) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-white/5 bg-card-dark p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="relative">
          <img
            src={photoURL}
            alt="Profil utilisateur"
            className="h-24 w-24 rounded-full border-2 border-primary object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute bottom-0 right-0 rounded-full border-2 border-card-dark bg-primary p-1 text-background-dark">
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "16px", fontVariationSettings: "'FILL' 1" }}
            >
              verified
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onSignOut}
          disabled={isSigningOut}
          className="rounded-full border border-white/10 bg-background-dark/70 px-4 py-2 text-xs font-semibold text-text-primary transition-colors hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSigningOut ? "Déconnexion..." : "Déconnexion"}
        </button>
      </div>

      <div className="text-center">
        <h2 className="text-xl font-bold text-white">{displayName}</h2>
        <p className="text-sm text-text-secondary">{email}</p>
      </div>

      <div className="flex w-full items-center gap-4 border-t border-white/5 pt-4">
        <div className="flex-1 text-center">
          <p className="text-xs uppercase tracking-wider text-text-secondary">
            Séances totales
          </p>
          <p className="font-bold text-white">{completedSessions}</p>
        </div>
        <div className="h-8 w-px bg-white/10" />
        <div className="flex-1 text-center">
          <p className="text-xs uppercase tracking-wider text-text-secondary">
            Ce mois
          </p>
          <p className="font-bold text-white">{thisMonthSessions}</p>
        </div>
      </div>
    </section>
  );
}
