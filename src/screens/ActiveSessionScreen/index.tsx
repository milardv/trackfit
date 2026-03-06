import { useCallback, useEffect, useMemo, useState } from "react";
import { ExercisePickerScreen } from "../ExercisePickerScreen/index.tsx";
import type { ExercisePickerOption } from "../ExercisePickerScreen/types.ts";
import {
  ExerciseConfigScreen,
  type ExerciseConfig,
} from "../ExerciseConfigScreen/index.tsx";
import {
  addSessionExercise,
  createExercise,
  clearRestTimer,
  endExercise,
  endSession,
  listExercises,
  logSet,
  startExercise,
  startRestAfterSet,
  startSession,
} from "../../services/firestoreService.ts";
import type {
  ActiveSessionScreenProps,
  ExerciseStatus,
  RuntimeExercise,
  SessionView,
} from "./types.ts";
import { toClockParts } from "./utils.ts";
import { ActiveSessionHeader } from "./components/ActiveSessionHeader.tsx";
import { ExerciseActiveView } from "./components/ExerciseActiveView.tsx";
import { ExerciseListView } from "./components/ExerciseListView.tsx";
import { SessionDoneView } from "./components/SessionDoneView.tsx";

function createRuntimeExerciseKey(exerciseId: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${exerciseId}-${crypto.randomUUID()}`;
  }
  return `${exerciseId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
  const [isExercisePickerOpen, setIsExercisePickerOpen] = useState(false);
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState("");
  const [availableExercises, setAvailableExercises] = useState<ExercisePickerOption[]>([]);
  const [isLoadingExercises, setIsLoadingExercises] = useState(false);
  const [isExerciseConfigOpen, setIsExerciseConfigOpen] = useState(false);
  const [returnToPickerAfterExerciseConfig, setReturnToPickerAfterExerciseConfig] =
    useState(false);
  const [isCreatingExercise, setIsCreatingExercise] = useState(false);
  const [exerciseCreateError, setExerciseCreateError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!isExercisePickerOpen) {
      return;
    }

    let cancelled = false;
    setIsLoadingExercises(true);

    void listExercises(userId)
      .then((items) => {
        if (!cancelled) {
          setAvailableExercises(items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setErrorMessage(
            "Impossible de charger les exercices pour le moment. Reessaie.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingExercises(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isExercisePickerOpen, userId]);

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
  const selectedExerciseIds = useMemo(
    () => exercises.map((exercise) => exercise.exerciseId),
    [exercises],
  );

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

  const openExercisePicker = () => {
    if (isBusy || isFinalizingSession || isSessionCompleted) {
      return;
    }
    setErrorMessage(null);
    setExerciseSearchQuery("");
    setIsExercisePickerOpen(true);
  };

  const closeExercisePicker = () => {
    setExerciseSearchQuery("");
    setIsExercisePickerOpen(false);
  };

  const handleAddExerciseToCurrentSession = async (
    exerciseId: string,
    sourceExercises: ExercisePickerOption[] = availableExercises,
  ): Promise<void> => {
    const selectedExercise = sourceExercises.find((item) => item.id === exerciseId);
    if (!selectedExercise) {
      return;
    }

    if (exercises.some((item) => item.exerciseId === exerciseId)) {
      return;
    }

    const nextOrder =
      exercises.reduce((maxOrder, item) => Math.max(maxOrder, item.order), 0) + 1;
    const runtimeKey = createRuntimeExerciseKey(selectedExercise.id);
    let createdSessionExerciseId: string | null = null;

    if (sessionId) {
      setIsBusy(true);
      setErrorMessage(null);

      try {
        createdSessionExerciseId = await addSessionExercise(userId, sessionId, {
          exerciseId: selectedExercise.id,
          exerciseNameSnapshot: selectedExercise.name,
          order: nextOrder,
          trackingMode: selectedExercise.trackingMode,
          targetSets: selectedExercise.defaultSets,
          targetReps: selectedExercise.defaultReps,
          targetWeightKg: selectedExercise.defaultWeightKg,
          targetDurationSec: selectedExercise.defaultDurationSec,
          restSec: selectedExercise.defaultRestSec,
        });
      } catch {
        setErrorMessage(
          "Impossible d ajouter cet exercice a la seance demarree. Reessaie.",
        );
        setIsBusy(false);
        return;
      } finally {
        setIsBusy(false);
      }
    }

    setExercises((previous) => [
      ...previous,
      {
        key: runtimeKey,
        exerciseId: selectedExercise.id,
        exerciseName: selectedExercise.name,
        order: nextOrder,
        trackingMode: selectedExercise.trackingMode,
        targetSets: selectedExercise.defaultSets,
        targetReps: selectedExercise.defaultReps,
        targetWeightKg: selectedExercise.defaultWeightKg,
        targetDurationSec: selectedExercise.defaultDurationSec,
        restSec: selectedExercise.defaultRestSec,
        status: "pending",
        sessionExerciseId: createdSessionExerciseId,
        startedAtMs: null,
        loggedSets: [],
      },
    ]);

    setHasAutoFinalizeAttempted(false);
    setIsSessionCompleted(false);
    setErrorMessage(null);
    closeExercisePicker();
  };

  const handleCreateExerciseFromPicker = () => {
    setExerciseCreateError(null);
    closeExercisePicker();
    setReturnToPickerAfterExerciseConfig(true);
    setIsExerciseConfigOpen(true);
  };

  const handleBackFromExerciseConfig = () => {
    setIsExerciseConfigOpen(false);
    setExerciseCreateError(null);

    if (returnToPickerAfterExerciseConfig) {
      setReturnToPickerAfterExerciseConfig(false);
      setIsExercisePickerOpen(true);
    }
  };

  const handleCreateExerciseFromConfig = async (
    config: ExerciseConfig,
  ): Promise<void> => {
    if (isCreatingExercise) {
      return;
    }

    setIsCreatingExercise(true);
    setExerciseCreateError(null);

    try {
      const createdExerciseId = await createExercise(userId, {
        name: config.name,
        category: "personnalise",
        trackingMode: config.trackingMode,
        defaultSets: config.sets,
        defaultReps: config.reps,
        defaultWeightKg: config.weightKg,
        defaultDurationSec: config.durationSec,
        defaultRestSec: config.restSec,
      });

      const refreshedExercises = await listExercises(userId);
      setAvailableExercises(refreshedExercises);
      await handleAddExerciseToCurrentSession(createdExerciseId, refreshedExercises);

      setIsExerciseConfigOpen(false);
      setReturnToPickerAfterExerciseConfig(false);
    } catch {
      setExerciseCreateError(
        "Impossible de creer l exercice pour le moment. Reessaie dans un instant.",
      );
    } finally {
      setIsCreatingExercise(false);
    }
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

    if (exercise.sessionExerciseId) {
      setExercises((previous) =>
        previous.map((item) =>
          item.key === exerciseKey
            ? {
                ...item,
                status: "in_progress",
                startedAtMs: item.startedAtMs ?? Date.now(),
              }
            : item,
        ),
      );
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
    if (isExerciseConfigOpen) {
      handleBackFromExerciseConfig();
      return;
    }

    if (isExercisePickerOpen) {
      closeExercisePicker();
      return;
    }

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
      <ActiveSessionHeader
        view={view}
        planName={plan.name}
        activeExerciseName={activeExercise?.exerciseName ?? null}
        onBack={handleBackAction}
        onClose={handleCloseAction}
      />

      {view === "exercise_list" ? (
        <ExerciseListView
          gymName={plan.gymName}
          completedCount={completedCount}
          totalCount={totalCount}
          exercises={exercises}
          isBusy={isBusy}
          isAddExerciseDisabled={isBusy || isFinalizingSession || isSessionCompleted}
          allExercisesCompleted={allExercisesCompleted}
          isSessionCompleted={isSessionCompleted}
          isFinalizingSession={isFinalizingSession}
          onAddExercise={openExercisePicker}
          onStartExercise={(exerciseKey) => {
            void handleStartExercise(exerciseKey);
          }}
          onFinalizeSession={() => {
            void finalizeSession();
          }}
          onOpenSummary={() => {
            setView("session_done");
          }}
        />
      ) : null}

      {view === "exercise_active" && activeExercise ? (
        <ExerciseActiveView
          activeExercise={activeExercise}
          elapsedClock={elapsedClock}
          activeSetTarget={activeSetTarget}
          currentSetNumber={currentSetNumber}
          progressPercent={progressPercent}
          isActiveExerciseReadyToComplete={isActiveExerciseReadyToComplete}
          isBusy={isBusy}
          restRemainingSec={restRemainingSec}
          onCompleteExercise={() => {
            void handleCompleteCurrentExercise();
          }}
          onLogSet={() => {
            void handleLogSet();
          }}
          onSkipRest={() => {
            void handleSkipRest();
          }}
        />
      ) : null}

      {view === "session_done" ? (
        <SessionDoneView completedCount={completedCount} onClose={onClose} />
      ) : null}

      {isExercisePickerOpen ? (
        <ExercisePickerScreen
          exercises={availableExercises}
          selectedExerciseIds={selectedExerciseIds}
          searchQuery={exerciseSearchQuery}
          isLoading={isLoadingExercises}
          onSearchChange={setExerciseSearchQuery}
          onClose={closeExercisePicker}
          onAddExercise={(exerciseId) => {
            void handleAddExerciseToCurrentSession(exerciseId);
          }}
          onCreateExercise={handleCreateExerciseFromPicker}
        />
      ) : null}

      {isExerciseConfigOpen ? (
        <ExerciseConfigScreen
          onBack={handleBackFromExerciseConfig}
          onCreate={handleCreateExerciseFromConfig}
          isSubmitting={isCreatingExercise}
          errorMessage={exerciseCreateError}
          zIndexClass="z-[110]"
        />
      ) : null}

      {errorMessage ? (
        <p className="fixed bottom-24 left-1/2 z-[110] w-[min(92vw,420px)] -translate-x-1/2 rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-2 text-center text-xs font-medium text-rose-200">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
