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

export interface FriendsSectionProps {
  userId: string;
}

export interface FriendRequestEntry {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  note: string;
}

export interface FriendSuggestionEntry {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  goalLabel: string;
}

export interface FriendActivityEntry {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  presenceLabel: string;
  activityLabel: string;
  activityValue: string;
  isOnline: boolean;
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
  photoPrivacyEnabled: boolean;
  isPhotoPrivacyUnlocked: boolean;
  isPhotoPrivacySupported: boolean;
  isPhotoPrivacyBusy: boolean;
  privacyError: string | null;
  privacySuccess: string | null;
  isUploadingPhoto: boolean;
  deletingPhotoId: string | null;
  uploadError: string | null;
  uploadSuccess: string | null;
  onEnableProtection: () => void;
  onUnlockPhotos: () => void;
  onLockPhotos: () => void;
  onDisableProtection: () => void;
  onImportPhoto: () => void;
  onTakePhoto: () => void;
  onOpenGallery: () => void;
  onDeletePhoto: (photoId: string) => void;
}
