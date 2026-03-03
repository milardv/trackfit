import { useState } from "react";
import type { User } from "firebase/auth";
import { BottomNav } from "../components/BottomNav.tsx";
import {
  CreateSessionScreen,
  type SessionConfig,
} from "../components/CreateSessionScreen.tsx";
import {
  ExerciseConfigScreen,
  type ExerciseConfig,
} from "../components/ExerciseConfigScreen.tsx";
import { HomeScreen } from "../components/HomeScreen.tsx";
import { ProgressScreen } from "../components/ProgressScreen.tsx";
import { QuickAddScreen } from "../components/QuickAddScreen.tsx";
import { StatsScreen } from "../components/StatsScreen.tsx";
import { WorkoutScreen } from "../components/WorkoutScreen.tsx";
import {
  createExercise,
  createPlanWithItems,
} from "../services/firestoreService.ts";
import type { Screen } from "./navigation.ts";

interface AppShellProps {
  user: User;
  authError: string | null;
  onSignOut: () => Promise<void>;
}

function renderScreen(screen: Screen, user: User) {
  if (screen === "home") {
    return (
      <HomeScreen
        displayName={user.displayName ?? "Membre TrackFit"}
        photoURL={user.photoURL}
      />
    );
  }

  if (screen === "workout") {
    return <WorkoutScreen />;
  }

  if (screen === "stats") {
    return <StatsScreen />;
  }

  return <ProgressScreen />;
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
  const [sessionCreateError, setSessionCreateError] = useState<string | null>(
    null,
  );

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
        trackingMode: "duration_only",
        defaultSets: config.sets,
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
    setIsSessionConfigOpen(true);
  };

  const handleBackFromSessionConfig = () => {
    setSessionCreateError(null);
    setIsSessionConfigOpen(false);
    setIsQuickAddOpen(true);
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
      await createPlanWithItems(user.uid, {
        name: config.name,
        gymName: config.gymName,
        items: config.exercises.map((exercise, index) => ({
          order: index + 1,
          exerciseId: exercise.id,
          targetSets: exercise.defaultSets,
          targetReps: exercise.defaultReps,
          targetWeightKg: exercise.defaultWeightKg,
          targetDurationSec: exercise.defaultDurationSec,
          restSec: exercise.defaultRestSec,
        })),
      });

      setCurrentScreen("workout");
      setIsSessionConfigOpen(false);
      setIsQuickAddOpen(false);
    } catch {
      setSessionCreateError(
        "Impossible d enregistrer la seance pour le moment. Reessaie dans un instant.",
      );
    } finally {
      setIsCreatingSession(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-dark text-text-primary font-display">
      {currentScreen === "progress" ? (
        <button
          type="button"
          onClick={() => {
            void onSignOut();
          }}
          className="fixed right-4 top-4 z-[70] flex items-center gap-2 rounded-full border border-white/10 bg-card-dark/90 px-3 py-2 text-xs font-semibold text-text-primary backdrop-blur-md hover:border-primary/40 hover:text-primary"
        >
          <span className="material-symbols-outlined text-base">logout</span>
          Deconnexion
        </button>
      ) : null}

      {renderScreen(currentScreen, user)}

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
          isSubmitting={isCreatingSession}
          errorMessage={sessionCreateError}
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
