import type { TrackingMode } from "../../types/firestore.ts";

export type EffortType = "reps" | "duration";

export interface FooterItem {
  icon: string;
  label: string;
  isActive?: boolean;
}

export interface EffortPickerConfig {
  title: string;
  subtitle: string;
  unitLabel: string;
  value: number;
  min: number;
  max: number;
  step: number;
  presets: number[];
}

export interface ExerciseConfig {
  name: string;
  sets: number;
  trackingMode: TrackingMode;
  reps: number | null;
  durationSec: number | null;
  weightKg: number | null;
  restSec: number;
}

export interface ExerciseConfigScreenProps {
  onBack: () => void;
  onCreate: (config: ExerciseConfig) => Promise<void> | void;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  zIndexClass?: string;
}
