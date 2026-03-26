import { useCallback, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { BottomNav } from "../components/BottomNav.tsx";
import { PwaInstallBanner } from "../components/PwaInstallBanner.tsx";
import {
  CreateSessionScreen,
  type SessionConfig,
} from "../screens/CreateSessionScreen/index.tsx";
import {
  ExerciseConfigScreen,
  type ExerciseConfig,
} from "../screens/ExerciseConfigScreen/index.tsx";
import { ActiveSessionScreen } from "../screens/ActiveSessionScreen/index.tsx";
import { HomeScreen } from "../screens/HomeScreen/index.tsx";
import { ProgressScreen } from "../screens/ProgressScreen/index.tsx";
import { QuickAddScreen } from "../screens/QuickAddScreen/index.tsx";
import { StatsScreen } from "../screens/StatsScreen/index.tsx";
import {
  WorkoutScreen,
  type WorkoutPlanExercise,
  type WorkoutPlanToStart,
} from "../screens/WorkoutScreen/index.tsx";
import {
  createExercise,
  createPlanWithItems,
  deletePlan,
  getActiveSession,
  getPlan,
  getSession,
  listExercises,
  listPlanItems,
  listSessionExerciseSets,
  listSessionExercises,
  publishPlanForFriends,
  unpublishPlanForFriends,
  updatePlanWithItems,
} from "../services/firestoreService.ts";
import type { InterruptedSessionSummary } from "../screens/HomeScreen/types.ts";
import type {
  ActiveSessionCloseReason,
  ActiveSessionResumeState,
  RuntimeExercise,
} from "../screens/ActiveSessionScreen/types.ts";
import { usePwaInstallPrompt } from "../pwa/usePwaInstallPrompt.ts";
import type { Screen } from "./navigation.ts";
import { normalizeGymLabel } from "../screens/WorkoutScreen/utils.ts";

interface AppShellProps {
  user: User;
  authError: string | null;
  onSignOut: () => Promise<void>;
}

interface RenderScreenOptions {
  user: User;
  onSignOut: () => Promise<void>;
  onCreateSession: () => void;
  onStartPlan: (plan: WorkoutPlanToStart) => void;
  onResumeInterruptedSession: () => void;
  onEditPlan: (plan: WorkoutPlanToStart) => void;
  interruptedSession: InterruptedSessionSummary | null;
  isLoadingInterruptedSession: boolean;
  workoutRefreshKey: number;
}

interface InterruptedSessionRecord {
  plan: WorkoutPlanToStart;
  initialState: ActiveSessionResumeState;
  summary: InterruptedSessionSummary;
}

interface ActiveSessionLaunch {
  plan: WorkoutPlanToStart;
  initialState?: ActiveSessionResumeState | null;
}

function toMillis(value: unknown): number {
  if (
    value !== null
    && typeof value === "object"
    && "toMillis" in value
    && typeof (value as { toMillis?: unknown }).toMillis === "function"
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }

  return Date.now();
}

function toPlanExercise(exercise: RuntimeExercise): WorkoutPlanExercise {
  return {
    key: exercise.key,
    exerciseId: exercise.exerciseId,
    exerciseName: exercise.exerciseName,
    order: exercise.order,
    trackingMode: exercise.trackingMode,
    targetSets: exercise.targetSets,
    targetReps: exercise.targetReps,
    targetWeightKg: exercise.targetWeightKg,
    targetDurationSec: exercise.targetDurationSec,
    restSec: exercise.restSec,
    instructions: exercise.instructions ?? null,
    isMachine: exercise.isMachine ?? false,
    hasImage: exercise.hasImage ?? false,
    hasVideo: exercise.hasVideo ?? false,
    media: exercise.media ?? null,
    source: exercise.source ?? null,
    sourceUrl: exercise.sourceUrl ?? null,
    sourceId: exercise.sourceId ?? null,
    license: exercise.license ?? null,
  };
}

async function loadInterruptedSessionRecord(
  uid: string,
): Promise<InterruptedSessionRecord | null> {
  const activeSession = await getActiveSession(uid);
  if (!activeSession?.sessionId) {
    return null;
  }

  const session = await getSession(uid, activeSession.sessionId);
  if (!session || session.status !== "active") {
    return null;
  }

  const [sessionExercises, localExercises, planDoc] = await Promise.all([
    listSessionExercises(uid, session.id, 150),
    listExercises(uid, 500, true),
    session.planId ? getPlan(uid, session.planId) : Promise.resolve(null),
  ]);
  const planItems = session.planId && planDoc
    ? await listPlanItems(uid, session.planId, 150).catch(() => [])
    : [];
  const setsEntries = await Promise.all(
    sessionExercises.map(async (exercise) => ({
      sessionExerciseId: exercise.id,
      sets: await listSessionExerciseSets(uid, session.id, exercise.id, 200),
    })),
  );

  const exerciseById = new Map(localExercises.map((exercise) => [exercise.id, exercise]));
  const setsBySessionExerciseId = new Map(
    setsEntries.map((entry) => [entry.sessionExerciseId, entry.sets]),
  );
  const sortedSessionExercises = sessionExercises
    .slice()
    .sort((left, right) => left.order - right.order);
  const usedSessionExerciseIds = new Set<string>();

  const plannedExercises: RuntimeExercise[] = planItems
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((item, index) => {
      const linkedExercise = exerciseById.get(item.exerciseId);
      const matchedSessionExercise = sortedSessionExercises.find(
        (sessionExercise) =>
          !usedSessionExerciseIds.has(sessionExercise.id)
          && sessionExercise.exerciseId === item.exerciseId
          && sessionExercise.order === item.order,
      );

      if (matchedSessionExercise) {
        usedSessionExerciseIds.add(matchedSessionExercise.id);
      }

      const matchedSets = matchedSessionExercise
        ? setsBySessionExerciseId.get(matchedSessionExercise.id) ?? []
        : [];
      const isCurrentActive = matchedSessionExercise
        ? activeSession.activeExerciseId === matchedSessionExercise.id
        : false;
      const status: RuntimeExercise["status"] = matchedSessionExercise
        ? matchedSessionExercise.status === "completed"
          ? "completed"
          : isCurrentActive
            ? "in_progress"
            : "pending"
        : "pending";

      return {
        key: matchedSessionExercise
          ? `session-${matchedSessionExercise.id}`
          : `plan-${item.id}-${index}`,
        exerciseId: item.exerciseId,
        exerciseName: matchedSessionExercise?.exerciseNameSnapshot ?? linkedExercise?.name ?? "Exercice",
        order: item.order,
        trackingMode: matchedSessionExercise?.trackingMode ?? linkedExercise?.trackingMode ?? "reps_only",
        targetSets: Math.max(1, matchedSessionExercise?.targetSets ?? item.targetSets),
        targetReps: matchedSessionExercise?.targetReps ?? item.targetReps ?? null,
        targetWeightKg: matchedSessionExercise?.targetWeightKg ?? item.targetWeightKg ?? null,
        targetDurationSec: matchedSessionExercise?.targetDurationSec ?? item.targetDurationSec ?? null,
        restSec: Math.max(0, matchedSessionExercise?.restSec ?? item.restSec),
        instructions: linkedExercise?.instructions ?? null,
        isMachine: linkedExercise?.isMachine ?? false,
        hasImage: linkedExercise?.hasImage ?? false,
        hasVideo: linkedExercise?.hasVideo ?? false,
        media: linkedExercise?.media ?? null,
        source: linkedExercise?.source ?? null,
        sourceUrl: linkedExercise?.sourceUrl ?? null,
        sourceId: linkedExercise?.sourceId ?? null,
        license: linkedExercise?.license ?? null,
        status,
        sessionExerciseId: matchedSessionExercise?.id ?? null,
        startedAtMs:
          status === "in_progress" && matchedSessionExercise
            ? toMillis(matchedSessionExercise.startedAt)
            : null,
        loggedSets: matchedSets
          .slice()
          .sort((left, right) => left.setNumber - right.setNumber)
          .map((setEntry) => ({
            setNumber: setEntry.setNumber,
            reps: setEntry.reps ?? null,
            weightKg: setEntry.weightKg ?? null,
            durationSec: setEntry.durationSec ?? null,
          })),
      };
    });

  const extraExercises: RuntimeExercise[] = sortedSessionExercises
    .filter((exercise) => !usedSessionExerciseIds.has(exercise.id))
    .map((exercise) => {
      const linkedExercise = exerciseById.get(exercise.exerciseId);
      const loggedSets = (setsBySessionExerciseId.get(exercise.id) ?? [])
        .slice()
        .sort((left, right) => left.setNumber - right.setNumber)
        .map((setEntry) => ({
          setNumber: setEntry.setNumber,
          reps: setEntry.reps ?? null,
          weightKg: setEntry.weightKg ?? null,
          durationSec: setEntry.durationSec ?? null,
        }));
      const isCurrentActive = activeSession.activeExerciseId === exercise.id;
      const status: RuntimeExercise["status"] =
        exercise.status === "completed"
          ? "completed"
          : isCurrentActive
            ? "in_progress"
            : "pending";

      return {
        key: `session-${exercise.id}`,
        exerciseId: exercise.exerciseId,
        exerciseName: exercise.exerciseNameSnapshot,
        order: exercise.order,
        trackingMode: exercise.trackingMode,
        targetSets: Math.max(1, exercise.targetSets),
        targetReps: exercise.targetReps ?? null,
        targetWeightKg: exercise.targetWeightKg ?? null,
        targetDurationSec: exercise.targetDurationSec ?? null,
        restSec: Math.max(0, exercise.restSec),
        instructions: linkedExercise?.instructions ?? null,
        isMachine: linkedExercise?.isMachine ?? false,
        hasImage: linkedExercise?.hasImage ?? false,
        hasVideo: linkedExercise?.hasVideo ?? false,
        media: linkedExercise?.media ?? null,
        source: linkedExercise?.source ?? null,
        sourceUrl: linkedExercise?.sourceUrl ?? null,
        sourceId: linkedExercise?.sourceId ?? null,
        license: linkedExercise?.license ?? null,
        status,
        sessionExerciseId: exercise.id,
        startedAtMs: status === "in_progress" ? toMillis(exercise.startedAt) : null,
        loggedSets,
      };
    });

  const exercises = [...plannedExercises, ...extraExercises]
    .slice()
    .sort((left, right) => left.order - right.order);
  const activeExercise =
    exercises.find((exercise) => exercise.sessionExerciseId === activeSession.activeExerciseId)
    ?? null;
  const plan: WorkoutPlanToStart = {
    id: planDoc?.id ?? session.planId ?? session.id,
    name: planDoc?.name ?? "Seance interrompue",
    gymName: normalizeGymLabel(planDoc?.gymName ?? session.gymName),
    estimatedDurationMin: session.estimatedDurationMin ?? null,
    estimatedCaloriesKcal: session.estimatedCaloriesKcal ?? null,
    estimationSource: session.estimationSource ?? null,
    exercises: exercises.map(toPlanExercise),
  };

  return {
    plan,
    initialState: {
      sessionId: session.id,
      activeExerciseKey: activeExercise?.key ?? null,
      restEndsAtMs: activeSession.restEndsAt ? toMillis(activeSession.restEndsAt) : null,
      exercises,
    },
    summary: {
      name: plan.name,
      gymName: plan.gymName,
      startedAtMs: toMillis(session.startedAt),
      completedCount: exercises.filter((exercise) => exercise.status === "completed").length,
      totalCount: exercises.length,
      activeExerciseName: activeExercise?.exerciseName ?? null,
    },
  };
}

function renderScreen(screen: Screen, options: RenderScreenOptions) {
  const {
    user,
    onSignOut,
    onCreateSession,
    onStartPlan,
    onResumeInterruptedSession,
    onEditPlan,
    interruptedSession,
    isLoadingInterruptedSession,
    workoutRefreshKey,
  } =
    options;

  if (screen === "home") {
    return (
      <HomeScreen
        userId={user.uid}
        displayName={user.displayName ?? "Membre TrackFit"}
        photoURL={user.photoURL}
        interruptedSession={interruptedSession}
        isLoadingInterruptedSession={isLoadingInterruptedSession}
        onCreateSession={onCreateSession}
        onStartPlan={onStartPlan}
        onResumeInterruptedSession={onResumeInterruptedSession}
        refreshKey={workoutRefreshKey}
      />
    );
  }

  if (screen === "workout") {
    return (
      <WorkoutScreen
        userId={user.uid}
        onCreateSession={onCreateSession}
        onStartPlan={onStartPlan}
        onEditPlan={onEditPlan}
        refreshKey={workoutRefreshKey}
      />
    );
  }

  if (screen === "stats") {
    return <StatsScreen userId={user.uid} />;
  }

  return (
    <ProgressScreen
      userId={user.uid}
      displayName={user.displayName ?? ""}
      email={user.email ?? ""}
      photoURL={user.photoURL}
      onSignOut={onSignOut}
    />
  );
}

export function AppShell({ user, authError, onSignOut }: AppShellProps) {
  const [currentScreen, setCurrentScreen] = useState<Screen>("home");
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isInstallBannerDismissed, setIsInstallBannerDismissed] = useState(false);
  const [isInstallPromptPending, setIsInstallPromptPending] = useState(false);
  const [isExerciseConfigOpen, setIsExerciseConfigOpen] = useState(false);
  const [isCreatingExercise, setIsCreatingExercise] = useState(false);
  const [exerciseCreateError, setExerciseCreateError] = useState<string | null>(
    null,
  );
  const [isSessionConfigOpen, setIsSessionConfigOpen] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isDeletingSession, setIsDeletingSession] = useState(false);
  const [workoutRefreshKey, setWorkoutRefreshKey] = useState(0);
  const [sessionCreateError, setSessionCreateError] = useState<string | null>(
    null,
  );
  const [activePlan, setActivePlan] = useState<ActiveSessionLaunch | null>(null);
  const [interruptedSession, setInterruptedSession] = useState<InterruptedSessionRecord | null>(
    null,
  );
  const [isLoadingInterruptedSession, setIsLoadingInterruptedSession] = useState(true);
  const [editingPlan, setEditingPlan] = useState<WorkoutPlanToStart | null>(null);
  const { canInstall, isInstalled, showIosInstallHint, promptInstall } = usePwaInstallPrompt();

  const refreshInterruptedSession = useCallback(async () => {
    setIsLoadingInterruptedSession(true);

    try {
      const session = await loadInterruptedSessionRecord(user.uid);
      setInterruptedSession(session);
    } catch {
      setInterruptedSession(null);
    } finally {
      setIsLoadingInterruptedSession(false);
    }
  }, [user.uid]);

  useEffect(() => {
    void refreshInterruptedSession();
  }, [refreshInterruptedSession]);

  const handleCreateExercise = () => {
    setExerciseCreateError(null);
    setIsQuickAddOpen(false);
    setIsExerciseConfigOpen(true);
  };

  const handleBackFromExerciseConfig = () => {
    setExerciseCreateError(null);
    setIsExerciseConfigOpen(false);
    setIsQuickAddOpen(true);
  };

  const handleConfirmExerciseConfig = async (
    config: ExerciseConfig,
  ): Promise<void> => {
    if (isCreatingExercise) {
      return;
    }

    setExerciseCreateError(null);
    setIsCreatingExercise(true);

    try {
      await createExercise(user.uid, {
        name: config.name,
        category: "personnalise",
        trackingMode: config.trackingMode,
        defaultSets: config.sets,
        defaultReps: config.reps,
        defaultWeightKg: config.weightKg,
        defaultDurationSec: config.durationSec,
        defaultRestSec: config.restSec,
      });

      setCurrentScreen("workout");
      setIsExerciseConfigOpen(false);
      setIsQuickAddOpen(false);
      setWorkoutRefreshKey((value) => value + 1);
    } catch {
      setExerciseCreateError(
        "Impossible de creer l exercice pour le moment. Reessaie dans un instant.",
      );
    } finally {
      setIsCreatingExercise(false);
    }
  };

  const handleCreateSession = () => {
    setIsQuickAddOpen(false);
    setSessionCreateError(null);
    setEditingPlan(null);
    setIsSessionConfigOpen(true);
  };

  const handleBackFromSessionConfig = () => {
    const wasEditing = Boolean(editingPlan);
    setSessionCreateError(null);
    setEditingPlan(null);
    setIsSessionConfigOpen(false);
    if (!wasEditing) {
      setIsQuickAddOpen(true);
    } else {
      setIsQuickAddOpen(false);
    }
  };

  const handleSaveSessionConfig = async (
    config: SessionConfig,
  ): Promise<void> => {
    if (isCreatingSession) {
      return;
    }

    setSessionCreateError(null);
    setIsCreatingSession(true);

    try {
      const planPayload = {
        name: config.name,
        gymName: config.gymName,
        estimatedDurationMin: config.estimatedDurationMin,
        estimatedCaloriesKcal: config.estimatedCaloriesKcal,
        estimationSource: config.estimationSource,
        items: config.exercises.map((exercise, index) => ({
          order: index + 1,
          exerciseId: exercise.id,
          targetSets: exercise.defaultSets,
          targetReps: exercise.defaultReps,
          targetWeightKg: exercise.defaultWeightKg,
          targetDurationSec: exercise.defaultDurationSec,
          restSec: exercise.defaultRestSec,
        })),
      };

      if (editingPlan) {
        await updatePlanWithItems(user.uid, editingPlan.id, planPayload);
        if (config.isPublic && !editingPlan.isSharedWithFriends) {
          await publishPlanForFriends(user.uid, editingPlan.id);
        }
        if (!config.isPublic && editingPlan.isSharedWithFriends) {
          await unpublishPlanForFriends(user.uid, editingPlan.id);
        }
      } else {
        const createdPlanId = await createPlanWithItems(user.uid, planPayload);
        if (config.isPublic) {
          await publishPlanForFriends(user.uid, createdPlanId);
        }
      }

      setCurrentScreen("workout");
      setIsSessionConfigOpen(false);
      setIsQuickAddOpen(false);
      setEditingPlan(null);
      setWorkoutRefreshKey((value) => value + 1);
    } catch {
      setSessionCreateError(
        editingPlan
          ? "Impossible de mettre a jour la seance pour le moment. Reessaie dans un instant."
          : "Impossible d enregistrer la seance pour le moment. Reessaie dans un instant.",
      );
    } finally {
      setIsCreatingSession(false);
    }
  };

  const handleDeleteSessionConfig = async (): Promise<void> => {
    if (!editingPlan || isDeletingSession) {
      return;
    }

    setSessionCreateError(null);
    setIsDeletingSession(true);

    try {
      await deletePlan(user.uid, editingPlan.id);
      setIsSessionConfigOpen(false);
      setIsQuickAddOpen(false);
      setEditingPlan(null);
      setWorkoutRefreshKey((value) => value + 1);
    } catch {
      setSessionCreateError(
        "Impossible de supprimer la seance pour le moment. Reessaie dans un instant.",
      );
    } finally {
      setIsDeletingSession(false);
    }
  };

  const handleEditPlan = (plan: WorkoutPlanToStart) => {
    setIsQuickAddOpen(false);
    setSessionCreateError(null);
    setEditingPlan(plan);
    setIsSessionConfigOpen(true);
  };

  const handleStartPlan = (plan: WorkoutPlanToStart) => {
    if (isLoadingInterruptedSession) {
      return;
    }

    if (interruptedSession) {
      window.alert(
        "Une seance est deja en cours. Reprends-la ou annule-la avant d en demarrer une autre.",
      );
      setCurrentScreen("home");
      return;
    }

    setIsQuickAddOpen(false);
    setIsSessionConfigOpen(false);
    setSessionCreateError(null);
    setActivePlan({
      plan,
      initialState: null,
    });
  };

  const handleResumeInterruptedSession = () => {
    if (!interruptedSession) {
      return;
    }

    setActivePlan({
      plan: interruptedSession.plan,
      initialState: interruptedSession.initialState,
    });
  };

  const handleCloseActivePlan = (reason?: ActiveSessionCloseReason) => {
    setActivePlan(null);

    if (reason === "suspended") {
      setCurrentScreen("home");
    }

    void refreshInterruptedSession();
  };

  const handleSessionPersisted = () => {
    setWorkoutRefreshKey((value) => value + 1);
  };

  const handleInstallApp = async () => {
    if (isInstallPromptPending) {
      return;
    }

    setIsInstallPromptPending(true);

    try {
      const didInstall = await promptInstall();
      if (didInstall) {
        setIsInstallBannerDismissed(true);
      }
    } finally {
      setIsInstallPromptPending(false);
    }
  };

  const shouldShowInstallBanner =
    !isInstalled
    && !isInstallBannerDismissed
    && !isQuickAddOpen
    && !isExerciseConfigOpen
    && !isSessionConfigOpen
    && activePlan === null
    && (canInstall || showIosInstallHint);

  return (
    <div className="min-h-screen bg-background-dark text-text-primary font-display">
      {renderScreen(currentScreen, {
        user,
        onSignOut,
        onCreateSession: handleCreateSession,
        onStartPlan: handleStartPlan,
        onResumeInterruptedSession: handleResumeInterruptedSession,
        onEditPlan: handleEditPlan,
        interruptedSession: interruptedSession?.summary ?? null,
        isLoadingInterruptedSession,
        workoutRefreshKey,
      })}

      <BottomNav
        currentScreen={currentScreen}
        setCurrentScreen={setCurrentScreen}
        onQuickAdd={() => setIsQuickAddOpen(true)}
      />

      {shouldShowInstallBanner ? (
        <PwaInstallBanner
          mode={canInstall ? "prompt" : "ios_hint"}
          isInstalling={isInstallPromptPending}
          onInstall={() => {
            void handleInstallApp();
          }}
          onDismiss={() => {
            setIsInstallBannerDismissed(true);
          }}
        />
      ) : null}

      {isQuickAddOpen ? (
        <QuickAddScreen
          onClose={() => setIsQuickAddOpen(false)}
          onCreateExercise={handleCreateExercise}
          onCreateSession={handleCreateSession}
        />
      ) : null}

      {isExerciseConfigOpen ? (
        <ExerciseConfigScreen
          onBack={handleBackFromExerciseConfig}
          onCreate={handleConfirmExerciseConfig}
          isSubmitting={isCreatingExercise}
          errorMessage={exerciseCreateError}
        />
      ) : null}

      {isSessionConfigOpen ? (
        <CreateSessionScreen
          userId={user.uid}
          onBack={handleBackFromSessionConfig}
          onSave={handleSaveSessionConfig}
          onDelete={editingPlan ? handleDeleteSessionConfig : undefined}
          mode={editingPlan ? "edit" : "create"}
          initialConfig={
            editingPlan
              ? {
                  name: editingPlan.name,
                  gymName: editingPlan.gymName,
                  isPublic: Boolean(editingPlan.isSharedWithFriends),
                  estimatedDurationMin: editingPlan.estimatedDurationMin,
                  estimatedCaloriesKcal: editingPlan.estimatedCaloriesKcal,
                  estimationSource: editingPlan.estimationSource,
                  exercises: editingPlan.exercises
                    .slice()
                    .sort((a, b) => a.order - b.order)
                    .map((exercise) => ({
                      id: exercise.exerciseId,
                      name: exercise.exerciseName,
                      trackingMode: exercise.trackingMode,
                      defaultSets: exercise.targetSets,
                      defaultReps: exercise.targetReps,
                      defaultWeightKg: exercise.targetWeightKg,
                      defaultDurationSec: exercise.targetDurationSec,
                      defaultRestSec: exercise.restSec,
                      instructions: exercise.instructions ?? null,
                      isMachine: exercise.isMachine ?? false,
                      hasImage: exercise.hasImage ?? false,
                      hasVideo: exercise.hasVideo ?? false,
                      media: exercise.media ?? null,
                      source: exercise.source ?? null,
                      sourceUrl: exercise.sourceUrl ?? null,
                      sourceId: exercise.sourceId ?? null,
                      license: exercise.license ?? null,
                    })),
                }
              : null
          }
          isSubmitting={isCreatingSession}
          isDeleting={isDeletingSession}
          errorMessage={sessionCreateError}
        />
      ) : null}

      {activePlan ? (
        <ActiveSessionScreen
          userId={user.uid}
          plan={activePlan.plan}
          initialState={activePlan.initialState}
          onClose={handleCloseActivePlan}
          onSessionPersisted={handleSessionPersisted}
        />
      ) : null}

      {authError ? (
        <p
          className={`fixed left-1/2 z-[70] w-[min(92vw,420px)] -translate-x-1/2 rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-2 text-center text-xs font-medium text-rose-200 ${
            shouldShowInstallBanner ? "bottom-48" : "bottom-24"
          }`}
        >
          {authError}
        </p>
      ) : null}
    </div>
  );
}
