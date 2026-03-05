import { useMemo, useState } from "react";
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
  isUploadingPhoto,
  uploadError,
  uploadSuccess,
  onAddPhoto,
}: ProgressPhotosSectionProps) {
  const [isOpen, setIsOpen] = useState(true);

  const visiblePhotos = photos.slice(0, 6);
  const comparePhotos = useMemo(() => photos.slice(0, 2), [photos]);

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
            <button
              type="button"
              onClick={onAddPhoto}
              disabled={isUploadingPhoto}
              className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/10 py-4 text-sm font-bold text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-lg">
                {isUploadingPhoto ? "progress_activity" : "add_a_photo"}
              </span>
              {isUploadingPhoto ? "Upload en cours..." : "Ajouter une photo"}
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
                  return (
                    <div
                      key={photo.id}
                      className="group relative aspect-[3/4] overflow-hidden rounded-xl border border-white/5 bg-background-dark"
                    >
                      <img
                        src={photoUrl}
                        alt={`Photo de progression ${index + 1}`}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      <div className="absolute bottom-3 left-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/90">
                          {formatPhotoDate(photoMs)}
                        </p>
                        <p className="text-sm font-bold text-white">
                          {photo.weightKgSnapshot !== null
                            ? `${formatWeightLabel(photo.weightKgSnapshot)} kg`
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
                        <img
                          src={photo.previewUrl ?? getFallbackPhoto(index)}
                          alt={`Miniature ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
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
    </section>
  );
}
