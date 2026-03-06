import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Timestamp } from "firebase/firestore";
import { getDownloadURL, ref as storageRef } from "firebase/storage";
import { storage } from "../../firebase.ts";
import {
  addProgressPhoto,
  deleteProgressPhoto,
  listBodyMetrics,
  listProgressPhotos,
  listSessions,
} from "../../services/firestoreService.ts";
import {
  generateFadeVideoFromCloudinaryPhotos,
  uploadToCloudinary,
} from "../../services/imageUploadService.ts";
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
import { PhotoGalleryScreen } from "./components/PhotoGalleryScreen.tsx";
import { ProfileIdentityCard } from "./components/ProfileIdentityCard.tsx";
import { ProgressPhotosSection } from "./components/ProgressPhotosSection.tsx";
import { WeightHistorySection } from "./components/WeightHistorySection.tsx";

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
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [bodyMetrics, setBodyMetrics] = useState<BodyMetricEntry[]>([]);
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [photos, setPhotos] = useState<ProgressPhotoEntry[]>([]);
  const importPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const cameraPhotoInputRef = useRef<HTMLInputElement | null>(null);

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

        const hydratedPhotos = await Promise.all(
          sortedPhotos.map(async (photo) => ({
            ...photo,
            previewUrl: await resolveProgressPhotoPreviewUrl(photo),
            mediaUrl: await resolveStorageLikeUrl(photo.storagePath),
          })),
        );

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
  }, [userId]);

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

  const resolvedDisplayName = displayName.trim() || "Membre TrackFit";
  const resolvedEmail = email.trim() || "email non renseigne";
  const resolvedPhoto =
    photoURL && photoURL.trim() ? photoURL : getDefaultProfilePhoto(resolvedDisplayName);

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
        previewUrl: uploaded.thumbnailUrl ?? uploaded.imageUrl,
        mediaUrl: uploaded.imageUrl,
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
        previewUrl: fadeResult.thumbnailUrl ?? fadeResult.videoUrl,
        mediaUrl: fadeResult.videoUrl,
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
                  isUploadingPhoto={isUploadingPhoto}
                  deletingPhotoId={deletingPhotoId}
                  uploadError={photoUploadError}
                  uploadSuccess={photoUploadSuccess}
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
    </div>
  );
}
