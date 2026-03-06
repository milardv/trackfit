import type {
  PeriodOption,
  ProgressPhotoEntry,
  WeightChartGeometry,
  WeightChartPoint,
  WeightSummary,
} from "../types.ts";

export interface ProfileIdentityCardProps {
  displayName: string;
  email: string;
  photoURL: string;
  completedSessions: number;
  thisMonthSessions: number;
  onSignOut: () => void;
  isSigningOut: boolean;
}

export interface BodyCompositionCardsProps {
  summary: WeightSummary;
}

export interface WeightHistorySectionProps {
  period: PeriodOption;
  onPeriodChange: (period: PeriodOption) => void;
  points: WeightChartPoint[];
  geometry: WeightChartGeometry | null;
  currentWeightKg: number | null;
  deltaWeightKg: number | null;
}

export interface ProgressPhotosSectionProps {
  photos: ProgressPhotoEntry[];
  currentWeightKg: number | null;
  isUploadingPhoto: boolean;
  deletingPhotoId: string | null;
  uploadError: string | null;
  uploadSuccess: string | null;
  onImportPhoto: () => void;
  onTakePhoto: () => void;
  onOpenGallery: () => void;
  onDeletePhoto: (photoId: string) => void;
}
