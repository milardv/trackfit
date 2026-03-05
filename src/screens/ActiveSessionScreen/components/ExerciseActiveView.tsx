import { getExerciseTargetLabel, getSetLogLabel } from "../utils.ts";
import type { ExerciseActiveViewProps } from "./types.ts";

export function ExerciseActiveView({
  activeExercise,
  elapsedClock,
  activeSetTarget,
  currentSetNumber,
  progressPercent,
  isActiveExerciseReadyToComplete,
  isBusy,
  restRemainingSec,
  onCompleteExercise,
  onLogSet,
  onSkipRest,
}: ExerciseActiveViewProps) {
  return (
    <main className="hide-scrollbar flex flex-1 flex-col overflow-y-auto pb-28">
      <section className="flex flex-col items-center justify-center gap-6 py-8">
        <div className="flex w-full justify-center gap-3 px-4">
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/5 bg-card-dark shadow-sm">
              <span className="text-3xl font-extrabold tracking-tight text-slate-100">
                {elapsedClock.hours}
              </span>
            </div>
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Hours
            </span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/5 bg-card-dark shadow-sm">
              <span className="text-3xl font-extrabold tracking-tight text-slate-100">
                {elapsedClock.minutes}
              </span>
            </div>
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Minutes
            </span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-primary/30 bg-card-dark shadow-sm">
              <div className="absolute inset-0 animate-pulse bg-primary/15" />
              <span className="relative z-10 text-3xl font-extrabold tracking-tight text-primary">
                {elapsedClock.seconds}
              </span>
            </div>
            <span className="text-xs font-medium uppercase tracking-wider text-primary">
              Seconds
            </span>
          </div>
        </div>
      </section>

      <section className="mb-6 px-4">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/5 bg-card-dark p-6 text-center shadow-sm">
          <div className="rounded-full bg-primary/15 p-3 text-primary">
            <span className="material-symbols-outlined text-3xl">fitness_center</span>
          </div>
          <div>
            <h1 className="mb-1 text-2xl font-bold text-white">
              {activeExercise.exerciseName}
            </h1>
            <p className="text-lg font-medium text-slate-400">
              {getExerciseTargetLabel(activeExercise)}
            </p>
          </div>
          <div className="w-full">
            <div className="mb-2 flex items-end justify-between">
              <span className="text-sm font-semibold text-slate-300">Progress</span>
              <span className="rounded bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
                Set {Math.min(activeSetTarget, currentSetNumber)}/{activeSetTarget}
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-black/40">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8 space-y-3 px-4">
        <h3 className="px-1 text-sm font-bold uppercase tracking-wider text-slate-400">
          Session Log
        </h3>

        {Array.from({ length: activeExercise.targetSets }, (_, index) => index + 1).map(
          (setNumber) => {
            const logged = activeExercise.loggedSets.find(
              (entry) => entry.setNumber === setNumber,
            );
            const isCurrent =
              !logged &&
              setNumber === activeExercise.loggedSets.length + 1 &&
              activeExercise.loggedSets.length < activeExercise.targetSets;
            const isUpcoming = !logged && !isCurrent;

            if (logged) {
              return (
                <article
                  key={`set-${setNumber}`}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-card-dark p-4 opacity-70"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-8 items-center justify-center rounded-full bg-white/10 text-xs font-bold">
                      {setNumber}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-200">
                        {getSetLogLabel(logged)}
                      </span>
                      <span className="text-xs text-slate-400">Completed</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-primary">
                    <span className="material-symbols-outlined text-base">check_circle</span>
                  </div>
                </article>
              );
            }

            if (isCurrent) {
              return (
                <article
                  key={`set-${setNumber}`}
                  className="relative flex items-center justify-between overflow-hidden rounded-xl border-2 border-primary/30 bg-card-dark p-4"
                >
                  <div className="absolute bottom-0 left-0 top-0 w-1 bg-primary" />
                  <div className="flex items-center gap-3">
                    <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-background-dark">
                      {setNumber}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-white">Current Set</span>
                      <span className="text-xs text-slate-400">
                        Target: {getExerciseTargetLabel(activeExercise)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="text-xs font-bold">In Progress</span>
                    <span className="material-symbols-outlined animate-spin text-sm">
                      progress_activity
                    </span>
                  </div>
                </article>
              );
            }

            if (isUpcoming) {
              return (
                <article
                  key={`set-${setNumber}`}
                  className="flex items-center justify-between rounded-xl border border-dashed border-white/10 bg-transparent p-4 text-slate-500"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-8 items-center justify-center rounded-full bg-white/5 text-xs font-bold">
                      {setNumber}
                    </span>
                    <span className="text-sm font-medium">Upcoming</span>
                  </div>
                </article>
              );
            }

            return null;
          },
        )}
      </section>

      <section className="px-4 pb-6">
        {isActiveExerciseReadyToComplete ? (
          <>
            <button
              type="button"
              onClick={onCompleteExercise}
              disabled={isBusy}
              className="group relative flex w-full items-center justify-center gap-3 rounded-2xl bg-primary px-6 py-5 text-background-dark shadow-lg shadow-primary/20 transition-all active:scale-[0.98] hover:bg-[#0fdc53] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-2xl transition-transform group-hover:scale-110">
                check_circle
              </span>
              <span className="text-xl font-extrabold uppercase tracking-wide">
                Terminer l exercice
              </span>
            </button>
            <p className="mt-3 text-center text-xs text-slate-400">
              Enregistre la fin de l exercice dans ta seance.
            </p>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={onLogSet}
              disabled={isBusy || restRemainingSec > 0}
              className="group relative flex w-full items-center justify-center gap-3 rounded-2xl bg-primary px-6 py-5 text-background-dark shadow-lg shadow-primary/20 transition-all active:scale-[0.98] hover:bg-[#0fdc53] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-2xl transition-transform group-hover:scale-110">
                timer
              </span>
              <span className="text-xl font-extrabold uppercase tracking-wide">
                Log Set & Rest
              </span>
            </button>

            {restRemainingSec > 0 ? (
              <div className="mt-3 rounded-xl border border-primary/25 bg-primary/10 px-3 py-2">
                <p className="text-center text-xs text-slate-200">
                  Repos en cours: {restRemainingSec} sec
                </p>
                <button
                  type="button"
                  onClick={onSkipRest}
                  disabled={isBusy}
                  className="mt-2 w-full rounded-lg border border-primary/30 bg-transparent py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/15 disabled:opacity-60"
                >
                  Passer le repos
                </button>
              </div>
            ) : (
              <p className="mt-3 text-center text-xs text-slate-400">
                Lance le set quand tu es pret.
              </p>
            )}
          </>
        )}
      </section>
    </main>
  );
}
