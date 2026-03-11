import type { ExerciseDoc, SharedExerciseDoc } from "../../types/firestore.ts";

export type ExercisePickerOption = ExerciseDoc & { id: string };
export type SharedExercisePickerOption = SharedExerciseDoc & { id: string };

export interface ExercisePickerScreenProps {
  userExercises: ExercisePickerOption[];
  sharedExercises: SharedExercisePickerOption[];
  selectedExerciseIds: string[];
  searchQuery: string;
  isLoadingUserExercises: boolean;
  isLoadingSharedExercises: boolean;
  importingSharedExerciseId: string | null;
  onSearchChange: (value: string) => void;
  onClose: () => void;
  onAddExercise: (exerciseId: string) => void;
  onAddSharedExercise: (sharedExerciseId: string) => Promise<void> | void;
  onCreateExercise: () => void;
}
