import { getExerciseTargetLabel } from "../utils.ts";
import type { ExerciseListViewProps } from "./types.ts";

export function ExerciseListView({
  gymName,
  completedCount,
  totalCount,
  exercises,
  isBusy,
  isAddExerciseDisabled,
  allExercisesCompleted,
  isSessionCompleted,
  isFinalizingSession,
  onStartExercise,
  onAddExercise,
  onFinalizeSession,
  onOpenSummary,
}: ExerciseListViewProps) {
  return (
    <main className="hide-scrollbar flex flex-1 flex-col gap-4 overflow-y-auto p-4 pb-28">
      <div className="rounded-2xl border border-white/5 bg-[#1a3322] p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          {gymName}
        </p>
        <h1 className="mt-1 text-2xl font-extrabold text-white">Demarrage de seance</h1>
        <p className="mt-2 text-sm text-slate-300">
          Choisis un exercice a lancer. Chaque set loggue active ton repos
          automatiquement.
        </p>
        <p className="mt-3 text-xs text-slate-400">
          Progression: {completedCount}/{totalCount} exercices termines
        </p>
      </div>

      <button
        type="button"
        onClick={onAddExercise}
        disabled={isAddExerciseDisabled}
        className="flex h-12 items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 text-sm font-bold text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="material-symbols-outlined text-lg">add_circle</span>
        Ajouter un exercice a cette seance
      </button>

      <div className="space-y-3">
        {exercises.map((exercise) => {
          const isCompleted = exercise.status === "completed";
          const isInProgress = exercise.status === "in_progress";

          return (
            <article
              key={exercise.key}
              className="flex items-center gap-3 rounded-xl border border-white/5 bg-card-dark p-3"
            >
              <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <span className="material-symbols-outlined">fitness_center</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-bold text-white">
                  {exercise.exerciseName}
                </p>
                <p className="truncate text-sm text-slate-400">
                  {getExerciseTargetLabel(exercise)}
                </p>
                <p className="mt-1 text-xs text-slate-500">Repos: {exercise.restSec} sec</p>
              </div>
              <button
                type="button"
                disabled={isBusy || isCompleted}
                onClick={() => onStartExercise(exercise.key)}
                className="flex h-10 shrink-0 items-center justify-center rounded-full bg-primary/10 px-3 text-sm font-bold text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCompleted ? "Termine" : isInProgress ? "Reprendre" : "Demarrer"}
              </button>
            </article>
          );
        })}
      </div>

      {allExercisesCompleted ? (
        <button
          type="button"
          onClick={isSessionCompleted ? onOpenSummary : onFinalizeSession}
          disabled={isFinalizingSession}
          className="mt-2 flex h-12 items-center justify-center rounded-xl border border-primary/40 bg-primary/10 font-bold text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSessionCompleted
            ? "Voir le recapitulatif"
            : isFinalizingSession
              ? "Finalisation..."
              : "Finaliser la seance"}
        </button>
      ) : null}
    </main>
  );
}
