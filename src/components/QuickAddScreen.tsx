import { useEffect } from "react";

interface QuickAddScreenProps {
  onClose: () => void;
  onCreateExercise: () => void;
  onCreateSession: () => void;
}

export function QuickAddScreen({
  onClose,
  onCreateExercise,
  onCreateSession,
}: QuickAddScreenProps) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[90] bg-background-dark text-text-primary">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/5 bg-background-dark/90 px-4 py-3 backdrop-blur-md">
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full text-text-primary transition-colors hover:bg-white/10"
          aria-label="Fermer le menu d ajout rapide"
        >
          <span className="material-symbols-outlined text-[24px]">close</span>
        </button>
        <h2 className="text-lg font-bold tracking-tight text-white">Ajouter</h2>
        <div className="w-10" />
      </header>

      <main className="mx-auto flex min-h-[calc(100dvh-65px)] w-full max-w-md flex-col px-6 py-6">
        <div className="flex flex-col items-center justify-center pb-10 pt-8 text-center">
          <div className="mb-6 rounded-full bg-primary/10 p-4">
            <span className="material-symbols-outlined text-[32px] text-primary">
              add_circle
            </span>
          </div>
          <h1 className="mb-2 text-3xl font-extrabold leading-tight text-white">
            Que voulez-vous creer ?
          </h1>
          <p className="text-sm font-medium text-text-secondary">
            Choisissez une option pour commencer votre suivi.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={onCreateExercise}
            className="group relative w-full overflow-hidden rounded-2xl border border-white/10 bg-card-dark p-5 text-left transition-all duration-300 hover:border-primary hover:shadow-[0_0_20px_rgba(19,236,91,0.15)]"
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <div className="relative z-10 flex items-start gap-4">
              <div className="flex shrink-0 items-center justify-center rounded-xl bg-primary/15 p-3 text-primary">
                <span className="material-symbols-outlined text-[28px]">
                  fitness_center
                </span>
              </div>
              <div className="flex-1">
                <p className="mb-1 text-lg font-bold text-white transition-colors group-hover:text-primary">
                  Nouvel exercice
                </p>
                <p className="text-sm leading-relaxed text-text-secondary">
                  Creez un mouvement unique pour suivre vos progres
                  specifiques.
                </p>
              </div>
              <span className="material-symbols-outlined self-center text-slate-500 transition-colors group-hover:text-primary">
                arrow_forward_ios
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={onCreateSession}
            className="group relative w-full overflow-hidden rounded-2xl border border-white/10 bg-card-dark p-5 text-left transition-all duration-300 hover:border-primary hover:shadow-[0_0_20px_rgba(19,236,91,0.15)]"
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <div className="relative z-10 flex items-start gap-4">
              <div className="flex shrink-0 items-center justify-center rounded-xl bg-primary/15 p-3 text-primary">
                <span className="material-symbols-outlined text-[28px]">
                  assignment
                </span>
              </div>
              <div className="flex-1">
                <p className="mb-1 text-lg font-bold text-white transition-colors group-hover:text-primary">
                  Nouvelle seance
                </p>
                <p className="text-sm leading-relaxed text-text-secondary">
                  Construisez une routine complete avec plusieurs exercices
                  enchaines.
                </p>
              </div>
              <span className="material-symbols-outlined self-center text-slate-500 transition-colors group-hover:text-primary">
                arrow_forward_ios
              </span>
            </div>
          </button>
        </div>

        <div className="mt-auto pb-4 pt-10">
          <div className="flex items-start gap-3 rounded-xl border border-white/5 bg-card-dark p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <span className="material-symbols-outlined">tips_and_updates</span>
            </div>
            <div>
              <p className="mb-0.5 text-xs font-bold uppercase tracking-wider text-primary">
                Astuce pro
              </p>
              <p className="text-xs text-text-secondary">
                Planifiez vos seances a l avance pour garder un rythme stable.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
