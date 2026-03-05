import { useState } from "react";
import type { User } from "firebase/auth";
import { BottomNav } from "../components/BottomNav.tsx";
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
  type WorkoutPlanToStart,
} from "../screens/WorkoutScreen/index.tsx";
import {
  createExercise,
  createPlanWithItems,
  deletePlan,
  updatePlanWithItems,
} from "../services/firestoreService.ts";
import type { Screen } from "./navigation.ts";

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
  onEditPlan: (plan: WorkoutPlanToStart) => void;
  workoutRefreshKey: number;
}

function renderScreen(screen: Screen, options: RenderScreenOptions) {
  const {
    user,
    onSignOut,
    onCreateSession,
    onStartPlan,
    onEditPlan,
    workoutRefreshKey,
  } =
    options;

  if (screen === "home") {
    return (
      <HomeScreen
        userId={user.uid}
        displayName={user.displayName ?? "Membre TrackFit"}
        photoURL={user.photoURL}
        onCreateSession={onCreateSession}
        onStartPlan={onStartPlan}
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
  const [activePlan, setActivePlan] = useState<WorkoutPlanToStart | null>(null);
  const [editingPlan, setEditingPlan] = useState<WorkoutPlanToStart | null>(null);

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
      } else {
        await createPlanWithItems(user.uid, planPayload);
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
    setIsQuickAddOpen(false);
    setIsSessionConfigOpen(false);
    setSessionCreateError(null);
    setCurrentScreen("workout");
    setActivePlan(plan);
  };

  const handleCloseActivePlan = () => {
    setActivePlan(null);
    setCurrentScreen("workout");
  };

  const handleSessionPersisted = () => {
    setWorkoutRefreshKey((value) => value + 1);
  };

  return (
    <div className="min-h-screen bg-background-dark text-text-primary font-display">
      {renderScreen(currentScreen, {
        user,
        onSignOut,
        onCreateSession: handleCreateSession,
        onStartPlan: handleStartPlan,
        onEditPlan: handleEditPlan,
        workoutRefreshKey,
      })}

      <BottomNav
        currentScreen={currentScreen}
        setCurrentScreen={setCurrentScreen}
        onQuickAdd={() => setIsQuickAddOpen(true)}
      />

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
          plan={activePlan}
          onClose={handleCloseActivePlan}
          onSessionPersisted={handleSessionPersisted}
        />
      ) : null}

      {authError ? (
        <p className="fixed bottom-24 left-1/2 z-[70] w-[min(92vw,420px)] -translate-x-1/2 rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-2 text-center text-xs font-medium text-rose-200">
          {authError}
        </p>
      ) : null}
    </div>
  );
}
