import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ExercisePickerScreen } from "../ExercisePickerScreen/index.tsx";
import type {
  ExercisePickerOption,
  SharedExercisePickerOption,
} from "../ExercisePickerScreen/types.ts";
import {
  ExerciseConfigScreen,
  type ExerciseConfig,
} from "../ExerciseConfigScreen/index.tsx";
import {
  addSessionExercise,
  createExercise,
  clearRestTimer,
  deleteSessionExercise,
  endExercise,
  endSession,
  importSharedExerciseToUser,
  listExercises,
  listSharedExercises,
  logSet,
  startExercise,
  startRestAfterSet,
  startSession,
  updateSessionExerciseConfig,
} from "../../services/firestoreService.ts";
import type {
  ActiveSessionScreenProps,
  ExerciseEditDraft,
  ExerciseStatus,
  RuntimeExercise,
  SessionView,
} from "./types.ts";
import { toClockParts } from "./utils.ts";
import { ActiveSessionHeader } from "./components/ActiveSessionHeader.tsx";
import { ExerciseActiveView } from "./components/ExerciseActiveView.tsx";
import { ExerciseEditModal } from "./components/ExerciseEditModal.tsx";
import { ExerciseListView } from "./components/ExerciseListView.tsx";
import { SessionDoneView } from "./components/SessionDoneView.tsx";

function createRuntimeExerciseKey(exerciseId: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${exerciseId}-${crypto.randomUUID()}`;
  }
  return `${exerciseId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

interface DurationCountdownState {
  exerciseKey: string;
  setNumber: number;
  endsAtMs: number;
}

function getDurationTargetSec(exercise: RuntimeExercise | null): number | null {
  if (!exercise || exercise.trackingMode !== "duration_only") {
    return null;
  }

  if (typeof exercise.targetDurationSec !== "number" || !Number.isFinite(exercise.targetDurationSec)) {
    return null;
  }

  const normalizedDuration = Math.max(0, Math.round(exercise.targetDurationSec));
  return normalizedDuration > 0 ? normalizedDuration : null;
}

async function playCountdownDoneSound(
  context: AudioContext | null,
  kind: "duration" | "rest",
): Promise<void> {
  if (!context) {
    return;
  }

  try {
    if (context.state === "suspended") {
      await context.resume();
    }

    const now = context.currentTime;
    const master = context.createGain();
    master.connect(context.destination);
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(kind === "rest" ? 0.07 : 0.055, now + 0.03);

    if (kind === "rest") {
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);

      const firstTone = context.createOscillator();
      firstTone.type = "triangle";
      firstTone.frequency.setValueAtTime(880, now);
      firstTone.connect(master);

      const secondTone = context.createOscillator();
      secondTone.type = "triangle";
      secondTone.frequency.setValueAtTime(1175, now + 0.24);
      secondTone.connect(master);

      firstTone.start(now);
      firstTone.stop(now + 0.18);
      secondTone.start(now + 0.24);
      secondTone.stop(now + 0.48);
    } else {
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

      const lowTone = context.createOscillator();
      lowTone.type = "sine";
      lowTone.frequency.setValueAtTime(720, now);
      lowTone.frequency.exponentialRampToValueAtTime(620, now + 0.4);
      lowTone.connect(master);

      const highTone = context.createOscillator();
      const highToneGain = context.createGain();
      highTone.type = "triangle";
      highTone.frequency.setValueAtTime(1080, now);
      highTone.frequency.exponentialRampToValueAtTime(900, now + 0.32);
      highToneGain.gain.setValueAtTime(0.4, now);
      highTone.connect(highToneGain);
      highToneGain.connect(master);

      lowTone.start(now);
      highTone.start(now + 0.01);
      lowTone.stop(now + 0.45);
      highTone.stop(now + 0.33);
    }
  } catch {
    // Ignore browsers/devices where the sound cannot be played.
  }
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
  const [sharedExercises, setSharedExercises] = useState<SharedExercisePickerOption[]>(
    [],
  );
  const [isLoadingExercises, setIsLoadingExercises] = useState(false);
  const [isLoadingSharedExercises, setIsLoadingSharedExercises] = useState(false);
  const [importingSharedExerciseId, setImportingSharedExerciseId] = useState<string | null>(
    null,
  );
  const [isExerciseConfigOpen, setIsExerciseConfigOpen] = useState(false);
  const [returnToPickerAfterExerciseConfig, setReturnToPickerAfterExerciseConfig] =
    useState(false);
  const [isCreatingExercise, setIsCreatingExercise] = useState(false);
  const [exerciseCreateError, setExerciseCreateError] = useState<string | null>(null);
  const [editingExerciseKey, setEditingExerciseKey] = useState<string | null>(null);
  const [exerciseEditDraft, setExerciseEditDraft] = useState<ExerciseEditDraft | null>(
    null,
  );
  const [exerciseEditError, setExerciseEditError] = useState<string | null>(null);
  const [isSavingExerciseEdit, setIsSavingExerciseEdit] = useState(false);
  const [isRemovingExerciseEdit, setIsRemovingExerciseEdit] = useState(false);
  const [durationCountdown, setDurationCountdown] = useState<DurationCountdownState | null>(
    null,
  );
  const countdownAudioContextRef = useRef<AudioContext | null>(null);
  const durationCountdownSoundSetKeyRef = useRef<string | null>(null);
  const restCountdownSoundEndAtMsRef = useRef<number | null>(null);

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
      const audioContext = countdownAudioContextRef.current;
      countdownAudioContextRef.current = null;
      if (audioContext && audioContext.state !== "closed") {
        void audioContext.close();
      }
    };
  }, []);

  const ensureCountdownAudioReady = useCallback((): AudioContext | null => {
    if (typeof window === "undefined" || typeof window.AudioContext === "undefined") {
      return null;
    }

    const current = countdownAudioContextRef.current;
    if (current && current.state !== "closed") {
      if (current.state === "suspended") {
        void current.resume().catch(() => {
          // Ignore browsers/devices where resume is not possible.
        });
      }
      return current;
    }

    try {
      const nextContext = new window.AudioContext();
      countdownAudioContextRef.current = nextContext;
      if (nextContext.state === "suspended") {
        void nextContext.resume().catch(() => {
          // Ignore browsers/devices where resume is not possible.
        });
      }
      return nextContext;
    } catch {
      return null;
    }
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
    setIsLoadingSharedExercises(true);

    void Promise.allSettled([listExercises(userId), listSharedExercises()])
      .then(([itemsResult, sharedResult]) => {
        if (itemsResult.status === "rejected") {
          throw new Error("user-exercises-load-failed");
        }

        const items = itemsResult.value;
        const shared =
          sharedResult.status === "fulfilled" ? sharedResult.value : [];

        if (!cancelled) {
          setAvailableExercises(items);
          setSharedExercises(shared);
          if (sharedResult.status === "rejected") {
            setErrorMessage(
              "La bibliotheque partagee n a pas pu etre chargee. Verifie les regles Firestore et le projet Firebase.",
            );
          }
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
          setIsLoadingSharedExercises(false);
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
  const activeDurationTargetSec = getDurationTargetSec(activeExercise);

  useEffect(() => {
    if (
      !activeExercise ||
      activeExercise.status !== "in_progress" ||
      activeDurationTargetSec === null ||
      isActiveExerciseReadyToComplete ||
      restRemainingSec > 0
    ) {
      setDurationCountdown(null);
      return;
    }

    setDurationCountdown((current) => {
      if (
        current &&
        current.exerciseKey === activeExercise.key &&
        current.setNumber === currentSetNumber
      ) {
        return current;
      }

      return {
        exerciseKey: activeExercise.key,
        setNumber: currentSetNumber,
        endsAtMs: Date.now() + activeDurationTargetSec * 1000,
      };
    });
  }, [
    activeDurationTargetSec,
    activeExercise,
    currentSetNumber,
    isActiveExerciseReadyToComplete,
    restRemainingSec,
  ]);

  const durationCountdownRemainingSec =
    durationCountdown &&
    activeExercise &&
    durationCountdown.exerciseKey === activeExercise.key &&
    durationCountdown.setNumber === currentSetNumber
      ? Math.max(0, Math.ceil((durationCountdown.endsAtMs - nowMs) / 1000))
      : null;

  const activeDurationSetKey =
    activeExercise &&
    activeDurationTargetSec !== null &&
    durationCountdown &&
    durationCountdown.exerciseKey === activeExercise.key &&
    durationCountdown.setNumber === currentSetNumber
      ? `${activeExercise.key}-${currentSetNumber}`
      : null;

  useEffect(() => {
    if (!activeDurationSetKey || durationCountdownRemainingSec !== 0) {
      return;
    }

    if (durationCountdownSoundSetKeyRef.current === activeDurationSetKey) {
      return;
    }

    durationCountdownSoundSetKeyRef.current = activeDurationSetKey;
    void playCountdownDoneSound(ensureCountdownAudioReady(), "duration");
  }, [activeDurationSetKey, durationCountdownRemainingSec, ensureCountdownAudioReady]);

  useEffect(() => {
    if (restEndsAtMs === null || restRemainingSec !== 0) {
      return;
    }

    if (restCountdownSoundEndAtMsRef.current === restEndsAtMs) {
      return;
    }

    restCountdownSoundEndAtMsRef.current = restEndsAtMs;
    void playCountdownDoneSound(ensureCountdownAudioReady(), "rest");
  }, [ensureCountdownAudioReady, restEndsAtMs, restRemainingSec]);

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

  const openExerciseEditor = (exerciseKey: string) => {
    if (
      isBusy
      || isFinalizingSession
      || isSessionCompleted
      || isSavingExerciseEdit
      || isRemovingExerciseEdit
    ) {
      return;
    }

    const exercise = exercises.find((item) => item.key === exerciseKey);
    if (!exercise) {
      return;
    }

    setExerciseEditError(null);
    setEditingExerciseKey(exercise.key);
    setExerciseEditDraft({
      exerciseName: exercise.exerciseName,
      trackingMode: exercise.trackingMode,
      targetSets: exercise.targetSets,
      targetReps: exercise.targetReps,
      targetWeightKg: exercise.targetWeightKg,
      targetDurationSec: exercise.targetDurationSec,
      restSec: exercise.restSec,
      loggedSetsCount: exercise.loggedSets.length,
    });
  };

  const closeExerciseEditor = () => {
    if (isSavingExerciseEdit || isRemovingExerciseEdit) {
      return;
    }

    setExerciseEditError(null);
    setEditingExerciseKey(null);
    setExerciseEditDraft(null);
  };

  const updateExerciseEditDraft = (patch: Partial<ExerciseEditDraft>) => {
    setExerciseEditDraft((current) =>
      current
        ? {
            ...current,
            ...patch,
          }
        : current,
    );
  };

  const handleSaveExerciseEdit = async () => {
    if (
      !editingExerciseKey ||
      !exerciseEditDraft ||
      isSavingExerciseEdit ||
      isRemovingExerciseEdit ||
      isBusy
    ) {
      return;
    }

    const exercise = exercises.find((item) => item.key === editingExerciseKey);
    if (!exercise) {
      return;
    }

    const normalizedName = exerciseEditDraft.exerciseName.trim();
    const normalizedSets = Math.max(1, Math.round(exerciseEditDraft.targetSets));
    const normalizedRestSec = Math.max(0, Math.round(exerciseEditDraft.restSec));
    const normalizedReps =
      exerciseEditDraft.trackingMode === "duration_only"
        ? null
        : exerciseEditDraft.targetReps !== null
          ? Math.max(0, Math.round(exerciseEditDraft.targetReps))
          : null;
    const normalizedWeight =
      exerciseEditDraft.trackingMode === "weight_reps"
        ? exerciseEditDraft.targetWeightKg !== null
          ? Math.max(0, exerciseEditDraft.targetWeightKg)
          : null
        : null;
    const normalizedDuration =
      exerciseEditDraft.trackingMode === "duration_only"
        ? exerciseEditDraft.targetDurationSec !== null
          ? Math.max(0, Math.round(exerciseEditDraft.targetDurationSec))
          : null
        : null;

    if (!normalizedName) {
      setExerciseEditError("Le nom de l exercice est obligatoire.");
      return;
    }

    if (normalizedSets < exercise.loggedSets.length) {
      setExerciseEditError(
        `Tu as deja ${exercise.loggedSets.length} sets loggues. Choisis au moins ${exercise.loggedSets.length} series.`,
      );
      return;
    }

    if (exerciseEditDraft.trackingMode !== "duration_only" && normalizedReps === null) {
      setExerciseEditError("Renseigne un objectif de repetitions.");
      return;
    }

    if (exerciseEditDraft.trackingMode === "duration_only" && normalizedDuration === null) {
      setExerciseEditError("Renseigne une duree cible.");
      return;
    }

    setIsSavingExerciseEdit(true);
    setExerciseEditError(null);

    try {
      if (sessionId && exercise.sessionExerciseId) {
        await updateSessionExerciseConfig(
          userId,
          sessionId,
          exercise.sessionExerciseId,
          {
            exerciseNameSnapshot: normalizedName,
            targetSets: normalizedSets,
            targetReps: normalizedReps,
            targetWeightKg: normalizedWeight,
            targetDurationSec: normalizedDuration,
            restSec: normalizedRestSec,
          },
        );
      }

      setExercises((previous) =>
        previous.map((item) =>
          item.key === editingExerciseKey
            ? {
                ...item,
                exerciseName: normalizedName,
                targetSets: normalizedSets,
                targetReps: normalizedReps,
                targetWeightKg: normalizedWeight,
                targetDurationSec: normalizedDuration,
                restSec: normalizedRestSec,
              }
            : item,
        ),
      );

      setExerciseEditDraft(null);
      setEditingExerciseKey(null);
    } catch {
      setExerciseEditError(
        "Impossible d enregistrer les modifications de l exercice. Reessaie.",
      );
    } finally {
      setIsSavingExerciseEdit(false);
    }
  };

  const handleRemoveExerciseFromSession = async () => {
    if (
      !editingExerciseKey
      || !exerciseEditDraft
      || isSavingExerciseEdit
      || isRemovingExerciseEdit
      || isBusy
    ) {
      return;
    }

    const exercise = exercises.find((item) => item.key === editingExerciseKey);
    if (!exercise) {
      return;
    }

    if (exercise.loggedSets.length > 0) {
      setExerciseEditError(
        "Impossible de retirer un exercice qui contient deja des sets enregistres.",
      );
      return;
    }

    const shouldRemove = window.confirm(
      `Retirer ${exercise.exerciseName} de cette seance ?`,
    );
    if (!shouldRemove) {
      return;
    }

    setIsRemovingExerciseEdit(true);
    setExerciseEditError(null);

    try {
      if (sessionId && exercise.sessionExerciseId) {
        await deleteSessionExercise(userId, sessionId, exercise.sessionExerciseId);
      }

      setExercises((previous) => previous.filter((item) => item.key !== exercise.key));

      if (activeExerciseKey === exercise.key) {
        setActiveExerciseKey(null);
        setView("exercise_list");
        setRestEndsAtMs(null);
        setDurationCountdown(null);
      }

      setExerciseEditDraft(null);
      setEditingExerciseKey(null);
      setHasAutoFinalizeAttempted(false);
      setIsSessionCompleted(false);
      setErrorMessage(null);
    } catch {
      setExerciseEditError(
        "Impossible de retirer cet exercice de la seance pour le moment. Reessaie.",
      );
    } finally {
      setIsRemovingExerciseEdit(false);
    }
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
        instructions: selectedExercise.instructions ?? null,
        isMachine: selectedExercise.isMachine ?? false,
        hasImage: selectedExercise.hasImage ?? false,
        hasVideo: selectedExercise.hasVideo ?? false,
        media: selectedExercise.media ?? null,
        source: selectedExercise.source ?? null,
        sourceUrl: selectedExercise.sourceUrl ?? null,
        sourceId: selectedExercise.sourceId ?? null,
        license: selectedExercise.license ?? null,
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

  const handleAddSharedExerciseToCurrentSession = async (
    sharedExerciseId: string,
  ): Promise<void> => {
    if (importingSharedExerciseId) {
      return;
    }

    setImportingSharedExerciseId(sharedExerciseId);
    setErrorMessage(null);

    try {
      const importedExerciseId = await importSharedExerciseToUser(
        userId,
        sharedExerciseId,
      );
      const refreshedExercises = await listExercises(userId);
      setAvailableExercises(refreshedExercises);
      await handleAddExerciseToCurrentSession(importedExerciseId, refreshedExercises);
    } catch {
      setErrorMessage(
        "Impossible d importer cet exercice partage pour le moment. Reessaie.",
      );
    } finally {
      setImportingSharedExerciseId(null);
    }
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

    ensureCountdownAudioReady();

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

    ensureCountdownAudioReady();

    if (restRemainingSec > 0) {
      return;
    }

    if (
      activeExercise.trackingMode === "duration_only" &&
      durationCountdownRemainingSec !== null &&
      durationCountdownRemainingSec > 0
    ) {
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
      const activeDurationSec = getDurationTargetSec(activeExercise);
      if (hasMoreSets && activeExercise.restSec > 0) {
        const restEndAt = await startRestAfterSet(
          userId,
          sessionId,
          activeExercise.sessionExerciseId,
          setId,
          activeExercise.restSec,
        );
        setRestEndsAtMs(restEndAt.toMillis());
        setDurationCountdown(null);
      } else {
        setRestEndsAtMs(null);
        if (hasMoreSets && activeDurationSec !== null) {
          setDurationCountdown({
            exerciseKey: activeExercise.key,
            setNumber: nextSetNumber + 1,
            endsAtMs: Date.now() + activeDurationSec * 1000,
          });
        } else {
          setDurationCountdown(null);
        }
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
        setDurationCountdown(null);
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
      setDurationCountdown(null);
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
    if (editingExerciseKey !== null) {
      closeExerciseEditor();
      return;
    }

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
    if (editingExerciseKey !== null) {
      closeExerciseEditor();
      return;
    }

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
          onEditExercise={openExerciseEditor}
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
          durationCountdownRemainingSec={durationCountdownRemainingSec}
          activeSetTarget={activeSetTarget}
          currentSetNumber={currentSetNumber}
          progressPercent={progressPercent}
          isActiveExerciseReadyToComplete={isActiveExerciseReadyToComplete}
          isBusy={isBusy}
          restRemainingSec={restRemainingSec}
          onEditExercise={() => {
            openExerciseEditor(activeExercise.key);
          }}
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
          userExercises={availableExercises}
          sharedExercises={sharedExercises}
          selectedExerciseIds={selectedExerciseIds}
          searchQuery={exerciseSearchQuery}
          isLoadingUserExercises={isLoadingExercises}
          isLoadingSharedExercises={isLoadingSharedExercises}
          importingSharedExerciseId={importingSharedExerciseId}
          onSearchChange={setExerciseSearchQuery}
          onClose={closeExercisePicker}
          onAddExercise={(exerciseId) => {
            void handleAddExerciseToCurrentSession(exerciseId);
          }}
          onAddSharedExercise={(sharedExerciseId) => {
            void handleAddSharedExerciseToCurrentSession(sharedExerciseId);
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

      {editingExerciseKey !== null && exerciseEditDraft !== null ? (
        <ExerciseEditModal
          draft={exerciseEditDraft}
          isSaving={isSavingExerciseEdit}
          isRemoving={isRemovingExerciseEdit}
          errorMessage={exerciseEditError}
          canRemove={exerciseEditDraft.loggedSetsCount === 0}
          onChange={updateExerciseEditDraft}
          onClose={closeExerciseEditor}
          onRemove={() => {
            void handleRemoveExerciseFromSession();
          }}
          onSave={() => {
            void handleSaveExerciseEdit();
          }}
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
