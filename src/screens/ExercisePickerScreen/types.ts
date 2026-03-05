import type { ExerciseDoc } from "../../types/firestore.ts";

export type ExercisePickerOption = ExerciseDoc & { id: string };

export interface ExercisePickerScreenProps {
  exercises: ExercisePickerOption[];
  selectedExerciseIds: string[];
  searchQuery: string;
  isLoading: boolean;
  onSearchChange: (value: string) => void;
  onClose: () => void;
  onAddExercise: (exerciseId: string) => void;
  onCreateExercise: () => void;
}
