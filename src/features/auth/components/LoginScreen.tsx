interface LoginScreenProps {
  isLoading: boolean;
  errorMessage: string | null;
  onGoogleLogin: () => Promise<void>;
}

export function LoginScreen({
  isLoading,
  errorMessage,
  onGoogleLogin,
}: LoginScreenProps) {
  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background-dark px-5 py-10 text-text-primary">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-28 top-0 h-72 w-72 rounded-full bg-primary/20 blur-3xl"></div>
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-primary/10 blur-3xl"></div>
      </div>

      <section className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-card-dark/80 p-7 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-md">
        <p className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold tracking-wider text-primary">
          TRACKFIT
        </p>

        <h1 className="mt-4 text-4xl font-bold leading-tight text-white">
          Ton suivi fitness en temps reel.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-text-secondary">
          Lance un atelier, log tes series en 1 clic, demarre ton chrono de repos
          et suis ta progression dans des stats claires.
        </p>

        <div className="mt-6 grid gap-3 text-sm text-text-secondary">
          <p className="flex items-center gap-2 rounded-xl border border-white/5 bg-background-dark/70 px-3 py-2">
            <span className="material-symbols-outlined text-primary">timer</span>
            Debut automatique des ateliers + repos guide
          </p>
          <p className="flex items-center gap-2 rounded-xl border border-white/5 bg-background-dark/70 px-3 py-2">
            <span className="material-symbols-outlined text-primary">fitness_center</span>
            Suivi par exercice: reps, charge, volume, duree
          </p>
          <p className="flex items-center gap-2 rounded-xl border border-white/5 bg-background-dark/70 px-3 py-2">
            <span className="material-symbols-outlined text-primary">monitoring</span>
            Evolution du poids, masse grasse et photos
          </p>
        </div>

        <button
          type="button"
          onClick={onGoogleLogin}
          disabled={isLoading}
          className="mt-7 flex w-full items-center justify-center gap-3 rounded-2xl border border-white/15 bg-white px-4 py-3 font-semibold text-slate-900 transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
        >
          <svg
            viewBox="0 0 48 48"
            aria-hidden="true"
            className="h-5 w-5"
            role="img"
          >
            <path
              fill="#FFC107"
              d="M43.61 20.08H42V20H24v8h11.3C33.66 32.66 29.3 36 24 36c-6.63 0-12-5.37-12-12s5.37-12 12-12c3.06 0 5.84 1.15 7.95 3.03l5.66-5.66C34.09 6.05 29.28 4 24 4 12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20c0-1.34-.14-2.65-.39-3.92z"
            />
            <path
              fill="#FF3D00"
              d="M6.31 14.69l6.57 4.82A11.95 11.95 0 0 1 24 12c3.06 0 5.84 1.15 7.95 3.03l5.66-5.66C34.09 6.05 29.28 4 24 4 16.32 4 9.66 8.34 6.31 14.69z"
            />
            <path
              fill="#4CAF50"
              d="M24 44c5.18 0 9.9-1.98 13.46-5.19l-6.22-5.27A11.93 11.93 0 0 1 24 36c-5.28 0-9.62-3.32-11.3-8.02l-6.53 5.03C9.48 39.53 16.2 44 24 44z"
            />
            <path
              fill="#1976D2"
              d="M43.61 20.08H42V20H24v8h11.3a11.95 11.95 0 0 1-4.06 5.54l.01-.01 6.22 5.27C37.03 39.07 44 34 44 24c0-1.34-.14-2.65-.39-3.92z"
            />
          </svg>
          {isLoading ? "Connexion..." : "Continuer avec Google"}
        </button>

        {errorMessage ? (
          <p className="mt-3 text-sm font-medium text-rose-300">{errorMessage}</p>
        ) : null}
      </section>
    </main>
  );
}
