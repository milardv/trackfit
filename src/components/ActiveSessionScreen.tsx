import { useCallback, useEffect, useMemo, useState } from "react";
import {
  clearRestTimer,
  endExercise,
  endSession,
  logSet,
  startExercise,
  startRestAfterSet,
  startSession,
} from "../services/firestoreService.ts";
import type { WorkoutPlanExercise, WorkoutPlanToStart } from "./WorkoutScreen.tsx";

type ExerciseStatus = "pending" | "in_progress" | "completed";
type SessionView = "exercise_list" | "exercise_active" | "session_done";

interface ActiveSessionScreenProps {
  userId: string;
  plan: WorkoutPlanToStart;
  onClose: () => void;
  onSessionPersisted?: () => void;
}

interface LoggedSet {
  setNumber: number;
  reps: number | null;
  weightKg: number | null;
  durationSec: number | null;
}

interface RuntimeExercise extends WorkoutPlanExercise {
  status: ExerciseStatus;
  sessionExerciseId: string | null;
  startedAtMs: number | null;
  loggedSets: LoggedSet[];
}

function toClockParts(totalMs: number): { hours: string; minutes: string; seconds: string } {
  const totalSeconds = Math.max(0, Math.floor(totalMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    hours: String(hours).padStart(2, "0"),
    minutes: String(minutes).padStart(2, "0"),
    seconds: String(seconds).padStart(2, "0"),
  };
}

function getExerciseTargetLabel(exercise: WorkoutPlanExercise): string {
  if (exercise.trackingMode === "duration_only") {
    return `${exercise.targetSets} series x ${exercise.targetDurationSec ?? 40} sec`;
  }

  const repsLabel = `${exercise.targetSets} series x ${exercise.targetReps ?? 10} reps`;
  if (exercise.trackingMode === "weight_reps" && (exercise.targetWeightKg ?? 0) > 0) {
    return `${exercise.targetWeightKg} kg - ${repsLabel}`;
  }
  return repsLabel;
}

function getSetLogLabel(set: LoggedSet): string {
  if (set.durationSec !== null) {
    return `${set.durationSec} sec`;
  }
  if (set.reps !== null && set.weightKg !== null) {
    return `${set.reps} reps @ ${set.weightKg} kg`;
  }
  if (set.reps !== null) {
    return `${set.reps} reps`;
  }
  return "Set valide";
}

export function ActiveSessionScreen({
  userId,
  plan,
  onClose,
  onSessionPersisted,
}: ActiveSessionScreenProps) {
  const [view, setView] = useState<SessionView>("exercise_list");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [activeExerciseKey, setActiveExerciseKey] = useState<string | null>(null);
  const [restEndsAtMs, setRestEndsAtMs] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [isBusy, setIsBusy] = useState(false);
  const [isFinalizingSession, setIsFinalizingSession] = useState(false);
  const [isSessionCompleted, setIsSessionCompleted] = useState(false);
  const [hasAutoFinalizeAttempted, setHasAutoFinalizeAttempted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [exercises, setExercises] = useState<RuntimeExercise[]>(() =>
    plan.exercises
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((exercise) => ({
        ...exercise,
        status: "pending" as ExerciseStatus,
        sessionExerciseId: null,
        startedAtMs: null,
        loggedSets: [],
      })),
  );

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (restEndsAtMs !== null && restEndsAtMs <= nowMs) {
      setRestEndsAtMs(null);
    }
  }, [nowMs, restEndsAtMs]);

  const activeExercise = useMemo(
    () => exercises.find((exercise) => exercise.key === activeExerciseKey) ?? null,
    [activeExerciseKey, exercises],
  );

  const completedCount = useMemo(
    () => exercises.filter((exercise) => exercise.status === "completed").length,
    [exercises],
  );
  const totalCount = exercises.length;
  const restRemainingSec =
    restEndsAtMs === null ? 0 : Math.max(0, Math.ceil((restEndsAtMs - nowMs) / 1000));

  const elapsedClock = toClockParts(
    activeExercise?.startedAtMs ? nowMs - activeExercise.startedAtMs : 0,
  );

  const activeCompletedSets = activeExercise?.loggedSets.length ?? 0;
  const activeSetTarget = activeExercise?.targetSets ?? 0;
  const progressPercent =
    activeSetTarget > 0 ? Math.round((activeCompletedSets / activeSetTarget) * 100) : 0;

  const currentSetNumber = activeExercise
    ? Math.min(activeExercise.targetSets, activeExercise.loggedSets.length + 1)
    : 1;
  const isActiveExerciseReadyToComplete =
    activeExercise !== null && activeExercise.loggedSets.length >= activeExercise.targetSets;

  const allExercisesCompleted = totalCount > 0 && completedCount === totalCount;

  const finalizeSession = useCallback(async () => {
    if (!sessionId || isFinalizingSession || isSessionCompleted) {
      return;
    }

    setIsFinalizingSession(true);
    setErrorMessage(null);

    try {
      let finalized = false;

      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          await endSession(userId, sessionId, "completed");
          finalized = true;
          break;
        } catch {
          if (attempt === 0) {
            await new Promise((resolve) => {
              window.setTimeout(resolve, 250);
            });
          }
        }
      }

      if (!finalized) {
        throw new Error("Session finalization failed");
      }

      setIsSessionCompleted(true);
      onSessionPersisted?.();
      setView("session_done");
    } catch {
      setErrorMessage(
        "Tous les exercices sont termines, mais la seance n a pas pu etre finalisee. Reessaie.",
      );
    } finally {
      setIsFinalizingSession(false);
    }
  }, [isFinalizingSession, isSessionCompleted, onSessionPersisted, sessionId, userId]);

  useEffect(() => {
    if (
      !allExercisesCompleted ||
      !sessionId ||
      isSessionCompleted ||
      isFinalizingSession ||
      hasAutoFinalizeAttempted
    ) {
      return;
    }

    setHasAutoFinalizeAttempted(true);
    void finalizeSession();
  }, [
    allExercisesCompleted,
    finalizeSession,
    hasAutoFinalizeAttempted,
    isFinalizingSession,
    isSessionCompleted,
    sessionId,
  ]);

  const ensureSessionStarted = async (): Promise<string> => {
    if (sessionId) {
      return sessionId;
    }

    const createdSessionId = await startSession(userId, {
      planId: plan.id,
      gymName: plan.gymName,
      estimatedDurationMin: plan.estimatedDurationMin,
      estimatedCaloriesKcal: plan.estimatedCaloriesKcal,
      estimationSource: plan.estimationSource,
    });
    setSessionId(createdSessionId);
    return createdSessionId;
  };

  const handleStartExercise = async (exerciseKey: string) => {
    if (isBusy) {
      return;
    }

    const exercise = exercises.find((item) => item.key === exerciseKey);
    if (!exercise || exercise.status === "completed") {
      return;
    }

    if (exercise.status === "in_progress") {
      setActiveExerciseKey(exerciseKey);
      setView("exercise_active");
      return;
    }

    setIsBusy(true);
    setErrorMessage(null);

    try {
      const currentSessionId = await ensureSessionStarted();
      const createdSessionExerciseId = await startExercise(
        userId,
        currentSessionId,
        {
          exerciseId: exercise.exerciseId,
          exerciseNameSnapshot: exercise.exerciseName,
          order: exercise.order,
          trackingMode: exercise.trackingMode,
          targetSets: exercise.targetSets,
          targetReps: exercise.targetReps,
          targetWeightKg: exercise.targetWeightKg,
          targetDurationSec: exercise.targetDurationSec,
          restSec: exercise.restSec,
        },
      );

      setExercises((previous) =>
        previous.map((item) =>
          item.key === exerciseKey
            ? {
                ...item,
                status: "in_progress",
                sessionExerciseId: createdSessionExerciseId,
                startedAtMs: Date.now(),
                loggedSets: [],
              }
            : item,
        ),
      );
      setActiveExerciseKey(exerciseKey);
      setRestEndsAtMs(null);
      setView("exercise_active");
    } catch {
      setErrorMessage(
        "Impossible de demarrer cet exercice pour le moment. Reessaie dans un instant.",
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleLogSet = async () => {
    if (isBusy || !sessionId || !activeExercise || !activeExercise.sessionExerciseId) {
      return;
    }

    if (restRemainingSec > 0) {
      return;
    }

    const nextSetNumber = activeExercise.loggedSets.length + 1;
    if (nextSetNumber > activeExercise.targetSets) {
      return;
    }

    const reps = activeExercise.trackingMode === "duration_only"
      ? null
      : activeExercise.targetReps ?? null;
    const weightKg = activeExercise.trackingMode === "weight_reps"
      ? activeExercise.targetWeightKg ?? null
      : null;
    const durationSec = activeExercise.trackingMode === "duration_only"
      ? activeExercise.targetDurationSec ?? null
      : null;

    setIsBusy(true);
    setErrorMessage(null);
    let didLogSet = false;

    try {
      const setId = await logSet(userId, sessionId, activeExercise.sessionExerciseId, {
        setNumber: nextSetNumber,
        reps,
        weightKg,
        durationSec,
        restPlannedSec: activeExercise.restSec,
      });
      didLogSet = true;

      setExercises((previous) =>
        previous.map((item) =>
          item.key === activeExercise.key
            ? {
                ...item,
                loggedSets: [
                  ...item.loggedSets,
                  {
                    setNumber: nextSetNumber,
                    reps,
                    weightKg,
                    durationSec,
                  },
                ],
              }
            : item,
        ),
      );

      const hasMoreSets = nextSetNumber < activeExercise.targetSets;
      if (hasMoreSets && activeExercise.restSec > 0) {
        const restEndAt = await startRestAfterSet(
          userId,
          sessionId,
          activeExercise.sessionExerciseId,
          setId,
          activeExercise.restSec,
        );
        setRestEndsAtMs(restEndAt.toMillis());
      } else {
        setRestEndsAtMs(null);
      }

      if (!hasMoreSets) {
        await endExercise(userId, sessionId, activeExercise.sessionExerciseId);

        setExercises((previous) =>
          previous.map((item) =>
            item.key === activeExercise.key
              ? {
                  ...item,
                  status: "completed",
                }
              : item,
          ),
        );

        setActiveExerciseKey(null);
        setView("exercise_list");
        setRestEndsAtMs(null);
      }
    } catch {
      setErrorMessage(
        didLogSet
          ? "Le set est enregistre, mais la fin d exercice a echoue. Appuie sur Terminer l exercice."
          : "Le set n a pas pu etre enregistre. Reessaie.",
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleCompleteCurrentExercise = async () => {
    if (
      isBusy ||
      !sessionId ||
      !activeExercise ||
      !activeExercise.sessionExerciseId ||
      activeExercise.loggedSets.length < activeExercise.targetSets
    ) {
      return;
    }

    setIsBusy(true);
    setErrorMessage(null);

    try {
      await endExercise(userId, sessionId, activeExercise.sessionExerciseId);

      setExercises((previous) =>
        previous.map((item) =>
          item.key === activeExercise.key
            ? {
                ...item,
                status: "completed",
              }
            : item,
        ),
      );

      setActiveExerciseKey(null);
      setView("exercise_list");
      setRestEndsAtMs(null);
    } catch {
      setErrorMessage("Impossible d enregistrer la fin de cet exercice. Reessaie.");
    } finally {
      setIsBusy(false);
    }
  };

  const handleSkipRest = async () => {
    if (!sessionId || restEndsAtMs === null || isBusy) {
      return;
    }

    setIsBusy(true);
    setErrorMessage(null);

    try {
      await clearRestTimer(userId);
      setRestEndsAtMs(null);
    } catch {
      setErrorMessage("Impossible de couper le timer de repos pour le moment.");
    } finally {
      setIsBusy(false);
    }
  };

  const handleCancelSession = async () => {
    if (!sessionId) {
      onClose();
      return;
    }

    const shouldCancel = window.confirm(
      "Annuler cette seance ? Les donnees en cours seront marquees comme annulees.",
    );
    if (!shouldCancel) {
      return;
    }

    setIsBusy(true);
    setErrorMessage(null);

    try {
      const currentActive = exercises.find(
        (exercise) => exercise.status === "in_progress" && exercise.sessionExerciseId !== null,
      );
      if (currentActive?.sessionExerciseId) {
        await endExercise(userId, sessionId, currentActive.sessionExerciseId, "cancelled");
      }

      await endSession(userId, sessionId, "cancelled");
      onSessionPersisted?.();
      onClose();
    } catch {
      setErrorMessage("Impossible d annuler la seance pour le moment.");
    } finally {
      setIsBusy(false);
    }
  };

  const handleBackAction = () => {
    if (view === "exercise_active") {
      setView("exercise_list");
      return;
    }

    if (view === "session_done") {
      onClose();
      return;
    }

    void handleCancelSession();
  };

  const handleCloseAction = () => {
    if (view === "session_done" || !sessionId) {
      onClose();
      return;
    }

    void handleCancelSession();
  };

  return (
    <div className="fixed inset-0 z-[95] mx-auto flex min-h-screen w-full max-w-md flex-col overflow-hidden bg-background-dark text-text-primary shadow-2xl">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/5 bg-[#1a3322]/80 px-4 py-4 backdrop-blur-md">
        <button
          type="button"
          onClick={handleBackAction}
          className="flex size-10 items-center justify-center rounded-full text-slate-100 transition-colors hover:bg-white/10"
          aria-label="Retour"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="flex-1 truncate px-2 text-center text-lg font-bold text-white">
          {view === "exercise_active" && activeExercise
            ? `${activeExercise.exerciseName} - Workout`
            : plan.name}
        </h2>
        <button
          type="button"
          onClick={handleCloseAction}
          className="flex size-10 items-center justify-center rounded-full text-slate-100 transition-colors hover:bg-white/10"
          aria-label="Fermer"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </header>

      {view === "exercise_list" ? (
        <main className="hide-scrollbar flex flex-1 flex-col gap-4 overflow-y-auto p-4 pb-28">
          <div className="rounded-2xl border border-white/5 bg-[#1a3322] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              {plan.gymName}
            </p>
            <h1 className="mt-1 text-2xl font-extrabold text-white">Demarrage de seance</h1>
            <p className="mt-2 text-sm text-slate-300">
              Choisis un exercice a lancer. Chaque set loggue active ton repos automatiquement.
            </p>
            <p className="mt-3 text-xs text-slate-400">
              Progression: {completedCount}/{totalCount} exercices termines
            </p>
          </div>

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
                    onClick={() => void handleStartExercise(exercise.key)}
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
              onClick={() => {
                if (isSessionCompleted) {
                  setView("session_done");
                  return;
                }
                void finalizeSession();
              }}
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
      ) : null}

      {view === "exercise_active" && activeExercise ? (
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
                <h1 className="mb-1 text-2xl font-bold text-white">{activeExercise.exerciseName}</h1>
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
                  onClick={() => void handleCompleteCurrentExercise()}
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
                  onClick={() => void handleLogSet()}
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
                      onClick={() => void handleSkipRest()}
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
      ) : null}

      {view === "session_done" ? (
        <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-primary/15 text-primary">
            <span className="material-symbols-outlined text-4xl">check_circle</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white">Seance terminee</h1>
          <p className="max-w-[280px] text-sm text-slate-300">
            Bravo, tu as termine {completedCount} exercice{completedCount > 1 ? "s" : ""}.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-2 flex h-12 items-center justify-center rounded-xl bg-primary px-6 font-bold text-background-dark transition-colors hover:bg-[#0fdc53]"
          >
            Retour aux seances
          </button>
        </main>
      ) : null}

      {errorMessage ? (
        <p className="fixed bottom-24 left-1/2 z-[110] w-[min(92vw,420px)] -translate-x-1/2 rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-2 text-center text-xs font-medium text-rose-200">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
