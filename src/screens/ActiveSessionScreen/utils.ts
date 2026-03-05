import type { WorkoutPlanExercise } from "../WorkoutScreen/types.ts";
import type { LoggedSet } from "./types.ts";

export function toClockParts(totalMs: number): {
  hours: string;
  minutes: string;
  seconds: string;
} {
  const totalSeconds = Math.max(0, Math.floor(totalMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    hours: String(hours).padStart(2, "0"),
    minutes: String(minutes).padStart(2, "0"),
    seconds: String(seconds).padStart(2, "0"),
  };
}

export function getExerciseTargetLabel(exercise: WorkoutPlanExercise): string {
  if (exercise.trackingMode === "duration_only") {
    return `${exercise.targetSets} series x ${exercise.targetDurationSec ?? 40} sec`;
  }

  const repsLabel = `${exercise.targetSets} series x ${exercise.targetReps ?? 10} reps`;
  if (
    exercise.trackingMode === "weight_reps" &&
    (exercise.targetWeightKg ?? 0) > 0
  ) {
    return `${exercise.targetWeightKg} kg - ${repsLabel}`;
  }
  return repsLabel;
}

export function getSetLogLabel(set: LoggedSet): string {
  if (set.durationSec !== null) {
    return `${set.durationSec} sec`;
  }
  if (set.reps !== null && set.weightKg !== null) {
    return `${set.reps} reps @ ${set.weightKg} kg`;
  }
  if (set.reps !== null) {
    return `${set.reps} reps`;
  }
  return "Set valide";
}
