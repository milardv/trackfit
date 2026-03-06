import type { RuntimeExercise, SessionView } from "../types.ts";

export interface ActiveSessionHeaderProps {
  view: SessionView;
  planName: string;
  activeExerciseName: string | null;
  onBack: () => void;
  onClose: () => void;
}

export interface ExerciseListViewProps {
  gymName: string;
  completedCount: number;
  totalCount: number;
  exercises: RuntimeExercise[];
  isBusy: boolean;
  isAddExerciseDisabled: boolean;
  allExercisesCompleted: boolean;
  isSessionCompleted: boolean;
  isFinalizingSession: boolean;
  onStartExercise: (exerciseKey: string) => void;
  onAddExercise: () => void;
  onFinalizeSession: () => void;
  onOpenSummary: () => void;
}

export interface ExerciseActiveViewProps {
  activeExercise: RuntimeExercise;
  elapsedClock: {
    hours: string;
    minutes: string;
    seconds: string;
  };
  activeSetTarget: number;
  currentSetNumber: number;
  progressPercent: number;
  isActiveExerciseReadyToComplete: boolean;
  isBusy: boolean;
  restRemainingSec: number;
  onCompleteExercise: () => void;
  onLogSet: () => void;
  onSkipRest: () => void;
}

export interface SessionDoneViewProps {
  completedCount: number;
  onClose: () => void;
}
