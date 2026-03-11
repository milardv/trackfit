import { getExerciseTargetLabel, getSetLogLabel } from "../utils.ts";
import type { ExerciseActiveViewProps } from "./types.ts";

function getSourceLabel(source: string | null | undefined): string {
  if (!source) {
    return "";
  }

  if (source === "wger") {
    return "Wger";
  }

  return source.charAt(0).toUpperCase() + source.slice(1);
}

function formatCountdownClock(totalSec: number): string {
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function ExerciseActiveView({
  activeExercise,
  elapsedClock,
  durationCountdownRemainingSec,
  activeSetTarget,
  currentSetNumber,
  progressPercent,
  isActiveExerciseReadyToComplete,
  isBusy,
  restRemainingSec,
  onEditExercise,
  onCompleteExercise,
  onLogSet,
  onSkipRest,
}: ExerciseActiveViewProps) {
  const isDurationExercise = activeExercise.trackingMode === "duration_only";
  const isDurationCountdownRunning =
    isDurationExercise &&
    durationCountdownRemainingSec !== null &&
    durationCountdownRemainingSec > 0;
  const isLogSetDisabled = isBusy || restRemainingSec > 0 || isDurationCountdownRunning;
  const imageUrl = activeExercise.media?.imageUrl ?? null;
  const videoUrl = activeExercise.media?.videoUrl ?? null;
  const instructionText = activeExercise.instructions?.trim() ?? "";
  const restClockLabel = formatCountdownClock(restRemainingSec);

  return (
    <main className="hide-scrollbar flex flex-1 flex-col overflow-y-auto pb-28">
      {restRemainingSec > 0 ? (
        <section className="px-4 pt-6">
          <div className="rounded-[2rem] border border-amber-300/30 bg-gradient-to-br from-amber-300/18 via-amber-300/10 to-orange-400/12 px-5 py-6 text-center shadow-[0_20px_60px_rgba(251,191,36,0.14)]">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-black/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-amber-100">
              <span className="material-symbols-outlined text-sm">hotel_class</span>
              Repos
            </div>
            <p className="mt-4 text-[4.5rem] font-black leading-none tracking-tight text-amber-50">
              {restClockLabel}
            </p>
            <p className="mt-3 text-sm font-medium text-amber-50/85">
              Respire et prepare le prochain set.
            </p>
            <button
              type="button"
              onClick={onSkipRest}
              disabled={isBusy}
              className="mt-5 inline-flex min-w-40 items-center justify-center gap-2 rounded-2xl border border-amber-200/35 bg-amber-200/12 px-4 py-3 text-sm font-bold text-amber-50 transition-colors hover:bg-amber-200/18 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-base">skip_next</span>
              Passer le repos
            </button>
          </div>
        </section>
      ) : null}

      {isDurationExercise && durationCountdownRemainingSec !== null ? (
        <section className="px-4 pt-6">
          <div className="rounded-3xl border border-primary/40 bg-primary/10 px-4 py-5 text-center shadow-lg shadow-primary/10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">
              Temps restant
            </p>
            <p className="mt-2 text-8xl font-black leading-none tracking-tight text-primary">
              {durationCountdownRemainingSec}
            </p>
            <p className="mt-3 text-sm font-medium text-slate-200">
              {durationCountdownRemainingSec > 0 ? "Tiens la position" : "Top, valide le set"}
            </p>
          </div>
        </section>
      ) : null}

      {imageUrl ? (
        <section className="px-4 pt-6">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-card-dark shadow-sm">
            <img
              src={imageUrl}
              alt={activeExercise.exerciseName}
              className="h-56 w-full object-cover"
              loading="lazy"
            />
            <div className="flex flex-wrap items-center gap-2 p-4">
              {activeExercise.source ? (
                <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                  {getSourceLabel(activeExercise.source)}
                </span>
              ) : null}
              {activeExercise.isMachine ? (
                <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-xs font-semibold text-emerald-300">
                  Machine
                </span>
              ) : null}
              {activeExercise.hasVideo && videoUrl ? (
                <a
                  href={videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 text-xs font-semibold text-cyan-300 transition-colors hover:bg-cyan-400/20"
                >
                  <span className="material-symbols-outlined text-sm">play_circle</span>
                  Voir la video
                </a>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

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
            {instructionText ? (
              <p className="mt-3 max-w-xs text-sm leading-6 text-slate-300">
                {instructionText}
              </p>
            ) : null}
            {!imageUrl && (activeExercise.source || activeExercise.isMachine || videoUrl) ? (
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                {activeExercise.source ? (
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                    {getSourceLabel(activeExercise.source)}
                  </span>
                ) : null}
                {activeExercise.isMachine ? (
                  <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-xs font-semibold text-emerald-300">
                    Machine
                  </span>
                ) : null}
                {activeExercise.hasVideo && videoUrl ? (
                  <a
                    href={videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 text-xs font-semibold text-cyan-300 transition-colors hover:bg-cyan-400/20"
                  >
                    <span className="material-symbols-outlined text-sm">play_circle</span>
                    Voir la video
                  </a>
                ) : null}
              </div>
            ) : null}
            <button
              type="button"
              onClick={onEditExercise}
              disabled={isBusy}
              className="mt-2 inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-sm">edit</span>
              Modifier cet exercice
            </button>
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
              disabled={isLogSetDisabled}
              className="group relative flex w-full items-center justify-center gap-3 rounded-2xl bg-primary px-6 py-5 text-background-dark shadow-lg shadow-primary/20 transition-all active:scale-[0.98] hover:bg-[#0fdc53] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-2xl transition-transform group-hover:scale-110">
                timer
              </span>
              <span className="text-xl font-extrabold uppercase tracking-wide">
                {isDurationExercise ? "Valider le set" : "Log Set & Rest"}
              </span>
            </button>

            {restRemainingSec > 0 ? (
              <p className="mt-3 text-center text-sm font-semibold text-amber-200">
                Repos en cours, reprise automatique dans {restClockLabel}.
              </p>
            ) : (
              <p className="mt-3 text-center text-xs text-slate-400">
                {isDurationCountdownRunning
                  ? `Tiens encore ${durationCountdownRemainingSec} sec.`
                  : "Lance le set quand tu es pret."}
              </p>
            )}
          </>
        )}
      </section>

      {videoUrl ? (
        <section className="px-4 pb-8">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-card-dark shadow-sm">
            <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
              <div>
                <p className="text-sm font-bold text-white">Demo video</p>
                <p className="text-xs text-slate-400">
                  Lecture integree pour verifier le mouvement
                </p>
              </div>
              {activeExercise.source ? (
                <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                  {getSourceLabel(activeExercise.source)}
                </span>
              ) : null}
            </div>
            <video
              controls
              playsInline
              preload="metadata"
              poster={imageUrl ?? undefined}
              className="aspect-video w-full bg-black"
            >
              <source src={videoUrl} />
            </video>
            <div className="px-4 py-3">
              <a
                href={videoUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-cyan-300 underline underline-offset-2"
              >
                Ouvrir la video dans un nouvel onglet si la lecture integree ne fonctionne pas
              </a>
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
