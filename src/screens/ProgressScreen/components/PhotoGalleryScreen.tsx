import { useEffect, useMemo, useState } from "react";
import type { ProgressPhotoEntry } from "../types.ts";
import {
  formatWeightLabel,
  getFallbackPhoto,
  inferMediaTypeFromUrl,
  resolveProgressPhotoMediaType,
  toMillis,
} from "../utils.ts";

interface PhotoGalleryScreenProps {
  photos: ProgressPhotoEntry[];
  currentWeightKg: number | null;
  deletingPhotoId: string | null;
  isGeneratingFade: boolean;
  feedbackError: string | null;
  feedbackSuccess: string | null;
  onBack: () => void;
  onOpenImportPhoto: () => void;
  onDeletePhoto: (photoId: string) => void;
  onGenerateFade: (photoIds: string[]) => void;
}

interface MonthGroup {
  key: string;
  title: string;
  photos: ProgressPhotoEntry[];
}

interface FullscreenMedia {
  url: string;
  alt: string;
  mediaType: "image" | "video";
}

const monthTitle = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
});

const dayLabel = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
});

function upperFirst(text: string): string {
  if (!text) {
    return text;
  }
  return text[0].toUpperCase() + text.slice(1);
}

function getPhotoPreviewUrl(photo: ProgressPhotoEntry, fallbackIndex: number): string {
  return photo.previewUrl ?? photo.mediaUrl ?? getFallbackPhoto(fallbackIndex);
}

function getPhotoMediaUrl(photo: ProgressPhotoEntry, fallbackIndex: number): string {
  return photo.mediaUrl ?? photo.storagePath ?? getPhotoPreviewUrl(photo, fallbackIndex);
}

export function PhotoGalleryScreen({
  photos,
  currentWeightKg,
  deletingPhotoId,
  isGeneratingFade,
  feedbackError,
  feedbackSuccess,
  onBack,
  onOpenImportPhoto,
  onDeletePhoto,
  onGenerateFade,
}: PhotoGalleryScreenProps) {
  const [fullscreenMedia, setFullscreenMedia] = useState<FullscreenMedia | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const isFullscreenOpen = fullscreenMedia !== null;

  const selectedPhotoIdSet = useMemo(() => new Set(selectedPhotoIds), [selectedPhotoIds]);
  const existingPhotoIdSet = useMemo(() => new Set(photos.map((photo) => photo.id)), [photos]);
  const effectiveSelectedPhotoIds = useMemo(
    () => selectedPhotoIds.filter((photoId) => existingPhotoIdSet.has(photoId)),
    [existingPhotoIdSet, selectedPhotoIds],
  );

  const monthGroups = useMemo(() => {
    const groups = new Map<string, MonthGroup>();

    photos.forEach((photo) => {
      const ms = toMillis(photo.takenAt);
      const date = new Date(ms);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const current = groups.get(key);

      if (!current) {
        groups.set(key, {
          key,
          title: upperFirst(monthTitle.format(date)),
          photos: [photo],
        });
        return;
      }

      current.photos.push(photo);
    });

    return [...groups.values()];
  }, [photos]);

  useEffect(() => {
    if (!isFullscreenOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFullscreenMedia(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isFullscreenOpen]);

  const toggleSelectedPhoto = (photo: ProgressPhotoEntry) => {
    const mediaType = resolveProgressPhotoMediaType(photo);
    if (mediaType === "video") {
      return;
    }

    setSelectedPhotoIds((current) => {
      if (current.includes(photo.id)) {
        return current.filter((photoId) => photoId !== photo.id);
      }
      return [...current, photo.id];
    });
  };

  const openFullscreen = (photo: ProgressPhotoEntry, fallbackIndex: number, photoMs: number) => {
    const mediaType = resolveProgressPhotoMediaType(photo);
    const mediaUrl = getPhotoMediaUrl(photo, fallbackIndex);
    setFullscreenMedia({
      url: mediaUrl,
      alt: `Photo de progression du ${dayLabel.format(new Date(photoMs))}`,
      mediaType,
    });
  };

  const canGenerateFade = effectiveSelectedPhotoIds.length >= 2 && !isGeneratingFade;

  const handleToggleSelectionMode = () => {
    setIsSelectionMode((current) => {
      const next = !current;
      if (!next) {
        setSelectedPhotoIds([]);
      }
      return next;
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background-dark text-text-primary">
      <header className="sticky top-0 z-20 border-b border-primary/10 bg-background-dark/80 backdrop-blur-md">
        <div className="flex items-center justify-between p-4">
          <button
            type="button"
            onClick={onBack}
            className="rounded-full p-2 transition-colors hover:bg-primary/10"
            aria-label="Retour au profil"
          >
            <span className="material-symbols-outlined text-text-primary">
              arrow_back_ios_new
            </span>
          </button>
          <h1 className="text-lg font-bold tracking-tight text-white">Galerie de progression</h1>
          <button
            type="button"
            onClick={handleToggleSelectionMode}
            className={`rounded-full p-2 transition-colors ${
              isSelectionMode ? "bg-primary/20 text-primary" : "hover:bg-primary/10 text-text-primary"
            }`}
            aria-label="Mode selection"
          >
            <span className="material-symbols-outlined">
              {isSelectionMode ? "checklist" : "select_all"}
            </span>
          </button>
        </div>
      </header>

      <main className={`flex-1 overflow-y-auto ${isSelectionMode ? "pb-44" : "pb-24"}`}>
        <div className="px-4 py-6">
          {feedbackError ? (
            <p className="mb-4 rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              {feedbackError}
            </p>
          ) : null}

          {feedbackSuccess ? (
            <p className="mb-4 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
              {feedbackSuccess}
            </p>
          ) : null}

          {isSelectionMode ? (
            <div className="mb-4 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-xs text-primary">
              Selectionne au moins 2 photos puis genere le fondu. Les videos ne sont pas selectionnables.
            </div>
          ) : null}

          {monthGroups.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-card-dark p-4 text-sm text-text-secondary">
              Aucune photo pour le moment.
            </div>
          ) : (
            monthGroups.map((group) => (
              <section key={group.key} className="mb-8 last:mb-0">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-extrabold text-primary">{group.title}</h2>
                  <span className="text-xs font-medium uppercase tracking-widest text-slate-400">
                    {group.photos.length} media{group.photos.length > 1 ? "s" : ""}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {group.photos.map((photo, index) => {
                    const photoMs = toMillis(photo.takenAt);
                    const mediaType = resolveProgressPhotoMediaType(photo);
                    const previewUrl = getPhotoPreviewUrl(photo, index);
                    const previewMediaType =
                      mediaType === "video" && inferMediaTypeFromUrl(previewUrl) === "video"
                        ? "video"
                        : "image";
                    const isDeleting = deletingPhotoId === photo.id;
                    const isSelected = selectedPhotoIdSet.has(photo.id);
                    const canSelect = mediaType === "image";

                    return (
                      <article
                        key={photo.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          if (isSelectionMode) {
                            toggleSelectedPhoto(photo);
                            return;
                          }

                          openFullscreen(photo, index, photoMs);
                        }}
                        onKeyDown={(event) => {
                          if (event.key !== "Enter" && event.key !== " ") {
                            return;
                          }

                          event.preventDefault();
                          if (isSelectionMode) {
                            toggleSelectedPhoto(photo);
                            return;
                          }

                          openFullscreen(photo, index, photoMs);
                        }}
                        className={`group relative aspect-[3/4] overflow-hidden rounded-xl border bg-slate-800 ${
                          canSelect || !isSelectionMode
                            ? "cursor-pointer border-primary/5"
                            : "cursor-not-allowed border-white/5 opacity-80"
                        }`}
                      >
                        {previewMediaType === "video" ? (
                          <video
                            src={previewUrl}
                            className="h-full w-full object-cover"
                            muted
                            playsInline
                            preload="metadata"
                          />
                        ) : (
                          <img
                            src={previewUrl}
                            alt={`Photo de progression ${index + 1}`}
                            className="h-full w-full object-cover"
                          />
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                        <div className="absolute bottom-3 left-3">
                          <p className="text-sm font-bold text-white">
                            {upperFirst(dayLabel.format(new Date(photoMs)))}
                          </p>
                          <p className="text-xs font-semibold text-white/80">
                            {(photo.weightKgSnapshot ?? currentWeightKg) !== null
                              ? `${formatWeightLabel(photo.weightKgSnapshot ?? currentWeightKg)} kg`
                              : "Poids non renseigne"}
                          </p>
                        </div>

                        {mediaType === "video" ? (
                          <span className="absolute left-2 top-2 rounded-full border border-primary/30 bg-black/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                            Fondu
                          </span>
                        ) : null}

                        {isSelectionMode ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleSelectedPhoto(photo);
                            }}
                            disabled={!canSelect}
                            className={`absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full border backdrop-blur-md transition-colors ${
                              isSelected
                                ? "border-primary/40 bg-primary text-background-dark"
                                : "border-white/20 bg-black/40 text-white"
                            } ${!canSelect ? "cursor-not-allowed opacity-50" : ""}`}
                            aria-label="Selectionner cette photo"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {isSelected ? "check" : "radio_button_unchecked"}
                            </span>
                          </button>
                        ) : (
                          <div className="absolute right-2 top-2 z-10 flex gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                openFullscreen(photo, index, photoMs);
                              }}
                              className="rounded-full bg-black/40 p-2 text-white backdrop-blur-md transition-colors hover:text-primary"
                              aria-label="Ouvrir en plein ecran"
                            >
                              <span className="material-symbols-outlined text-sm">fullscreen</span>
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                onDeletePhoto(photo.id);
                              }}
                              disabled={deletingPhotoId !== null}
                              className="rounded-full bg-black/40 p-2 text-white backdrop-blur-md transition-colors hover:text-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
                              aria-label="Supprimer la photo"
                            >
                              <span className="material-symbols-outlined text-sm">
                                {isDeleting ? "progress_activity" : "delete"}
                              </span>
                            </button>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>
      </main>

      <div className="fixed bottom-24 right-6 z-30">
        <button
          type="button"
          onClick={onOpenImportPhoto}
          disabled={isSelectionMode}
          className="flex size-14 items-center justify-center rounded-full bg-primary text-background-dark shadow-lg shadow-primary/20 transition-transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="Ajouter une photo"
        >
          <span className="material-symbols-outlined text-3xl font-bold">add</span>
        </button>
      </div>

      {isSelectionMode ? (
        <div className="fixed bottom-24 left-0 right-0 z-40 border-t border-primary/10 bg-background-dark/95 px-4 py-4 backdrop-blur-lg">
          <div className="mx-auto w-full max-w-md space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {effectiveSelectedPhotoIds.length} photo
              {effectiveSelectedPhotoIds.length > 1 ? "s" : ""} selectionnee
              {effectiveSelectedPhotoIds.length > 1 ? "s" : ""}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsSelectionMode(false);
                  setSelectedPhotoIds([]);
                }}
                disabled={isGeneratingFade}
                className="rounded-xl border border-white/10 bg-card-dark py-3 text-sm font-bold text-text-primary transition-colors hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => onGenerateFade(effectiveSelectedPhotoIds)}
                disabled={!canGenerateFade}
                className="rounded-xl bg-primary py-3 text-sm font-bold text-background-dark transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/40"
              >
                {isGeneratingFade ? "Generation..." : "Generer un fondu"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isFullscreenOpen && fullscreenMedia !== null ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setFullscreenMedia(null)}
        >
          <button
            type="button"
            onClick={() => setFullscreenMedia(null)}
            className="absolute right-4 top-4 z-[101] flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white transition-colors hover:bg-black/60"
            aria-label="Fermer le media"
          >
            <span className="material-symbols-outlined">close</span>
          </button>

          {fullscreenMedia.mediaType === "video" ? (
            <video
              src={fullscreenMedia.url}
              controls
              autoPlay
              playsInline
              className="max-h-full max-w-full object-contain"
              onClick={(event) => event.stopPropagation()}
            />
          ) : (
            <img
              src={fullscreenMedia.url}
              alt={fullscreenMedia.alt}
              className="max-h-full max-w-full object-contain"
              onClick={(event) => event.stopPropagation()}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
