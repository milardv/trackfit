import type { EffortPickerConfig, FooterItem } from "../types.ts";

export interface ExerciseConfigFooterNavProps {
  items: FooterItem[];
}

export interface EffortPickerModalProps {
  pickerConfig: EffortPickerConfig | null;
  onClose: () => void;
  onUpdateValue: (value: number) => void;
}
