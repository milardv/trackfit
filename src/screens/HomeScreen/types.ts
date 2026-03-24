import type { WorkoutPlanToStart } from "../WorkoutScreen/types.ts";

export interface InterruptedSessionSummary {
  name: string;
  gymName: string;
  startedAtMs: number;
  completedCount: number;
  totalCount: number;
  activeExerciseName: string | null;
}

export interface HomeScreenProps {
  userId: string;
  displayName: string;
  photoURL: string | null;
  interruptedSession: InterruptedSessionSummary | null;
  isLoadingInterruptedSession?: boolean;
  onCreateSession: () => void;
  onStartPlan: (plan: WorkoutPlanToStart) => void;
  onResumeInterruptedSession: () => void;
  refreshKey?: number;
}
