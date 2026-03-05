import { useMemo } from "react";
import type { TrackingMode } from "../../types/firestore.ts";
import type { ExercisePickerScreenProps } from "./types.ts";

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function formatCategory(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "Categorie libre";
  }

  const withSpaces = trimmed.replace(/[_-]+/g, " ");
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

function getTrackingIcon(mode: TrackingMode): string {
  if (mode === "duration_only") {
    return "timer";
  }
  if (mode === "reps_only") {
    return "repeat";
  }
  return "fitness_center";
}

function getTrackingLabel(mode: TrackingMode): string {
  if (mode === "duration_only") {
    return "Duree";
  }
  if (mode === "reps_only") {
    return "Repetitions";
  }
  return "Force";
}

export function ExercisePickerScreen({
  exercises,
  selectedExerciseIds,
  searchQuery,
  isLoading,
  onSearchChange,
  onClose,
  onAddExercise,
  onCreateExercise,
}: ExercisePickerScreenProps) {
  const selectedIds = useMemo(
    () => new Set(selectedExerciseIds),
    [selectedExerciseIds],
  );

  const filteredExercises = useMemo(() => {
    const query = normalize(searchQuery);

    if (!query) {
      return exercises;
    }

    return exercises.filter((exercise) => {
      const haystack = normalize(
        `${exercise.name} ${exercise.category} ${getTrackingLabel(exercise.trackingMode)}`,
      );
      return haystack.includes(query);
    });
  }, [exercises, searchQuery]);

  return (
    <div className="fixed inset-0 z-[98] mx-auto flex min-h-screen w-full max-w-md flex-col bg-background-dark text-text-primary shadow-2xl">
      <header className="sticky top-0 z-20 flex flex-col border-b border-white/5 bg-background-dark/90 backdrop-blur-md">
        <div className="flex items-center justify-between p-4 pb-2">
          <button
            type="button"
            onClick={onClose}
            className="flex size-12 shrink-0 items-center justify-start text-white transition-opacity hover:opacity-70"
            aria-label="Fermer la selection d exercices"
          >
            <span className="material-symbols-outlined text-3xl">close</span>
          </button>

          <h2 className="flex-1 text-center text-lg font-bold tracking-tight text-white">
            Selectionner un exercice
          </h2>

          <div className="flex w-12 items-center justify-end" />
        </div>

        <div className="px-4 pb-4">
          <div className="relative flex items-center">
            <span className="material-symbols-outlined pointer-events-none absolute left-4 text-slate-400">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Rechercher un exercice"
              className="h-12 w-full rounded-xl border border-primary/20 bg-[#1c2e21] pl-12 pr-4 text-base text-white transition-colors placeholder:text-slate-500 focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </header>

      <main className="hide-scrollbar flex flex-1 flex-col gap-6 overflow-y-auto p-4 pb-32">
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Mes exercices
            </h3>
          </div>

          {isLoading ? (
            <div className="rounded-xl border border-white/10 bg-card-dark p-4 text-sm text-text-secondary">
              Chargement des exercices...
            </div>
          ) : null}

          {!isLoading && filteredExercises.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-card-dark p-4 text-sm text-text-secondary">
              Aucun exercice ne correspond a votre recherche.
            </div>
          ) : null}

          <div className="flex flex-col gap-3">
            {filteredExercises.map((exercise) => {
              const isSelected = selectedIds.has(exercise.id);

              return (
                <article
                  key={exercise.id}
                  className="group relative flex items-center gap-4 rounded-xl border border-white/5 bg-card-dark p-3 shadow-sm transition-all active:scale-[0.99]"
                >
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-[#223727] text-primary">
                    <span className="material-symbols-outlined">
                      {getTrackingIcon(exercise.trackingMode)}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-bold text-white">{exercise.name}</p>
                    <p className="truncate text-sm font-medium text-slate-400">
                      {formatCategory(exercise.category)}, {getTrackingLabel(exercise.trackingMode)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onAddExercise(exercise.id)}
                    disabled={isSelected}
                    className={`flex size-10 shrink-0 items-center justify-center rounded-full transition-all ${
                      isSelected
                        ? "cursor-not-allowed bg-primary text-slate-900"
                        : "bg-primary/10 text-primary hover:bg-primary hover:text-slate-900"
                    }`}
                    aria-label={isSelected ? `${exercise.name} deja ajoute` : `Ajouter ${exercise.name}`}
                  >
                    <span className="material-symbols-outlined">
                      {isSelected ? "check" : "add"}
                    </span>
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-20 mx-auto w-full max-w-md border-t border-white/5 bg-background-dark/95 p-4 backdrop-blur-lg">
        <button
          type="button"
          onClick={onCreateExercise}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-primary/30 text-lg font-bold text-primary transition-all hover:bg-primary/5 active:scale-[0.98]"
        >
          <span className="material-symbols-outlined">add_circle</span>
          Creer un nouvel exercice
        </button>
      </div>
    </div>
  );
}
