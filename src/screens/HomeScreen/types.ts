import type { WorkoutPlanToStart } from "../WorkoutScreen/types.ts";

export interface HomeScreenProps {
  userId: string;
  displayName: string;
  photoURL: string | null;
  onCreateSession: () => void;
  onStartPlan: (plan: WorkoutPlanToStart) => void;
}
