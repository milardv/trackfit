import type { TrackingMode } from "../../types/firestore.ts";
import type { SessionExerciseSelection } from "./types.ts";

export function getTrackingLabel(mode: TrackingMode): string {
  if (mode === "duration_only") {
    return "Duree";
  }
  if (mode === "reps_only") {
    return "Repetitions";
  }
  return "Force";
}

export function getExerciseTarget(exercise: SessionExerciseSelection): string {
  if (exercise.trackingMode === "duration_only") {
    return `${exercise.defaultDurationSec ?? 30} sec`;
  }

  if (exercise.defaultReps !== null) {
    return `${exercise.defaultReps} reps`;
  }

  return "Objectif libre";
}
