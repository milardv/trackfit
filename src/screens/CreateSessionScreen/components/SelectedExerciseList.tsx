import { getExerciseTarget, getTrackingLabel } from "../utils.ts";
import type { SelectedExerciseListProps } from "./types.ts";

export function SelectedExerciseList({
  selectedExercises,
  isLoadingExercises,
  onOpenExercisePicker,
  onMoveExercise,
  onRemoveExercise,
}: SelectedExerciseListProps) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white">Exercices</h3>
        <button
          type="button"
          onClick={onOpenExercisePicker}
          disabled={isLoadingExercises}
          className="group flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-xl text-primary transition-transform group-hover:scale-110">
            add_circle
          </span>
          <span className="text-sm font-bold text-primary">Ajouter</span>
        </button>
      </div>

      {isLoadingExercises ? (
        <div className="rounded-xl border border-white/10 bg-card-dark p-4 text-sm text-text-secondary">
          Chargement des exercices...
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        {selectedExercises.map((exercise, index) => (
          <article
            key={exercise.id}
            className="group relative flex items-center gap-3 rounded-xl border border-white/5 bg-[#1c2e21] p-3 shadow-sm"
          >
            <div className="flex shrink-0 flex-col items-center gap-1 text-slate-500">
              <button
                type="button"
                onClick={() => onMoveExercise(index, -1)}
                disabled={index === 0}
                className="rounded p-0.5 transition-colors hover:text-slate-300 disabled:opacity-30"
                aria-label={`Monter ${exercise.name}`}
              >
                <span className="material-symbols-outlined text-[16px]">arrow_drop_up</span>
              </button>
              <span className="material-symbols-outlined text-[20px]">drag_indicator</span>
              <button
                type="button"
                onClick={() => onMoveExercise(index, 1)}
                disabled={index === selectedExercises.length - 1}
                className="rounded p-0.5 transition-colors hover:text-slate-300 disabled:opacity-30"
                aria-label={`Descendre ${exercise.name}`}
              >
                <span className="material-symbols-outlined text-[16px]">arrow_drop_down</span>
              </button>
            </div>

            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/15 text-primary">
              {exercise.media?.imageUrl ? (
                <img
                  src={exercise.media.imageUrl}
                  alt={exercise.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <span className="material-symbols-outlined">fitness_center</span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-bold text-white">{exercise.name}</p>
              <p className="truncate text-sm font-medium text-slate-400">
                {getTrackingLabel(exercise.trackingMode)}
              </p>
              <div className="mt-1 flex gap-2">
                <span className="rounded-md bg-white/5 px-2 py-0.5 text-xs text-slate-300">
                  {exercise.defaultSets} series
                </span>
                <span className="rounded-md bg-white/5 px-2 py-0.5 text-xs text-slate-300">
                  {getExerciseTarget(exercise)}
                </span>
              </div>
              {exercise.media?.imageUrl || exercise.hasVideo || exercise.isMachine ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {exercise.hasVideo ? (
                    <span className="rounded-md bg-cyan-400/10 px-2 py-0.5 text-xs text-cyan-300">
                      Video
                    </span>
                  ) : null}
                  {exercise.isMachine ? (
                    <span className="rounded-md bg-emerald-400/10 px-2 py-0.5 text-xs text-emerald-300">
                      Machine
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => onRemoveExercise(exercise.id)}
              className="shrink-0 p-2 text-slate-500 transition-colors hover:text-primary"
              aria-label={`Retirer ${exercise.name}`}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </article>
        ))}

        {!isLoadingExercises && selectedExercises.length === 0 ? (
          <button
            type="button"
            onClick={onOpenExercisePicker}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/10 py-6 transition-colors hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-slate-500">add</span>
            <span className="text-sm font-medium text-slate-500">Ajouter un exercice</span>
          </button>
        ) : null}
      </div>
    </section>
  );
}
