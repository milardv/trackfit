import type { WorkoutPlanExercise, WorkoutPlanToStart } from "../WorkoutScreen/types.ts";

export type ExerciseStatus = "pending" | "in_progress" | "completed";
export type SessionView = "exercise_list" | "exercise_active" | "session_done";

export interface ActiveSessionScreenProps {
  userId: string;
  plan: WorkoutPlanToStart;
  onClose: () => void;
  onSessionPersisted?: () => void;
}

export interface LoggedSet {
  setNumber: number;
  reps: number | null;
  weightKg: number | null;
  durationSec: number | null;
}

export interface RuntimeExercise extends WorkoutPlanExercise {
  status: ExerciseStatus;
  sessionExerciseId: string | null;
  startedAtMs: number | null;
  loggedSets: LoggedSet[];
}
