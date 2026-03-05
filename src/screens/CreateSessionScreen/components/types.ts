import type { SessionExerciseSelection } from "../types.ts";

export interface SessionMetaFormProps {
  name: string;
  gymName: string;
  onNameChange: (value: string) => void;
  onGymNameChange: (value: string) => void;
}

export interface SelectedExerciseListProps {
  selectedExercises: SessionExerciseSelection[];
  isLoadingExercises: boolean;
  onOpenExercisePicker: () => void;
  onMoveExercise: (index: number, direction: -1 | 1) => void;
  onRemoveExercise: (exerciseId: string) => void;
}

export interface SessionFooterProps {
  displayedError: string | null;
  isBusy: boolean;
  isSubmitting: boolean;
  isEditMode: boolean;
  isDeleting: boolean;
  canDelete: boolean;
  onSave: () => void;
  onDelete: () => void;
}
