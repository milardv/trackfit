import { useEffect, useMemo, useState } from "react";
import { WorkoutPlanCard } from "../../components/WorkoutPlanCard.tsx";
import { ExerciseConfigScreen, type ExerciseConfig } from "../ExerciseConfigScreen/index.tsx";
import { ExercisePickerScreen } from "../ExercisePickerScreen/index.tsx";
import {
  createExercise,
  deleteSession,
  importSharedExerciseToUser,
  listExercises,
  listPlanItems,
  listPlans,
  listSessionExerciseSets,
  listSessionExercises,
  listSessions,
  listSharedExercises,
  updatePastSession,
} from "../../services/firestoreService.ts";
import type {
  ExerciseDoc,
  SessionDoc,
  SessionExerciseStatus,
  SessionStatus,
  SharedExerciseDoc,
  TrackingMode,
} from "../../types/firestore.ts";
import type { WorkoutPlanToStart } from "../WorkoutScreen/types.ts";
import { normalizeGymLabel } from "../WorkoutScreen/utils.ts";
import type { HomeScreenProps } from "./types.ts";
import {
  buildAvatarUrl,
  formatDuration,
  formatSessionDateTime,
  formatSignedPercent,
  getFirstName,
  getSessionBadge,
  toMillis,
} from "./utils.ts";

type HomePlanCard = WorkoutPlanToStart & {
  exerciseCount: number;
  exerciseNames: string[];
};

type LibraryExerciseOption = ExerciseDoc & { id: string };
type SharedLibraryExerciseOption = SharedExerciseDoc & { id: string };

interface PastExerciseSummary {
  id: string;
  exerciseId: string;
  name: string;
  status: SessionExerciseStatus;
  trackingMode: TrackingMode;
  targetSets: number;
  targetReps: number | null;
  targetWeightKg: number | null;
  targetDurationSec: number | null;
  restSec: number;
  completedSets: number;
  totalReps: number;
  totalVolumeKg: number;
  totalDurationSec: number;
}

interface PastSessionSummary {
  id: string;
  gymName: string;
  status: SessionStatus;
  startedAtMs: number;
  endedAtMs: number;
  durationSec: number;
  exerciseCount: number;
  completedExerciseCount: number;
  totalReps: number;
  totalVolumeKg: number;
  totalDurationSec: number;
  notes: string;
  exercises: PastExerciseSummary[];
}

interface SessionEditDraftExercise {
  id: string;
  exerciseId: string;
  name: string;
  status: SessionExerciseStatus;
  trackingMode: TrackingMode;
  targetSets: number;
  targetReps: number | null;
  targetWeightKg: number | null;
  targetDurationSec: number | null;
  restSec: number;
  completedSets: number;
  totalReps: number;
  totalDurationSec: number;
}

interface SessionEditDraft {
  gymName: string;
  status: Exclude<SessionStatus, "active">;
  notes: string;
  exercises: SessionEditDraftExercise[];
}

interface CompletedExerciseSeed {
  exerciseId: string;
  name: string;
  trackingMode: TrackingMode;
  targetSets: number;
  targetReps: number | null;
  targetWeightKg: number | null;
  targetDurationSec: number | null;
  restSec: number;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function getSessionDurationSec(session: SessionDoc): number {
  if (session.durationSec !== null && Number.isFinite(session.durationSec)) {
    return Math.max(0, Math.round(session.durationSec));
  }

  const startedAtMs = toMillis(session.startedAt);
  const endedAtMs = toMillis(session.endedAt ?? session.startedAt);
  return Math.max(0, Math.round((endedAtMs - startedAtMs) / 1000));
}

function getTrendPct(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) {
    return null;
  }

  if (previous <= 0) {
    return current > 0 ? 100 : 0;
  }

  return ((current - previous) / previous) * 100;
}

function getSessionStatusLabel(status: SessionStatus): string {
  if (status === "completed") {
    return "Terminee";
  }
  if (status === "cancelled") {
    return "Annulee";
  }
  return "Active";
}

function getExerciseStatusLabel(status: SessionExerciseStatus): string {
  if (status === "completed") {
    return "Termine";
  }
  if (status === "cancelled") {
    return "Annule";
  }
  return "Actif";
}

function getExerciseStatusClass(status: SessionExerciseStatus): string {
  if (status === "completed") {
    return "border-emerald-400/30 bg-emerald-500/10 text-emerald-300";
  }
  if (status === "cancelled") {
    return "border-amber-400/30 bg-amber-500/10 text-amber-300";
  }
  return "border-sky-400/30 bg-sky-500/10 text-sky-300";
}

function toNonActiveSessionStatus(status: SessionStatus): Exclude<SessionStatus, "active"> {
  return status === "cancelled" ? "cancelled" : "completed";
}

function createEditDraft(session: PastSessionSummary): SessionEditDraft {
  return {
    gymName: session.gymName,
    status: toNonActiveSessionStatus(session.status),
    notes: session.notes ?? "",
    exercises: session.exercises.map((exercise) => ({
      id: exercise.id,
      exerciseId: exercise.exerciseId,
      name: exercise.name,
      status: exercise.status === "cancelled" ? "cancelled" : "completed",
      trackingMode: exercise.trackingMode,
      targetSets: exercise.targetSets,
      targetReps: exercise.targetReps,
      targetWeightKg: exercise.targetWeightKg,
      targetDurationSec: exercise.targetDurationSec,
      restSec: exercise.restSec,
      completedSets: exercise.completedSets,
      totalReps: exercise.totalReps,
      totalDurationSec: exercise.totalDurationSec,
    })),
  };
}

function toPositiveInt(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.round(value));
}

function parseIntegerInput(rawValue: string): number {
  const parsed = Number.parseInt(rawValue, 10);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function parseOptionalNumberInput(rawValue: string): number | null {
  if (rawValue.trim().length === 0) {
    return null;
  }
  const parsed = Number.parseFloat(rawValue);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : null;
}

function createDraftExerciseId(): string {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? `draft-${crypto.randomUUID()}`
    : `draft-${Date.now()}`;
}

function createCompletedDraftExercise(seed: CompletedExerciseSeed): SessionEditDraftExercise {
  const targetSets = Math.max(1, toPositiveInt(seed.targetSets));
  const targetReps =
    typeof seed.targetReps === "number" ? Math.max(0, toPositiveInt(seed.targetReps)) : null;
  const targetWeightKg =
    typeof seed.targetWeightKg === "number" ? Math.max(0, seed.targetWeightKg) : null;
  const targetDurationSec =
    typeof seed.targetDurationSec === "number"
      ? Math.max(0, toPositiveInt(seed.targetDurationSec))
      : null;
  const completedSets = targetSets;

  return {
    id: createDraftExerciseId(),
    exerciseId: seed.exerciseId,
    name: seed.name.trim().length > 0 ? seed.name.trim() : "Exercice",
    status: "completed",
    trackingMode: seed.trackingMode,
    targetSets,
    targetReps,
    targetWeightKg,
    targetDurationSec,
    restSec: Math.max(0, toPositiveInt(seed.restSec)),
    completedSets,
    totalReps: seed.trackingMode === "duration_only" ? 0 : (targetReps ?? 0) * completedSets,
    totalDurationSec:
      seed.trackingMode === "duration_only" ? (targetDurationSec ?? 0) * completedSets : 0,
  };
}

export function HomeScreen({
  userId,
  displayName,
  photoURL,
  onCreateSession,
  onStartPlan,
}: HomeScreenProps) {
  const [todaysPlan, setTodaysPlan] = useState<HomePlanCard | null>(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);
  const [planError, setPlanError] = useState<string | null>(null);
  const [pastSessions, setPastSessions] = useState<PastSessionSummary[]>([]);
  const [isLoadingPastSessions, setIsLoadingPastSessions] = useState(true);
  const [pastSessionsError, setPastSessionsError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<PastSessionSummary | null>(null);
  const [isDeletingPastSession, setIsDeletingPastSession] = useState(false);
  const [isEditingPastSession, setIsEditingPastSession] = useState(false);
  const [isSavingPastSession, setIsSavingPastSession] = useState(false);
  const [editingPastSessionError, setEditingPastSessionError] = useState<string | null>(null);
  const [sessionEditDraft, setSessionEditDraft] = useState<SessionEditDraft | null>(null);
  const [deletePastSessionError, setDeletePastSessionError] = useState<string | null>(null);
  const [availableExercises, setAvailableExercises] = useState<LibraryExerciseOption[]>([]);
  const [sharedExercises, setSharedExercises] = useState<SharedLibraryExerciseOption[]>([]);
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState("");
  const [isExercisePickerOpen, setIsExercisePickerOpen] = useState(false);
  const [isExerciseConfigOpen, setIsExerciseConfigOpen] = useState(false);
  const [isLoadingExercises, setIsLoadingExercises] = useState(false);
  const [isLoadingSharedExercises, setIsLoadingSharedExercises] = useState(false);
  const [importingSharedExerciseId, setImportingSharedExerciseId] = useState<string | null>(null);
  const [isCreatingExercise, setIsCreatingExercise] = useState(false);
  const [exerciseCreateError, setExerciseCreateError] = useState<string | null>(null);
  const firstName = getFirstName(displayName);
  const avatarSrc = photoURL ?? buildAvatarUrl(displayName);
  const hasPlan = useMemo(() => Boolean(todaysPlan), [todaysPlan]);
  const recentPastSessions = useMemo(() => pastSessions.slice(0, 8), [pastSessions]);
  const selectedDraftExerciseIds = useMemo(
    () =>
      sessionEditDraft
        ? sessionEditDraft.exercises
            .map((exercise) => exercise.exerciseId.trim())
            .filter((exerciseId) => exerciseId.length > 0)
        : [],
    [sessionEditDraft],
  );
  const nowMs = Date.now();
  const latestSession = pastSessions[0] ?? null;
  const previousSession = pastSessions[1] ?? null;
  const lastSessionDuration = latestSession ? formatDuration(latestSession.durationSec) : "--";
  const durationTrendPct =
    latestSession && previousSession
      ? getTrendPct(latestSession.durationSec, previousSession.durationSec)
      : null;
  const volumeCurrentWeek = pastSessions
    .filter((session) => nowMs - session.endedAtMs <= SEVEN_DAYS_MS)
    .reduce((sum, session) => sum + session.totalVolumeKg, 0);
  const volumePreviousWeek = pastSessions
    .filter(
      (session) =>
        nowMs - session.endedAtMs > SEVEN_DAYS_MS &&
        nowMs - session.endedAtMs <= SEVEN_DAYS_MS * 2,
    )
    .reduce((sum, session) => sum + session.totalVolumeKg, 0);
  const volumeTrendPct = getTrendPct(volumeCurrentWeek, volumePreviousWeek);

  useEffect(() => {
    let cancelled = false;

    const loadTodaysPlan = async () => {
      setIsLoadingPlan(true);
      setPlanError(null);

      try {
        const [planDoc] = await listPlans(userId, 1);

        if (!planDoc) {
          if (!cancelled) {
            setTodaysPlan(null);
          }
          return;
        }

        const [items, exerciseDocs] = await Promise.all([
          listPlanItems(userId, planDoc.id, 40),
          listExercises(userId, 300),
        ]);
        const exerciseById = new Map(exerciseDocs.map((exercise) => [exercise.id, exercise]));
        const sortedItems = items.slice().sort((a, b) => a.order - b.order);

        const exercises = sortedItems.map((item, index) => {
          const linkedExercise = exerciseById.get(item.exerciseId);
          const exerciseName = linkedExercise?.name ?? "Exercice";
          const trackingMode = linkedExercise?.trackingMode ?? "reps_only";

          return {
            key: `${item.exerciseId}-${item.order}-${index}`,
            exerciseId: item.exerciseId,
            exerciseName,
            order: item.order,
            trackingMode,
            targetSets: Math.max(1, item.targetSets),
            targetReps: item.targetReps ?? null,
            targetWeightKg: item.targetWeightKg ?? null,
            targetDurationSec: item.targetDurationSec ?? null,
            restSec: Math.max(0, item.restSec),
            instructions: linkedExercise?.instructions ?? null,
            isMachine: linkedExercise?.isMachine ?? false,
            hasImage: linkedExercise?.hasImage ?? false,
            hasVideo: linkedExercise?.hasVideo ?? false,
            media: linkedExercise?.media ?? null,
            source: linkedExercise?.source ?? null,
            sourceUrl: linkedExercise?.sourceUrl ?? null,
            sourceId: linkedExercise?.sourceId ?? null,
            license: linkedExercise?.license ?? null,
          };
        });

        if (!cancelled) {
          setTodaysPlan({
            id: planDoc.id,
            name: planDoc.name,
            gymName: normalizeGymLabel(planDoc.gymName),
            estimatedDurationMin: planDoc.estimatedDurationMin ?? null,
            estimatedCaloriesKcal: planDoc.estimatedCaloriesKcal ?? null,
            estimationSource: planDoc.estimationSource ?? null,
            exerciseCount: exercises.length,
            exerciseNames: exercises.map((exercise) => exercise.exerciseName),
            exercises,
          });
        }
      } catch {
        if (!cancelled) {
          setPlanError("Impossible de charger votre seance du moment.");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingPlan(false);
        }
      }
    };

    void loadTodaysPlan();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    let cancelled = false;

    const loadPastSessions = async () => {
      setIsLoadingPastSessions(true);
      setPastSessionsError(null);

      try {
        const sessionDocs = await listSessions(userId, 40);
        const finishedSessions = sessionDocs.filter((session) => session.status !== "active");

        const sessionsWithDetails = await Promise.all(
          finishedSessions.map(async (session) => {
            const exerciseDocs = await listSessionExercises(userId, session.id, 150);
            const exercises = exerciseDocs
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((exercise) => ({
                id: exercise.id,
                exerciseId: exercise.exerciseId,
                name: exercise.exerciseNameSnapshot,
                status: exercise.status,
                trackingMode: exercise.trackingMode,
                targetSets: Math.max(1, exercise.targetSets),
                targetReps:
                  typeof exercise.targetReps === "number" ? Math.max(0, exercise.targetReps) : null,
                targetWeightKg:
                  typeof exercise.targetWeightKg === "number"
                    ? Math.max(0, exercise.targetWeightKg)
                    : null,
                targetDurationSec:
                  typeof exercise.targetDurationSec === "number"
                    ? Math.max(0, exercise.targetDurationSec)
                    : null,
                restSec: Math.max(0, exercise.restSec),
                completedSets: Math.max(0, exercise.completedSets),
                totalReps: Math.max(0, exercise.totalReps),
                totalVolumeKg: Math.max(0, exercise.totalVolumeKg),
                totalDurationSec: Math.max(0, exercise.totalDurationSec),
              }));

            const startedAtMs = toMillis(session.startedAt);
            const endedAtMs = toMillis(session.endedAt ?? session.startedAt);
            const durationSec = getSessionDurationSec(session);
            const completedExerciseCount = exercises.filter(
              (exercise) => exercise.status === "completed",
            ).length;
            const totalReps = exercises.reduce((sum, exercise) => sum + exercise.totalReps, 0);
            const totalVolumeKg = exercises.reduce(
              (sum, exercise) => sum + exercise.totalVolumeKg,
              0,
            );
            const totalDurationSec = exercises.reduce(
              (sum, exercise) => sum + exercise.totalDurationSec,
              0,
            );

            return {
              id: session.id,
              gymName: normalizeGymLabel(session.gymName),
              status: session.status,
              startedAtMs,
              endedAtMs,
              durationSec,
              exerciseCount: exercises.length,
              completedExerciseCount,
              totalReps,
              totalVolumeKg,
              totalDurationSec,
              notes: session.notes ?? "",
              exercises,
            } satisfies PastSessionSummary;
          }),
        );

        if (!cancelled) {
          const sortedSessions = sessionsWithDetails
            .slice()
            .sort((a, b) => b.endedAtMs - a.endedAtMs);
          setPastSessions(sortedSessions);
        }
      } catch {
        if (!cancelled) {
          setPastSessionsError("Impossible de charger vos seances passees.");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingPastSessions(false);
        }
      }
    };

    void loadPastSessions();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const appendDraftExercise = (exercise: SessionEditDraftExercise) => {
    setSessionEditDraft((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        exercises: [...current.exercises, exercise],
      };
    });
  };

  const handleLoadExerciseLibrary = async () => {
    setIsLoadingExercises(true);
    setIsLoadingSharedExercises(true);
    setEditingPastSessionError(null);

    try {
      const [userExercisesResult, sharedExercisesResult] = await Promise.allSettled([
        listExercises(userId),
        listSharedExercises(),
      ]);

      if (userExercisesResult.status === "rejected") {
        throw new Error("user-exercises-load-failed");
      }

      setAvailableExercises(userExercisesResult.value);

      if (sharedExercisesResult.status === "fulfilled") {
        setSharedExercises(sharedExercisesResult.value);
      } else {
        setSharedExercises([]);
        setEditingPastSessionError(
          "La bibliotheque partagee n a pas pu etre chargee pour le moment.",
        );
      }
    } catch {
      setEditingPastSessionError(
        "Impossible de charger la bibliotheque d exercices. Reessaie dans un instant.",
      );
      setIsExercisePickerOpen(false);
    } finally {
      setIsLoadingExercises(false);
      setIsLoadingSharedExercises(false);
    }
  };

  const handleOpenExercisePicker = () => {
    if (!isEditingPastSession || !sessionEditDraft) {
      return;
    }

    setDeletePastSessionError(null);
    setEditingPastSessionError(null);
    setExerciseCreateError(null);
    setExerciseSearchQuery("");
    setIsExercisePickerOpen(true);
    void handleLoadExerciseLibrary();
  };

  const handleCloseExercisePicker = () => {
    setExerciseSearchQuery("");
    setIsExercisePickerOpen(false);
  };

  const handleBackFromExerciseConfig = () => {
    setExerciseCreateError(null);
    setIsExerciseConfigOpen(false);
    setIsExercisePickerOpen(true);
  };

  const handleAddExerciseById = (exerciseId: string) => {
    const selectedExercise = availableExercises.find((exercise) => exercise.id === exerciseId);
    if (!selectedExercise) {
      return;
    }

    appendDraftExercise(
      createCompletedDraftExercise({
        exerciseId: selectedExercise.id,
        name: selectedExercise.name,
        trackingMode: selectedExercise.trackingMode,
        targetSets: selectedExercise.defaultSets,
        targetReps: selectedExercise.defaultReps,
        targetWeightKg: selectedExercise.defaultWeightKg,
        targetDurationSec: selectedExercise.defaultDurationSec,
        restSec: selectedExercise.defaultRestSec,
      }),
    );

    setEditingPastSessionError(null);
    handleCloseExercisePicker();
  };

  const handleAddSharedExercise = async (sharedExerciseId: string): Promise<void> => {
    if (importingSharedExerciseId) {
      return;
    }

    setImportingSharedExerciseId(sharedExerciseId);
    setEditingPastSessionError(null);

    try {
      const importedExerciseId = await importSharedExerciseToUser(userId, sharedExerciseId);
      const exercises = await listExercises(userId);
      setAvailableExercises(exercises);
      const importedExercise = exercises.find((exercise) => exercise.id === importedExerciseId);

      if (!importedExercise) {
        throw new Error("imported-exercise-not-found");
      }

      appendDraftExercise(
        createCompletedDraftExercise({
          exerciseId: importedExercise.id,
          name: importedExercise.name,
          trackingMode: importedExercise.trackingMode,
          targetSets: importedExercise.defaultSets,
          targetReps: importedExercise.defaultReps,
          targetWeightKg: importedExercise.defaultWeightKg,
          targetDurationSec: importedExercise.defaultDurationSec,
          restSec: importedExercise.defaultRestSec,
        }),
      );
      handleCloseExercisePicker();
    } catch {
      setEditingPastSessionError(
        "Impossible d importer cet exercice partage pour le moment.",
      );
    } finally {
      setImportingSharedExerciseId(null);
    }
  };

  const handleCreateExerciseFromPicker = () => {
    setExerciseCreateError(null);
    setIsExercisePickerOpen(false);
    setIsExerciseConfigOpen(true);
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
      const exercises = await listExercises(userId);
      setAvailableExercises(exercises);
      appendDraftExercise(
        createCompletedDraftExercise({
          exerciseId: createdExerciseId,
          name: config.name,
          trackingMode: config.trackingMode,
          targetSets: config.sets,
          targetReps: config.reps,
          targetWeightKg: config.weightKg,
          targetDurationSec: config.durationSec,
          restSec: config.restSec,
        }),
      );
      setIsExerciseConfigOpen(false);
      setEditingPastSessionError(null);
    } catch {
      setExerciseCreateError(
        "Impossible de creer l exercice pour le moment. Reessaie dans un instant.",
      );
    } finally {
      setIsCreatingExercise(false);
    }
  };

  const handleOpenSessionDetails = async (session: PastSessionSummary) => {
    setDeletePastSessionError(null);
    setEditingPastSessionError(null);
    setIsEditingPastSession(false);
    setSessionEditDraft(null);
    setSelectedSession(session);

    try {
      const exercisesWithSetTotals = await Promise.all(
        session.exercises.map(async (exercise) => {
          const sets = await listSessionExerciseSets(userId, session.id, exercise.id, 250);
          if (sets.length === 0) {
            return exercise;
          }

          const totalReps = sets.reduce((sum, setEntry) => sum + (setEntry.reps ?? 0), 0);
          const totalDurationSec = sets.reduce(
            (sum, setEntry) => sum + (setEntry.durationSec ?? 0),
            0,
          );
          const totalVolumeKg = sets.reduce(
            (sum, setEntry) =>
              sum + (setEntry.reps ?? 0) * (setEntry.weightKg ?? 0),
            0,
          );

          return {
            ...exercise,
            completedSets: sets.length,
            totalReps,
            totalDurationSec,
            totalVolumeKg,
          } satisfies PastExerciseSummary;
        }),
      );

      const recalculatedSession: PastSessionSummary = {
        ...session,
        exercises: exercisesWithSetTotals,
        exerciseCount: exercisesWithSetTotals.length,
        completedExerciseCount: exercisesWithSetTotals.filter(
          (exercise) => exercise.status === "completed",
        ).length,
        totalReps: exercisesWithSetTotals.reduce((sum, exercise) => sum + exercise.totalReps, 0),
        totalDurationSec: exercisesWithSetTotals.reduce(
          (sum, exercise) => sum + exercise.totalDurationSec,
          0,
        ),
        totalVolumeKg: exercisesWithSetTotals.reduce(
          (sum, exercise) => sum + exercise.totalVolumeKg,
          0,
        ),
      };

      setSelectedSession((current) =>
        current && current.id === session.id ? recalculatedSession : current,
      );
      setPastSessions((current) =>
        current.map((entry) => (entry.id === session.id ? recalculatedSession : entry)),
      );
    } catch {
      // Fallback to stored aggregates when set-based recalculation is unavailable.
    }
  };

  const handleCloseSessionDetails = () => {
    if (isDeletingPastSession || isSavingPastSession) {
      return;
    }
    setDeletePastSessionError(null);
    setEditingPastSessionError(null);
    setExerciseCreateError(null);
    setExerciseSearchQuery("");
    setIsExercisePickerOpen(false);
    setIsExerciseConfigOpen(false);
    setIsEditingPastSession(false);
    setSessionEditDraft(null);
    setSelectedSession(null);
  };

  const handleDeleteSelectedSession = async () => {
    if (!selectedSession || isDeletingPastSession) {
      return;
    }

    const confirmed = window.confirm(
      "Supprimer cette seance passee ? Cette action est definitive.",
    );
    if (!confirmed) {
      return;
    }

    setIsDeletingPastSession(true);
    setDeletePastSessionError(null);

    try {
      await deleteSession(userId, selectedSession.id);
      setPastSessions((current) =>
        current.filter((session) => session.id !== selectedSession.id),
      );
      setSelectedSession(null);
    } catch {
      setDeletePastSessionError(
        "Impossible de supprimer cette seance pour le moment. Reessaie dans un instant.",
      );
    } finally {
      setIsDeletingPastSession(false);
    }
  };

  const handleStartEditingPastSession = () => {
    if (!selectedSession || isDeletingPastSession || isSavingPastSession) {
      return;
    }

    setDeletePastSessionError(null);
    setEditingPastSessionError(null);
    setExerciseCreateError(null);
    setIsExercisePickerOpen(false);
    setIsExerciseConfigOpen(false);
    setSessionEditDraft(createEditDraft(selectedSession));
    setIsEditingPastSession(true);
  };

  const handleCancelEditingPastSession = () => {
    if (isSavingPastSession) {
      return;
    }

    setEditingPastSessionError(null);
    setExerciseCreateError(null);
    setExerciseSearchQuery("");
    setIsExercisePickerOpen(false);
    setIsExerciseConfigOpen(false);
    setSessionEditDraft(null);
    setIsEditingPastSession(false);
  };

  const updateDraftExercise = (
    exerciseId: string,
    updater: (exercise: SessionEditDraftExercise) => SessionEditDraftExercise,
  ) => {
    setSessionEditDraft((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        exercises: current.exercises.map((exercise) =>
          exercise.id === exerciseId ? updater(exercise) : exercise,
        ),
      };
    });
  };

  const handleAddExerciseToDraft = () => {
    setSessionEditDraft((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        exercises: [
          ...current.exercises,
          {
            id: createDraftExerciseId(),
            exerciseId: "",
            name: "Nouvel exercice",
            status: "completed",
            trackingMode: "reps_only",
            targetSets: 3,
            targetReps: null,
            targetWeightKg: null,
            targetDurationSec: null,
            restSec: 30,
            completedSets: 0,
            totalReps: 0,
            totalDurationSec: 0,
          },
        ],
      };
    });
  };

  const handleRemoveExerciseFromDraft = (exerciseId: string) => {
    setSessionEditDraft((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        exercises: current.exercises.filter((exercise) => exercise.id !== exerciseId),
      };
    });
  };

  const applyDraftToSession = (
    baseSession: PastSessionSummary,
    draft: SessionEditDraft,
  ): PastSessionSummary => {
    const normalizedExercises = draft.exercises.map((exercise) => {
      const weight = typeof exercise.targetWeightKg === "number" ? exercise.targetWeightKg : null;
      const reps = toPositiveInt(exercise.totalReps);
      const estimatedVolume = weight !== null ? Math.round(weight * reps) : 0;
      return {
        id: exercise.id,
        exerciseId:
          exercise.exerciseId.trim().length > 0
            ? exercise.exerciseId.trim()
            : `manual-${baseSession.id}-${exercise.id}`,
        name: exercise.name.trim().length > 0 ? exercise.name.trim() : "Exercice",
        status: exercise.status,
        trackingMode: exercise.trackingMode,
        targetSets: Math.max(1, toPositiveInt(exercise.targetSets)),
        targetReps:
          typeof exercise.targetReps === "number" ? Math.max(0, toPositiveInt(exercise.targetReps)) : null,
        targetWeightKg: weight,
        targetDurationSec:
          typeof exercise.targetDurationSec === "number"
            ? Math.max(0, toPositiveInt(exercise.targetDurationSec))
            : null,
        restSec: Math.max(0, toPositiveInt(exercise.restSec)),
        completedSets: Math.max(
          0,
          Math.min(toPositiveInt(exercise.completedSets), Math.max(1, toPositiveInt(exercise.targetSets))),
        ),
        totalReps: reps,
        totalVolumeKg: estimatedVolume,
        totalDurationSec: toPositiveInt(exercise.totalDurationSec),
      } satisfies PastExerciseSummary;
    });

    const totalReps = normalizedExercises.reduce((sum, exercise) => sum + exercise.totalReps, 0);
    const totalVolumeKg = normalizedExercises.reduce(
      (sum, exercise) => sum + exercise.totalVolumeKg,
      0,
    );
    const totalDurationSec = normalizedExercises.reduce(
      (sum, exercise) => sum + exercise.totalDurationSec,
      0,
    );
    const completedExerciseCount = normalizedExercises.filter(
      (exercise) => exercise.status === "completed",
    ).length;

    return {
      ...baseSession,
      gymName: draft.gymName.trim().length > 0 ? draft.gymName.trim() : baseSession.gymName,
      status: draft.status,
      notes: draft.notes,
      exerciseCount: normalizedExercises.length,
      completedExerciseCount,
      totalReps,
      totalVolumeKg,
      totalDurationSec,
      exercises: normalizedExercises,
    };
  };

  const handleSaveEditedPastSession = async () => {
    if (
      !selectedSession ||
      !sessionEditDraft ||
      isSavingPastSession ||
      isDeletingPastSession
    ) {
      return;
    }

    if (sessionEditDraft.exercises.length === 0) {
      setEditingPastSessionError("Ajoute au moins un exercice a cette seance.");
      return;
    }

    setIsSavingPastSession(true);
    setDeletePastSessionError(null);
    setEditingPastSessionError(null);

    try {
      const normalizedSession = applyDraftToSession(selectedSession, sessionEditDraft);
      await updatePastSession(userId, selectedSession.id, {
        gymName: normalizedSession.gymName,
        status: toNonActiveSessionStatus(normalizedSession.status),
        notes: normalizedSession.notes,
        exercises: normalizedSession.exercises.map((exercise, index) => ({
          id: exercise.id,
          exerciseId: exercise.exerciseId,
          exerciseNameSnapshot: exercise.name,
          status: exercise.status,
          order: index + 1,
          trackingMode: exercise.trackingMode,
          targetSets: exercise.targetSets,
          targetReps: exercise.targetReps,
          targetWeightKg: exercise.targetWeightKg,
          targetDurationSec: exercise.targetDurationSec,
          restSec: exercise.restSec,
          completedSets: exercise.completedSets,
          totalReps: exercise.totalReps,
          totalVolumeKg: exercise.totalVolumeKg,
          totalDurationSec: exercise.totalDurationSec,
        })),
      });

      setPastSessions((current) =>
        current
          .map((session) =>
            session.id === selectedSession.id ? normalizedSession : session,
          )
          .sort((a, b) => b.endedAtMs - a.endedAtMs),
      );
      setSelectedSession(normalizedSession);
      setSessionEditDraft(createEditDraft(normalizedSession));
      setExerciseCreateError(null);
      setExerciseSearchQuery("");
      setIsExercisePickerOpen(false);
      setIsExerciseConfigOpen(false);
      setIsEditingPastSession(false);
    } catch {
      setEditingPastSessionError(
        "Impossible de mettre a jour cette seance pour le moment. Reessaie dans un instant.",
      );
    } finally {
      setIsSavingPastSession(false);
    }
  };

  const displayedSession =
    selectedSession && isEditingPastSession && sessionEditDraft
      ? applyDraftToSession(selectedSession, sessionEditDraft)
      : selectedSession;

  return (
    <div className="flex flex-col gap-6 p-4 pb-24">
      {/* Header */}
      <header className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 overflow-hidden rounded-full border-2 border-primary bg-card-dark">
            <img
              src={avatarSrc}
              alt="Photo de profil"
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <p className="text-sm text-text-secondary">Bienvenue, {firstName}</p>
            <h1 className="text-lg font-bold text-white">{displayName}</h1>
          </div>
        </div>
      </header>

      {/* Today's Plan */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Séance du jour</h2>
        </div>

        {isLoadingPlan ? (
          <div className="rounded-2xl border border-white/5 bg-card-dark p-5 text-sm text-slate-400">
            Chargement de votre seance...
          </div>
        ) : null}

        {planError ? (
          <p className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {planError}
          </p>
        ) : null}

        {!isLoadingPlan && !planError && hasPlan && todaysPlan ? (
          <WorkoutPlanCard
            name={todaysPlan.name}
            gymName={todaysPlan.gymName}
            exerciseCount={todaysPlan.exerciseCount}
            exerciseNames={todaysPlan.exerciseNames}
            canStart={todaysPlan.exercises.length > 0}
            onStart={(event) => {
              event.stopPropagation();
              onStartPlan(todaysPlan);
            }}
          />
        ) : null}

        {!isLoadingPlan && !planError && !hasPlan ? (
          <div className="flex flex-col gap-4 rounded-2xl border border-white/5 bg-card-dark p-6">
            <h3 className="text-lg font-bold text-white">Aucune seance enregistree</h3>
            <p className="text-sm text-slate-400">
              Creez une seance pour l afficher directement sur l accueil.
            </p>
            <button
              type="button"
              onClick={onCreateSession}
              className="flex h-12 items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 font-bold text-primary transition-colors hover:bg-primary/20"
            >
              <span className="material-symbols-outlined">add_circle</span>
              Creer une seance
            </button>
          </div>
        ) : null}
      </section>

      {/* Weekly Progress */}
      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-bold text-white">Progression hebdo</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-4 rounded-2xl border border-white/5 bg-card-dark p-5">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
                <span className="material-symbols-outlined">schedule</span>
              </div>
              <span className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "14px" }}
                >
                  trending_up
                </span>
                {formatSignedPercent(durationTrendPct)}
              </span>
            </div>
            <div>
              <p className="text-sm text-text-secondary">Derniere seance</p>
              <p className="text-2xl font-bold text-white">{lastSessionDuration}</p>
              <p className="mt-1 text-xs text-text-secondary">
                {latestSession
                  ? formatSessionDateTime(latestSession.endedAtMs)
                  : "Aucune seance"}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl border border-white/5 bg-card-dark p-5">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/20 text-purple-400">
                <span className="material-symbols-outlined">weight</span>
              </div>
              <span className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "14px" }}
                >
                  trending_up
                </span>
                {formatSignedPercent(volumeTrendPct)}
              </span>
            </div>
            <div>
              <p className="text-sm text-text-secondary">Volume 7 jours</p>
              <p className="text-2xl font-bold text-white">
                {Math.round(volumeCurrentWeek)}
                <span className="text-sm font-normal text-text-secondary">
                  {" "}
                  kg
                </span>
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                Semaine precedente: {Math.round(volumePreviousWeek)} kg
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Past Sessions */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Seances passees</h2>
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {pastSessions.length} total
          </span>
        </div>

        {isLoadingPastSessions ? (
          <div className="rounded-2xl border border-white/5 bg-card-dark p-5 text-sm text-slate-400">
            Chargement des seances passees...
          </div>
        ) : null}

        {pastSessionsError ? (
          <p className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {pastSessionsError}
          </p>
        ) : null}

        {!isLoadingPastSessions && !pastSessionsError && recentPastSessions.length === 0 ? (
          <div className="rounded-2xl border border-white/5 bg-card-dark p-5">
            <p className="text-sm text-slate-400">Aucune seance passee pour le moment.</p>
          </div>
        ) : null}

        {!isLoadingPastSessions && !pastSessionsError && recentPastSessions.length > 0 ? (
          <div className="flex flex-col gap-3">
            {recentPastSessions.map((session) => {
              const badge = getSessionBadge(session.endedAtMs);

              return (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => handleOpenSessionDetails(session)}
                  className="flex items-center justify-between rounded-2xl border border-white/5 bg-card-dark p-4 text-left transition-colors hover:border-primary/35"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex min-w-[58px] flex-col items-center justify-center rounded-xl bg-background-dark px-3 py-2">
                      <span className="text-xs font-bold text-text-secondary">
                        {badge.month}
                      </span>
                      <span className="text-xl font-bold text-white">{badge.day}</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-white">{session.gymName}</h4>
                      <p className="text-xs text-slate-400">
                        {formatSessionDateTime(session.endedAtMs)}
                      </p>
                      <p className="text-sm text-text-secondary">
                        {session.completedExerciseCount}/{session.exerciseCount} ex •{" "}
                        {formatDuration(session.durationSec)} • {Math.round(session.totalVolumeKg)} kg
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-white/15 bg-black/20 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-200">
                      {getSessionStatusLabel(session.status)}
                    </span>
                    <span
                      className="material-symbols-outlined text-white"
                      style={{ fontSize: "20px" }}
                    >
                      chevron_right
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}
      </section>

      {selectedSession && displayedSession ? (
        <div
          className="fixed inset-0 z-[95] flex items-end justify-center bg-black/70 p-4 sm:items-center"
          onClick={handleCloseSessionDetails}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-background-dark"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div>
                <h3 className="text-lg font-bold text-white">
                  {isEditingPastSession ? "Modifier la seance" : "Detail seance"}
                </h3>
                <p className="text-xs text-slate-400">
                  {formatSessionDateTime(displayedSession.endedAtMs)}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseSessionDetails}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-card-dark text-white transition-colors hover:bg-white/10"
                aria-label="Fermer le detail de la seance"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </header>

            <div className="hide-scrollbar flex flex-1 flex-col gap-4 overflow-y-auto p-4">
              <div className="rounded-2xl border border-white/5 bg-card-dark p-4">
                {isEditingPastSession && sessionEditDraft ? (
                  <div className="mb-4 grid grid-cols-1 gap-3">
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                        Lieu
                      </span>
                      <input
                        type="text"
                        value={sessionEditDraft.gymName}
                        onChange={(event) =>
                          setSessionEditDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  gymName: event.target.value,
                                }
                              : current,
                          )
                        }
                        className="h-10 rounded-lg border border-white/10 bg-background-dark px-3 text-sm text-white outline-none transition-colors focus:border-primary/40"
                      />
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex flex-col gap-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                          Statut
                        </span>
                        <select
                          value={sessionEditDraft.status}
                          onChange={(event) =>
                            setSessionEditDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    status:
                                      event.target.value === "cancelled"
                                        ? "cancelled"
                                        : "completed",
                                  }
                                : current,
                            )
                          }
                          className="h-10 rounded-lg border border-white/10 bg-background-dark px-3 text-sm text-white outline-none transition-colors focus:border-primary/40"
                        >
                          <option value="completed">Terminee</option>
                          <option value="cancelled">Annulee</option>
                        </select>
                      </label>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                          Date
                        </span>
                        <p className="flex h-10 items-center rounded-lg border border-white/10 bg-background-dark px-3 text-sm text-slate-300">
                          {formatSessionDateTime(displayedSession.endedAtMs)}
                        </p>
                      </div>
                    </div>

                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                        Notes
                      </span>
                      <textarea
                        value={sessionEditDraft.notes}
                        onChange={(event) =>
                          setSessionEditDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  notes: event.target.value,
                                }
                              : current,
                          )
                        }
                        rows={2}
                        className="rounded-lg border border-white/10 bg-background-dark px-3 py-2 text-sm text-white outline-none transition-colors focus:border-primary/40"
                      />
                    </label>
                  </div>
                ) : (
                  <div className="mb-3 flex items-center justify-between">
                    <p className="font-semibold text-white">{displayedSession.gymName}</p>
                    <span className="rounded-full border border-white/15 bg-black/20 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-200">
                      {getSessionStatusLabel(displayedSession.status)}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg border border-white/5 bg-background-dark px-2 py-2">
                    <p className="text-xs text-slate-400">Duree</p>
                    <p className="text-sm font-semibold text-white">
                      {formatDuration(displayedSession.durationSec)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/5 bg-background-dark px-2 py-2">
                    <p className="text-xs text-slate-400">Volume</p>
                    <p className="text-sm font-semibold text-white">
                      {Math.round(displayedSession.totalVolumeKg)} kg
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/5 bg-background-dark px-2 py-2">
                    <p className="text-xs text-slate-400">Mouvements</p>
                    <p className="text-sm font-semibold text-white">{displayedSession.totalReps}</p>
                  </div>
                </div>
              </div>

              <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                    Exercices
                  </h4>
                  {isEditingPastSession ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleOpenExercisePicker}
                        className="flex h-8 items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
                      >
                        <span className="material-symbols-outlined text-sm">fitness_center</span>
                        Bibliotheque
                      </button>
                      <button
                        type="button"
                        onClick={handleAddExerciseToDraft}
                        className="flex h-8 items-center gap-1 rounded-full border border-white/10 bg-card-dark px-3 text-xs font-semibold text-white transition-colors hover:border-white/20"
                      >
                        <span className="material-symbols-outlined text-sm">edit_square</span>
                        Manuel
                      </button>
                    </div>
                  ) : null}
                </div>

                {isEditingPastSession && sessionEditDraft ? (
                  sessionEditDraft.exercises.length === 0 ? (
                    <p className="rounded-xl border border-white/5 bg-card-dark px-3 py-3 text-sm text-slate-400">
                      Aucun exercice. Ajoute un exercice pour sauvegarder.
                    </p>
                  ) : (
                    sessionEditDraft.exercises.map((exercise, index) => (
                      <article
                        key={exercise.id}
                        className="rounded-xl border border-white/5 bg-card-dark px-3 py-3"
                      >
                        <div className="mb-3 flex items-center gap-2">
                          <input
                            type="text"
                            value={exercise.name}
                            onChange={(event) =>
                              updateDraftExercise(exercise.id, (current) => ({
                                ...current,
                                name: event.target.value,
                              }))
                            }
                            className="h-10 flex-1 rounded-lg border border-white/10 bg-background-dark px-3 text-sm font-semibold text-white outline-none transition-colors focus:border-primary/40"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveExerciseFromDraft(exercise.id)}
                            className="flex h-10 w-10 items-center justify-center rounded-lg border border-rose-400/40 bg-rose-500/10 text-rose-200 transition-colors hover:bg-rose-500/20"
                            aria-label={`Supprimer l exercice ${index + 1}`}
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        </div>

                        <div className="mb-3 grid grid-cols-2 gap-2">
                          <label className="flex flex-col gap-1">
                            <span className="text-[11px] uppercase tracking-wide text-slate-400">
                              Mode
                            </span>
                            <select
                              value={exercise.trackingMode}
                              onChange={(event) =>
                                updateDraftExercise(exercise.id, (current) => ({
                                  ...current,
                                  trackingMode: event.target.value as TrackingMode,
                                }))
                              }
                              className="h-9 rounded-lg border border-white/10 bg-background-dark px-2 text-xs text-white outline-none transition-colors focus:border-primary/40"
                            >
                              <option value="weight_reps">Poids + reps</option>
                              <option value="reps_only">Reps only</option>
                              <option value="duration_only">Duree</option>
                            </select>
                          </label>
                          <label className="flex flex-col gap-1">
                            <span className="text-[11px] uppercase tracking-wide text-slate-400">
                              Statut
                            </span>
                            <select
                              value={exercise.status}
                              onChange={(event) =>
                                updateDraftExercise(exercise.id, (current) => ({
                                  ...current,
                                  status:
                                    event.target.value === "cancelled" ? "cancelled" : "completed",
                                }))
                              }
                              className="h-9 rounded-lg border border-white/10 bg-background-dark px-2 text-xs text-white outline-none transition-colors focus:border-primary/40"
                            >
                              <option value="completed">Termine</option>
                              <option value="cancelled">Annule</option>
                            </select>
                          </label>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <label className="flex flex-col gap-1">
                            <span className="text-[11px] uppercase tracking-wide text-slate-400">
                              Series cible
                            </span>
                            <input
                              type="number"
                              min={1}
                              value={exercise.targetSets}
                              onChange={(event) =>
                                updateDraftExercise(exercise.id, (current) => ({
                                  ...current,
                                  targetSets: Math.max(1, parseIntegerInput(event.target.value)),
                                }))
                              }
                              className="h-9 rounded-lg border border-white/10 bg-background-dark px-2 text-sm text-white outline-none transition-colors focus:border-primary/40"
                            />
                          </label>
                          <label className="flex flex-col gap-1">
                            <span className="text-[11px] uppercase tracking-wide text-slate-400">
                              Series faites
                            </span>
                            <input
                              type="number"
                              min={0}
                              value={exercise.completedSets}
                              onChange={(event) =>
                                updateDraftExercise(exercise.id, (current) => ({
                                  ...current,
                                  completedSets: parseIntegerInput(event.target.value),
                                }))
                              }
                              className="h-9 rounded-lg border border-white/10 bg-background-dark px-2 text-sm text-white outline-none transition-colors focus:border-primary/40"
                            />
                          </label>
                          <label className="flex flex-col gap-1">
                            <span className="text-[11px] uppercase tracking-wide text-slate-400">
                              Reps totales
                            </span>
                            <input
                              type="number"
                              min={0}
                              value={exercise.totalReps}
                              onChange={(event) =>
                                updateDraftExercise(exercise.id, (current) => ({
                                  ...current,
                                  totalReps: parseIntegerInput(event.target.value),
                                }))
                              }
                              className="h-9 rounded-lg border border-white/10 bg-background-dark px-2 text-sm text-white outline-none transition-colors focus:border-primary/40"
                            />
                          </label>
                          <label className="flex flex-col gap-1">
                            <span className="text-[11px] uppercase tracking-wide text-slate-400">
                              Poids (kg)
                            </span>
                            <input
                              type="number"
                              min={0}
                              step="0.5"
                              value={exercise.targetWeightKg ?? ""}
                              onChange={(event) =>
                                updateDraftExercise(exercise.id, (current) => ({
                                  ...current,
                                  targetWeightKg: parseOptionalNumberInput(event.target.value),
                                }))
                              }
                              className="h-9 rounded-lg border border-white/10 bg-background-dark px-2 text-sm text-white outline-none transition-colors focus:border-primary/40"
                            />
                          </label>
                          <label className="flex flex-col gap-1">
                            <span className="text-[11px] uppercase tracking-wide text-slate-400">
                              Duree (sec)
                            </span>
                            <input
                              type="number"
                              min={0}
                              value={exercise.totalDurationSec}
                              onChange={(event) =>
                                updateDraftExercise(exercise.id, (current) => ({
                                  ...current,
                                  totalDurationSec: parseIntegerInput(event.target.value),
                                }))
                              }
                              className="h-9 rounded-lg border border-white/10 bg-background-dark px-2 text-sm text-white outline-none transition-colors focus:border-primary/40"
                            />
                          </label>
                          <label className="flex flex-col gap-1">
                            <span className="text-[11px] uppercase tracking-wide text-slate-400">
                              Repos (sec)
                            </span>
                            <input
                              type="number"
                              min={0}
                              value={exercise.restSec}
                              onChange={(event) =>
                                updateDraftExercise(exercise.id, (current) => ({
                                  ...current,
                                  restSec: parseIntegerInput(event.target.value),
                                }))
                              }
                              className="h-9 rounded-lg border border-white/10 bg-background-dark px-2 text-sm text-white outline-none transition-colors focus:border-primary/40"
                            />
                          </label>
                        </div>

                        <p className="mt-2 text-[11px] text-slate-400">
                          Volume estime:{" "}
                          {Math.round((exercise.targetWeightKg ?? 0) * Math.max(0, exercise.totalReps))}
                          {" "}kg
                        </p>
                      </article>
                    ))
                  )
                ) : displayedSession.exercises.length === 0 ? (
                  <p className="rounded-xl border border-white/5 bg-card-dark px-3 py-3 text-sm text-slate-400">
                    Aucun exercice enregistre pour cette seance.
                  </p>
                ) : (
                  displayedSession.exercises.map((exercise) => (
                    <article
                      key={exercise.id}
                      className="rounded-xl border border-white/5 bg-card-dark px-3 py-3"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="font-semibold text-white">{exercise.name}</p>
                        <span
                          className={`rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${getExerciseStatusClass(exercise.status)}`}
                        >
                          {getExerciseStatusLabel(exercise.status)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">
                        Series: {exercise.completedSets}/{exercise.targetSets} • Reps:{" "}
                        {exercise.totalReps} • Volume: {Math.round(exercise.totalVolumeKg)} kg •
                        Temps: {Math.round(exercise.totalDurationSec)} sec
                      </p>
                    </article>
                  ))
                )}
              </section>

              {editingPastSessionError ? (
                <p className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                  {editingPastSessionError}
                </p>
              ) : null}

              {deletePastSessionError ? (
                <p className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                  {deletePastSessionError}
                </p>
              ) : null}
            </div>

            <footer className="border-t border-white/10 p-4">
              {isEditingPastSession ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleCancelEditingPastSession}
                    disabled={isSavingPastSession}
                    className="flex h-11 items-center justify-center rounded-xl border border-white/15 bg-card-dark text-sm font-semibold text-white transition-colors hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void handleSaveEditedPastSession();
                    }}
                    disabled={isSavingPastSession}
                    className="flex h-11 items-center justify-center rounded-xl border border-primary/40 bg-primary/15 text-sm font-semibold text-primary transition-colors hover:bg-primary/25 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSavingPastSession ? "Enregistrement..." : "Enregistrer"}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={handleCloseSessionDetails}
                    className="flex h-11 items-center justify-center rounded-xl border border-white/15 bg-card-dark text-sm font-semibold text-white transition-colors hover:border-white/30"
                  >
                    Fermer
                  </button>
                  <button
                    type="button"
                    onClick={handleStartEditingPastSession}
                    className="flex h-11 items-center justify-center rounded-xl border border-primary/40 bg-primary/10 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void handleDeleteSelectedSession();
                    }}
                    disabled={isDeletingPastSession}
                    className="flex h-11 items-center justify-center rounded-xl border border-rose-400/40 bg-rose-500/10 text-sm font-semibold text-rose-200 transition-colors hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isDeletingPastSession ? "Suppression..." : "Supprimer"}
                  </button>
                </div>
              )}
            </footer>
          </div>
        </div>
      ) : null}

      {isExercisePickerOpen ? (
        <ExercisePickerScreen
          userExercises={availableExercises}
          sharedExercises={sharedExercises}
          selectedExerciseIds={selectedDraftExerciseIds}
          searchQuery={exerciseSearchQuery}
          isLoadingUserExercises={isLoadingExercises}
          isLoadingSharedExercises={isLoadingSharedExercises}
          importingSharedExerciseId={importingSharedExerciseId}
          onSearchChange={setExerciseSearchQuery}
          onClose={handleCloseExercisePicker}
          onAddExercise={handleAddExerciseById}
          onAddSharedExercise={handleAddSharedExercise}
          onCreateExercise={handleCreateExerciseFromPicker}
        />
      ) : null}

      {isExerciseConfigOpen ? (
        <ExerciseConfigScreen
          onBack={handleBackFromExerciseConfig}
          onCreate={handleCreateExerciseFromConfig}
          isSubmitting={isCreatingExercise}
          errorMessage={exerciseCreateError}
          zIndexClass="z-[102]"
        />
      ) : null}
    </div>
  );
}
