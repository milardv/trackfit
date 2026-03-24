import type { ExerciseEditDraft, RuntimeExercise, SessionView } from "../types.ts";

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
  onEditExercise: (exerciseKey: string) => void;
  onAddExercise: () => void;
  onCancelSession: () => void;
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
  durationCountdownRemainingSec: number | null;
  activeSetTarget: number;
  currentSetNumber: number;
  progressPercent: number;
  isActiveExerciseReadyToComplete: boolean;
  isBusy: boolean;
  restRemainingSec: number;
  onEditExercise: () => void;
  onCompleteExercise: () => void;
  onLogSet: () => void;
  onSkipRest: () => void;
}

export interface SessionDoneViewProps {
  completedCount: number;
  onClose: () => void;
}

export interface ExerciseEditModalProps {
  draft: ExerciseEditDraft;
  isSaving: boolean;
  isRemoving?: boolean;
  errorMessage: string | null;
  canRemove?: boolean;
  onChange: (patch: Partial<ExerciseEditDraft>) => void;
  onClose: () => void;
  onSave: () => void;
  onRemove?: () => void;
}
