import { useEffect, useMemo, useState } from "react";
import type { ProgressPhotosSectionProps } from "./types.ts";
import { formatWeightLabel, getFallbackPhoto, toMillis } from "../utils.ts";

const longDate = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatPhotoDate(ms: number): string {
  return longDate.format(new Date(ms));
}

export function ProgressPhotosSection({
  photos,
  currentWeightKg,
  isUploadingPhoto,
  deletingPhotoId,
  uploadError,
  uploadSuccess,
  onImportPhoto,
  onTakePhoto,
  onOpenGallery,
  onDeletePhoto,
}: ProgressPhotosSectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [fullscreenPhotoUrl, setFullscreenPhotoUrl] = useState<string | null>(null);
  const [fullscreenPhotoAlt, setFullscreenPhotoAlt] = useState<string>("Photo de progression");

  const visiblePhotos = photos.slice(0, 6);
  const comparePhotos = useMemo(() => photos.slice(0, 2), [photos]);
  const isFullscreenOpen = fullscreenPhotoUrl !== null;

  useEffect(() => {
    if (!isFullscreenOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFullscreenPhotoUrl(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isFullscreenOpen]);

  return (
    <section className="mt-2">
      <div className="overflow-hidden rounded-2xl border border-white/5 bg-card-dark shadow-sm">
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="flex w-full items-center justify-between p-5 text-left"
        >
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: "24px" }}>
              photo_library
            </span>
            <h2 className="text-xl font-bold tracking-tight text-white">Photos de progression</h2>
          </div>
          <span
            className={`material-symbols-outlined text-text-secondary transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          >
            expand_more
          </span>
        </button>

        {isOpen ? (
          <div className="px-5 pb-5">
            <div className="mb-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onImportPhoto}
                disabled={isUploadingPhoto || deletingPhotoId !== null}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/10 py-4 text-sm font-bold text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-lg">
                  {isUploadingPhoto ? "progress_activity" : "photo_library"}
                </span>
                Importer
              </button>
              <button
                type="button"
                onClick={onTakePhoto}
                disabled={isUploadingPhoto || deletingPhotoId !== null}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary py-4 text-sm font-bold text-background-dark transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-lg">photo_camera</span>
                Camera
              </button>
            </div>

            <button
              type="button"
              onClick={onOpenGallery}
              className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-background-dark py-3 text-sm font-bold text-primary transition-colors hover:bg-primary/10"
            >
              <span className="material-symbols-outlined text-lg">grid_view</span>
              Galerie
            </button>

            {uploadError ? (
              <p className="mb-4 rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                {uploadError}
              </p>
            ) : null}

            {uploadSuccess ? (
              <p className="mb-4 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
                {uploadSuccess}
              </p>
            ) : null}

            {visiblePhotos.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {visiblePhotos.map((photo, index) => {
                  const photoMs = toMillis(photo.takenAt);
                  const photoUrl = photo.previewUrl ?? getFallbackPhoto(index);
                  const isDeleting = deletingPhotoId === photo.id;
                  return (
                    <div
                      key={photo.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setFullscreenPhotoUrl(photoUrl);
                        setFullscreenPhotoAlt(`Photo de progression ${index + 1}`);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setFullscreenPhotoUrl(photoUrl);
                          setFullscreenPhotoAlt(`Photo de progression ${index + 1}`);
                        }
                      }}
                      className="group relative aspect-[3/4] cursor-zoom-in overflow-hidden rounded-xl border border-white/5 bg-background-dark"
                    >
                      <img
                        src={photoUrl}
                        alt={`Photo de progression ${index + 1}`}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDeletePhoto(photo.id);
                        }}
                        disabled={deletingPhotoId !== null}
                        className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-rose-300/40 bg-rose-500/20 text-rose-200 backdrop-blur-sm transition-colors hover:bg-rose-500/35 disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label="Supprimer la photo"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {isDeleting ? "progress_activity" : "delete"}
                        </span>
                      </button>

                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      <div className="absolute bottom-3 left-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/90">
                          {formatPhotoDate(photoMs)}
                        </p>
                        <p className="text-sm font-bold text-white">
                          {(photo.weightKgSnapshot ?? currentWeightKg) !== null
                            ? `${formatWeightLabel(photo.weightKgSnapshot ?? currentWeightKg)} kg`
                            : "Poids non renseigne"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 bg-background-dark/70 p-4 text-sm text-text-secondary">
                Ajoute une photo de progression pour suivre ton evolution visuelle.
              </div>
            )}

            {comparePhotos.length === 2 ? (
              <div className="mt-4 flex items-center justify-between rounded-xl border border-white/5 bg-background-dark/70 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-3">
                    {comparePhotos.map((photo, index) => (
                      <div
                        key={`compare-${photo.id}`}
                        className="h-10 w-10 overflow-hidden rounded-full border-2 border-card-dark"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setFullscreenPhotoUrl(photo.previewUrl ?? getFallbackPhoto(index));
                            setFullscreenPhotoAlt(`Miniature ${index + 1}`);
                          }}
                          className="h-full w-full cursor-zoom-in"
                          aria-label={`Ouvrir la photo ${index + 1} en plein ecran`}
                        >
                          <img
                            src={photo.previewUrl ?? getFallbackPhoto(index)}
                            alt={`Miniature ${index + 1}`}
                            className="h-full w-full object-cover"
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white">Comparer les photos</span>
                    <span className="text-xs text-slate-400">
                      {formatPhotoDate(toMillis(comparePhotos[1].takenAt))} vs{" "}
                      {formatPhotoDate(toMillis(comparePhotos[0].takenAt))}
                    </span>
                  </div>
                </div>
                <span className="material-symbols-outlined text-slate-400" style={{ fontSize: "20px" }}>
                  chevron_right
                </span>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {isFullscreenOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setFullscreenPhotoUrl(null)}
        >
          <button
            type="button"
            onClick={() => setFullscreenPhotoUrl(null)}
            className="absolute right-4 top-4 z-[101] flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white transition-colors hover:bg-black/60"
            aria-label="Fermer la photo"
          >
            <span className="material-symbols-outlined">close</span>
          </button>

          <img
            src={fullscreenPhotoUrl}
            alt={fullscreenPhotoAlt}
            className="max-h-full max-w-full object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </section>
  );
}
