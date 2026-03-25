import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Timestamp } from "firebase/firestore";
import { getDownloadURL, ref as storageRef } from "firebase/storage";
import { storage } from "../../firebase.ts";
import {
  addProgressPhoto,
  disablePhotoPrivacy,
  deleteProgressPhoto,
  getPhotoPrivacySettings,
  listBodyMetrics,
  listProgressPhotos,
  listSessions,
  setPhotoPrivacyPin,
} from "../../services/firestoreService.ts";
import {
  buildBlurredCloudinaryPreviewUrl,
  generateFadeVideoFromCloudinaryPhotos,
  uploadToCloudinary,
} from "../../services/imageUploadService.ts";
import {
  createPhotoPrivacyPin,
  isValidPhotoPrivacyPin,
  verifyPhotoPrivacyPin,
} from "../../services/photoPrivacyPin.ts";
import type {
  BodyMetricEntry,
  PeriodOption,
  ProgressPhotoEntry,
  ProgressScreenProps,
  SessionEntry,
} from "./types.ts";
import {
  buildWeightChartGeometry,
  buildWeightChartPoints,
  computeSessionSummary,
  computeWeightSummary,
  resolveProgressPhotoMediaType,
  toMillis,
} from "./utils.ts";
import { BodyCompositionCards } from "./components/BodyCompositionCards.tsx";
import { FriendsSection } from "./components/FriendsSection.tsx";
import { PhotoGalleryScreen } from "./components/PhotoGalleryScreen.tsx";
import { PhotoPrivacyPinModal } from "./components/PhotoPrivacyPinModal.tsx";
import { ProfileIdentityCard } from "./components/ProfileIdentityCard.tsx";
import { ProgressPhotosSection } from "./components/ProgressPhotosSection.tsx";
import { WeightHistorySection } from "./components/WeightHistorySection.tsx";
import type { PhotoPrivacyPinModalMode } from "./components/types.ts";

async function resolveStorageLikeUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) {
    return null;
  }

  if (path.startsWith("https://") || path.startsWith("http://")) {
    return path;
  }

  try {
    return await getDownloadURL(storageRef(storage, path));
  } catch {
    return null;
  }
}

async function resolveProgressPhotoPreviewUrl(photo: {
  storagePath: string;
  thumbnailPath: string | null;
}): Promise<string | null> {
  return resolveStorageLikeUrl(photo.thumbnailPath ?? photo.storagePath);
}

function resolveLockedProgressPhotoPreviewUrl(photo: {
  storagePath: string;
  thumbnailPath: string | null;
}): string | null {
  return buildBlurredCloudinaryPreviewUrl(photo.thumbnailPath ?? photo.storagePath);
}

async function hydrateProgressPhotoEntries<T extends {
  storagePath: string;
  thumbnailPath: string | null;
}>(entries: T[]): Promise<Array<T & Pick<ProgressPhotoEntry, "previewUrl" | "mediaUrl">>> {
  return Promise.all(
    entries.map(async (photo) => ({
      ...photo,
      previewUrl: await resolveProgressPhotoPreviewUrl(photo),
      mediaUrl: await resolveStorageLikeUrl(photo.storagePath),
    })),
  );
}

function getDefaultProfilePhoto(displayName: string): string {
  const name = encodeURIComponent(displayName.trim() || "TrackFit");
  return `https://ui-avatars.com/api/?name=${name}&background=13ec5b&color=102216&bold=true`;
}

export function ProgressScreen({
  userId,
  displayName,
  email,
  photoURL,
  onSignOut,
}: ProgressScreenProps) {
  const [period, setPeriod] = useState<PeriodOption>("3m");
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isGeneratingFade, setIsGeneratingFade] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);
  const [photoUploadSuccess, setPhotoUploadSuccess] = useState<string | null>(null);
  const [photoPrivacyError, setPhotoPrivacyError] = useState<string | null>(null);
  const [photoPrivacySuccess, setPhotoPrivacySuccess] = useState<string | null>(null);
  const [isPhotoPrivacyEnabled, setIsPhotoPrivacyEnabled] = useState(false);
  const [isPhotoPrivacySetupRequired, setIsPhotoPrivacySetupRequired] = useState(true);
  const [photoPrivacyPinHash, setPhotoPrivacyPinHash] = useState<string | null>(null);
  const [photoPrivacyPinSalt, setPhotoPrivacyPinSalt] = useState<string | null>(null);
  const [photoPrivacyPinModalMode, setPhotoPrivacyPinModalMode] =
    useState<PhotoPrivacyPinModalMode | null>(null);
  const [photoPrivacyPinDraft, setPhotoPrivacyPinDraft] = useState("");
  const [photoPrivacyPinCandidate, setPhotoPrivacyPinCandidate] = useState<string | null>(null);
  const [photoPrivacyPinModalError, setPhotoPrivacyPinModalError] = useState<string | null>(null);
  const [isPhotoPrivacyBusy, setIsPhotoPrivacyBusy] = useState(false);
  const [isPhotoPrivacyUnlocked, setIsPhotoPrivacyUnlocked] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [bodyMetrics, setBodyMetrics] = useState<BodyMetricEntry[]>([]);
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [photos, setPhotos] = useState<ProgressPhotoEntry[]>([]);
  const importPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const cameraPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const resolvedDisplayName = displayName.trim() || "Membre TrackFit";
  const resolvedEmail = email.trim() || "email non renseigne";
  const resolvedPhoto =
    photoURL && photoURL.trim() ? photoURL : getDefaultProfilePhoto(resolvedDisplayName);
  const canViewProtectedPhotos = isPhotoPrivacySetupRequired
    ? false
    : !isPhotoPrivacyEnabled || isPhotoPrivacyUnlocked;

  useEffect(() => {
    let cancelled = false;

    const loadPhotoPrivacy = async () => {
      try {
        const settings = await getPhotoPrivacySettings(userId);

        if (cancelled) {
          return;
        }

        const isFirstSetup = settings === null;
        const isEnabled = settings?.isEnabled === true;

        setIsPhotoPrivacyEnabled(isEnabled);
        setIsPhotoPrivacySetupRequired(isFirstSetup);
        setPhotoPrivacyPinHash(isEnabled ? settings?.pinHash ?? null : null);
        setPhotoPrivacyPinSalt(isEnabled ? settings?.pinSalt ?? null : null);
        setIsPhotoPrivacyUnlocked(!isFirstSetup && !isEnabled);
      } catch {
        if (!cancelled) {
          setPhotoPrivacyError("Impossible de charger le verrouillage des photos.");
          setIsPhotoPrivacyEnabled(false);
          setIsPhotoPrivacySetupRequired(true);
          setPhotoPrivacyPinHash(null);
          setPhotoPrivacyPinSalt(null);
          setIsPhotoPrivacyUnlocked(false);
        }
      }
    };

    void loadPhotoPrivacy();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const [metricsData, sessionsData, photosData] = await Promise.all([
          listBodyMetrics(userId, 120),
          listSessions(userId, 120),
          listProgressPhotos(userId, 60),
        ]);

        const sortedMetrics = metricsData
          .slice()
          .sort((a, b) => toMillis(b.measuredAt) - toMillis(a.measuredAt));
        const sortedSessions = sessionsData
          .slice()
          .sort((a, b) => toMillis(b.startedAt) - toMillis(a.startedAt));
        const sortedPhotos = photosData
          .slice()
          .sort((a, b) => toMillis(b.takenAt) - toMillis(a.takenAt));

        const hydratedPhotos = canViewProtectedPhotos
          ? await hydrateProgressPhotoEntries(sortedPhotos)
          : sortedPhotos.map((photo) => ({
              ...photo,
              previewUrl: resolveLockedProgressPhotoPreviewUrl(photo),
              mediaUrl: null,
            }));

        if (!cancelled) {
          setBodyMetrics(sortedMetrics);
          setSessions(sortedSessions);
          setPhotos(hydratedPhotos);
        }
      } catch {
        if (!cancelled) {
          setErrorMessage("Impossible de charger le profil pour le moment.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [canViewProtectedPhotos, userId]);

  const summary = useMemo(() => computeWeightSummary(bodyMetrics), [bodyMetrics]);
  const latestBodyMetric = useMemo(() => bodyMetrics[0] ?? null, [bodyMetrics]);
  const sessionSummary = useMemo(() => computeSessionSummary(sessions), [sessions]);
  const chartPoints = useMemo(
    () => buildWeightChartPoints(bodyMetrics, period),
    [bodyMetrics, period],
  );
  const chartGeometry = useMemo(
    () => buildWeightChartGeometry(chartPoints),
    [chartPoints],
  );

  useEffect(() => {
    if (canViewProtectedPhotos) {
      return;
    }

    setIsGalleryOpen(false);
  }, [canViewProtectedPhotos]);

  useEffect(() => {
    if (!isPhotoPrivacyEnabled || !isPhotoPrivacyUnlocked) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        setIsPhotoPrivacyUnlocked(false);
        setIsGalleryOpen(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isPhotoPrivacyEnabled, isPhotoPrivacyUnlocked]);

  const resetPhotoPrivacyPinModal = () => {
    setPhotoPrivacyPinModalMode(null);
    setPhotoPrivacyPinDraft("");
    setPhotoPrivacyPinCandidate(null);
    setPhotoPrivacyPinModalError(null);
  };

  const handleClosePhotoPrivacyPinModal = () => {
    if (isPhotoPrivacyBusy) {
      return;
    }

    resetPhotoPrivacyPinModal();
  };

  const openPhotoPrivacyPinModal = (mode: PhotoPrivacyPinModalMode) => {
    if (isPhotoPrivacyBusy) {
      return;
    }

    setPhotoPrivacyError(null);
    setPhotoPrivacySuccess(null);
    setPhotoPrivacyPinDraft("");
    setPhotoPrivacyPinCandidate(null);
    setPhotoPrivacyPinModalError(null);
    setPhotoPrivacyPinModalMode(mode);
  };

  const handlePhotoPrivacyPinDigit = (digit: string) => {
    if (!photoPrivacyPinModalMode || isPhotoPrivacyBusy) {
      return;
    }

    setPhotoPrivacyPinModalError(null);
    setPhotoPrivacyPinDraft((current) => {
      if (current.length >= 4) {
        return current;
      }

      return `${current}${digit}`;
    });
  };

  const handlePhotoPrivacyPinBackspace = () => {
    if (!photoPrivacyPinModalMode || isPhotoPrivacyBusy) {
      return;
    }

    setPhotoPrivacyPinModalError(null);
    setPhotoPrivacyPinDraft((current) => current.slice(0, -1));
  };

  const handlePhotoPrivacyPinClear = () => {
    if (!photoPrivacyPinModalMode || isPhotoPrivacyBusy) {
      return;
    }

    setPhotoPrivacyPinModalError(null);
    setPhotoPrivacyPinDraft("");
  };

  const handlePhotoPrivacyPinSubmit = async () => {
    if (!photoPrivacyPinModalMode || isPhotoPrivacyBusy) {
      return;
    }

    const pin = photoPrivacyPinDraft.trim();
    if (!isValidPhotoPrivacyPin(pin)) {
      setPhotoPrivacyPinModalError("Entre exactement 4 chiffres.");
      return;
    }

    if (photoPrivacyPinModalMode === "create") {
      setPhotoPrivacyPinCandidate(pin);
      setPhotoPrivacyPinDraft("");
      setPhotoPrivacyPinModalError(null);
      setPhotoPrivacyPinModalMode("confirm");
      return;
    }

    if (photoPrivacyPinModalMode === "confirm") {
      if (!photoPrivacyPinCandidate || photoPrivacyPinCandidate !== pin) {
        setPhotoPrivacyPinCandidate(null);
        setPhotoPrivacyPinDraft("");
        setPhotoPrivacyPinModalError("Les deux codes ne correspondent pas. Recommence.");
        setPhotoPrivacyPinModalMode("create");
        return;
      }

      setIsPhotoPrivacyBusy(true);
      setPhotoPrivacyError(null);
      setPhotoPrivacySuccess(null);

      try {
        const nextPin = await createPhotoPrivacyPin(pin);
        const settings = await setPhotoPrivacyPin(userId, nextPin.pinHash, nextPin.pinSalt);
        const hydratedPhotos = await hydrateProgressPhotoEntries(photos);

        setPhotos(hydratedPhotos);
        setIsPhotoPrivacyEnabled(settings.isEnabled);
        setIsPhotoPrivacySetupRequired(false);
        setPhotoPrivacyPinHash(settings.pinHash);
        setPhotoPrivacyPinSalt(settings.pinSalt);
        setIsPhotoPrivacyUnlocked(true);
        setPhotoPrivacySuccess("Code PIN active pour proteger les photos.");
        resetPhotoPrivacyPinModal();
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : "Impossible de creer le code de deverrouillage.";
        setPhotoPrivacyPinDraft("");
        setPhotoPrivacyPinModalError(message);
      } finally {
        setIsPhotoPrivacyBusy(false);
      }

      return;
    }

    setIsPhotoPrivacyBusy(true);
    setPhotoPrivacyError(null);
    setPhotoPrivacySuccess(null);

    try {
      if (!photoPrivacyPinHash || !photoPrivacyPinSalt) {
        setPhotoPrivacyPinModalError("Aucun code n est configure pour ce compte.");
        return;
      }

      const isValidPin = await verifyPhotoPrivacyPin(
        pin,
        photoPrivacyPinSalt,
        photoPrivacyPinHash,
      );
      if (!isValidPin) {
        setPhotoPrivacyPinDraft("");
        setPhotoPrivacyPinModalError("Code incorrect. Reessaie.");
        return;
      }

      const hydratedPhotos = await hydrateProgressPhotoEntries(photos);
      setPhotos(hydratedPhotos);
      setIsPhotoPrivacyUnlocked(true);
      setPhotoPrivacySuccess("Photos deverrouillees.");
      resetPhotoPrivacyPinModal();
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Impossible de verifier le code pour le moment.";
      setPhotoPrivacyPinDraft("");
      setPhotoPrivacyPinModalError(message);
    } finally {
      setIsPhotoPrivacyBusy(false);
    }
  };

  const handleSignOut = async () => {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);
    try {
      await onSignOut();
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleEnablePhotoPrivacy = () => {
    openPhotoPrivacyPinModal("create");
  };

  const handleUnlockPhotos = () => {
    if (isPhotoPrivacyBusy) {
      return;
    }

    if (
      isPhotoPrivacySetupRequired ||
      !isPhotoPrivacyEnabled ||
      !photoPrivacyPinHash ||
      !photoPrivacyPinSalt
    ) {
      openPhotoPrivacyPinModal("create");
      return;
    }

    openPhotoPrivacyPinModal("unlock");
  };

  const handleLockPhotos = () => {
    setPhotoPrivacyError(null);
    setPhotoPrivacySuccess("Photos reverrouillees.");
    setIsPhotoPrivacyUnlocked(false);
    setIsGalleryOpen(false);
  };

  const handleDisablePhotoPrivacy = async () => {
    if (isPhotoPrivacyBusy) {
      return;
    }

    const shouldDisable = window.confirm(
      "Desactiver le code PIN de protection des photos sur ce compte ?",
    );
    if (!shouldDisable) {
      return;
    }

    setIsPhotoPrivacyBusy(true);
    setPhotoPrivacyError(null);
    setPhotoPrivacySuccess(null);

    try {
      await disablePhotoPrivacy(userId);
      const hydratedPhotos = await hydrateProgressPhotoEntries(photos);
      setPhotos(hydratedPhotos);
      setIsPhotoPrivacyEnabled(false);
      setIsPhotoPrivacySetupRequired(false);
      setPhotoPrivacyPinHash(null);
      setPhotoPrivacyPinSalt(null);
      setIsPhotoPrivacyUnlocked(true);
      setPhotoPrivacySuccess("Code PIN desactive.");
      setIsGalleryOpen(true);
      resetPhotoPrivacyPinModal();
    } catch {
      setPhotoPrivacyError("Impossible de desactiver le code PIN des photos.");
    } finally {
      setIsPhotoPrivacyBusy(false);
    }
  };

  const handleOpenImportPicker = () => {
    if (isUploadingPhoto || isGeneratingFade || deletingPhotoId !== null) {
      return;
    }

    setPhotoUploadError(null);
    setPhotoUploadSuccess(null);
    importPhotoInputRef.current?.click();
  };

  const handleOpenCameraPicker = () => {
    if (isUploadingPhoto || isGeneratingFade || deletingPhotoId !== null) {
      return;
    }

    setPhotoUploadError(null);
    setPhotoUploadSuccess(null);
    cameraPhotoInputRef.current?.click();
  };

  const handlePhotoSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setPhotoUploadError("Selectionne une image valide.");
      setPhotoUploadSuccess(null);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setPhotoUploadError("Image trop lourde (max 10 Mo).");
      setPhotoUploadSuccess(null);
      return;
    }

    setIsUploadingPhoto(true);
    setPhotoUploadError(null);
    setPhotoUploadSuccess(null);

    try {
      const uploaded = await uploadToCloudinary(file);
      const takenAt = Timestamp.now();
      const currentWeightKg = latestBodyMetric?.weightKg ?? null;
      const currentBodyFatPct =
        typeof latestBodyMetric?.bodyFatPct === "number"
          ? latestBodyMetric.bodyFatPct
          : null;
      const photoId = await addProgressPhoto(userId, {
        takenAt,
        storagePath: uploaded.imageUrl,
        thumbnailPath: uploaded.thumbnailUrl,
        weightKgSnapshot: currentWeightKg,
        bodyFatPctSnapshot: currentBodyFatPct,
      });

      const localEntry: ProgressPhotoEntry = {
        id: photoId,
        takenAt,
        storagePath: uploaded.imageUrl,
        thumbnailPath: uploaded.thumbnailUrl,
        weightKgSnapshot: currentWeightKg,
        bodyFatPctSnapshot: currentBodyFatPct,
        note: "",
        mediaType: "image",
        kind: "original",
        sourcePhotoIds: null,
        createdAt: takenAt,
        updatedAt: takenAt,
        previewUrl: canViewProtectedPhotos
          ? (uploaded.thumbnailUrl ?? uploaded.imageUrl)
          : buildBlurredCloudinaryPreviewUrl(uploaded.thumbnailUrl ?? uploaded.imageUrl),
        mediaUrl: canViewProtectedPhotos ? uploaded.imageUrl : null,
      };

      setPhotos((current) =>
        [localEntry, ...current].sort((a, b) => toMillis(b.takenAt) - toMillis(a.takenAt)),
      );
      setPhotoUploadSuccess("Photo ajoutee.");
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Impossible d ajouter la photo pour le moment.";
      setPhotoUploadError(message);
      setPhotoUploadSuccess(null);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (isUploadingPhoto || isGeneratingFade || deletingPhotoId !== null) {
      return;
    }

    const shouldDelete = window.confirm("Supprimer cette photo de progression ?");
    if (!shouldDelete) {
      return;
    }

    setDeletingPhotoId(photoId);
    setPhotoUploadError(null);
    setPhotoUploadSuccess(null);

    try {
      await deleteProgressPhoto(userId, photoId);
      setPhotos((current) => current.filter((photo) => photo.id !== photoId));
      setPhotoUploadSuccess("Photo supprimee.");
    } catch {
      setPhotoUploadError("Impossible de supprimer la photo pour le moment.");
      setPhotoUploadSuccess(null);
    } finally {
      setDeletingPhotoId(null);
    }
  };

  const handleGenerateFade = async (photoIds: string[]) => {
    if (
      isGeneratingFade ||
      isUploadingPhoto ||
      deletingPhotoId !== null ||
      photoIds.length < 2
    ) {
      return;
    }

    if (!canViewProtectedPhotos) {
      setPhotoUploadError("Deverrouille les photos pour generer un fondu.");
      setPhotoUploadSuccess(null);
      return;
    }

    const selectedPhotos = photos
      .filter((photo) => photoIds.includes(photo.id))
      .filter((photo) => resolveProgressPhotoMediaType(photo) === "image")
      .sort((a, b) => toMillis(a.takenAt) - toMillis(b.takenAt));

    if (selectedPhotos.length < 2) {
      setPhotoUploadError("Selectionne au moins 2 photos (les videos ne sont pas prises en compte).");
      setPhotoUploadSuccess(null);
      return;
    }

    setIsGeneratingFade(true);
    setPhotoUploadError(null);
    setPhotoUploadSuccess(null);

    try {
      const fadeResult = await generateFadeVideoFromCloudinaryPhotos(
        selectedPhotos.map((photo) => photo.mediaUrl ?? photo.storagePath),
      );
      const takenAt = Timestamp.now();
      const currentWeightKg = latestBodyMetric?.weightKg ?? null;
      const currentBodyFatPct =
        typeof latestBodyMetric?.bodyFatPct === "number"
          ? latestBodyMetric.bodyFatPct
          : null;
      const photoId = await addProgressPhoto(userId, {
        takenAt,
        storagePath: fadeResult.videoUrl,
        thumbnailPath: fadeResult.thumbnailUrl,
        weightKgSnapshot: currentWeightKg,
        bodyFatPctSnapshot: currentBodyFatPct,
        mediaType: "video",
        kind: "fade",
        sourcePhotoIds: selectedPhotos.map((photo) => photo.id),
      });

      const localEntry: ProgressPhotoEntry = {
        id: photoId,
        takenAt,
        storagePath: fadeResult.videoUrl,
        thumbnailPath: fadeResult.thumbnailUrl,
        weightKgSnapshot: currentWeightKg,
        bodyFatPctSnapshot: currentBodyFatPct,
        note: "",
        mediaType: "video",
        kind: "fade",
        sourcePhotoIds: selectedPhotos.map((photo) => photo.id),
        createdAt: takenAt,
        updatedAt: takenAt,
        previewUrl: canViewProtectedPhotos
          ? (fadeResult.thumbnailUrl ?? fadeResult.videoUrl)
          : buildBlurredCloudinaryPreviewUrl(fadeResult.thumbnailUrl ?? fadeResult.videoUrl),
        mediaUrl: canViewProtectedPhotos ? fadeResult.videoUrl : null,
      };

      setPhotos((current) =>
        [localEntry, ...current].sort((a, b) => toMillis(b.takenAt) - toMillis(a.takenAt)),
      );
      setPhotoUploadSuccess("Fondu genere et ajoute a la galerie.");
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Impossible de generer le fondu pour le moment.";
      setPhotoUploadError(message);
      setPhotoUploadSuccess(null);
    } finally {
      setIsGeneratingFade(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background-dark pb-24 text-text-primary">
      <input
        ref={importPhotoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoSelected}
      />
      <input
        ref={cameraPhotoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePhotoSelected}
      />

      {isGalleryOpen ? (
        <PhotoGalleryScreen
          photos={photos}
          currentWeightKg={summary.currentWeightKg}
          deletingPhotoId={deletingPhotoId}
          isGeneratingFade={isGeneratingFade}
          feedbackError={photoUploadError}
          feedbackSuccess={photoUploadSuccess}
          onBack={() => setIsGalleryOpen(false)}
          onOpenImportPhoto={handleOpenImportPicker}
          onDeletePhoto={(photoId) => {
            void handleDeletePhoto(photoId);
          }}
          onGenerateFade={(photoIds) => {
            void handleGenerateFade(photoIds);
          }}
        />
      ) : (
        <>
          <header className="sticky top-0 z-20 flex items-center justify-center border-b border-white/5 bg-background-dark/90 px-4 py-4 backdrop-blur-md">
            <h1 className="text-lg font-bold tracking-tight text-white">
              Profil et progres physique
            </h1>
          </header>

          <main className="flex flex-col gap-6 p-4 pb-8">
            {isLoading ? (
              <div className="rounded-2xl border border-white/5 bg-card-dark p-4 text-sm text-text-secondary">
                Chargement du profil...
              </div>
            ) : null}

            {errorMessage ? (
              <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 p-4 text-sm text-rose-200">
                {errorMessage}
              </div>
            ) : null}

            {!isLoading ? (
              <>
                <ProfileIdentityCard
                  displayName={resolvedDisplayName}
                  email={resolvedEmail}
                  photoURL={resolvedPhoto}
                  completedSessions={sessionSummary.completedCount}
                  thisMonthSessions={sessionSummary.thisMonthCount}
                  onSignOut={() => {
                    void handleSignOut();
                  }}
                  isSigningOut={isSigningOut}
                />

                <FriendsSection userId={userId} />

                <BodyCompositionCards summary={summary} />

                <WeightHistorySection
                  period={period}
                  onPeriodChange={setPeriod}
                  points={chartPoints}
                  geometry={chartGeometry}
                  currentWeightKg={summary.currentWeightKg}
                  deltaWeightKg={summary.deltaWeightKg}
                />

                <ProgressPhotosSection
                  photos={photos}
                  currentWeightKg={summary.currentWeightKg}
                  photoPrivacyEnabled={isPhotoPrivacyEnabled}
                  photoPrivacySetupRequired={isPhotoPrivacySetupRequired}
                  isPhotoPrivacyUnlocked={isPhotoPrivacyUnlocked}
                  isPhotoPrivacyBusy={isPhotoPrivacyBusy}
                  privacyError={photoPrivacyError}
                  privacySuccess={photoPrivacySuccess}
                  isUploadingPhoto={isUploadingPhoto}
                  deletingPhotoId={deletingPhotoId}
                  uploadError={photoUploadError}
                  uploadSuccess={photoUploadSuccess}
                  onEnableProtection={handleEnablePhotoPrivacy}
                  onUnlockPhotos={handleUnlockPhotos}
                  onLockPhotos={handleLockPhotos}
                  onDisableProtection={() => {
                    void handleDisablePhotoPrivacy();
                  }}
                  onImportPhoto={handleOpenImportPicker}
                  onTakePhoto={handleOpenCameraPicker}
                  onOpenGallery={() => setIsGalleryOpen(true)}
                  onDeletePhoto={(photoId) => {
                    void handleDeletePhoto(photoId);
                  }}
                />
              </>
            ) : null}
          </main>
        </>
      )}

      <PhotoPrivacyPinModal
        mode={photoPrivacyPinModalMode}
        value={photoPrivacyPinDraft}
        error={photoPrivacyPinModalError}
        isBusy={isPhotoPrivacyBusy}
        onDigit={handlePhotoPrivacyPinDigit}
        onBackspace={handlePhotoPrivacyPinBackspace}
        onClear={handlePhotoPrivacyPinClear}
        onSubmit={() => {
          void handlePhotoPrivacyPinSubmit();
        }}
        onClose={handleClosePhotoPrivacyPinModal}
      />
    </div>
  );
}
