import { useEffect, useMemo, useState } from "react";
import type { ProgressPhotoEntry } from "../types.ts";
import { formatWeightLabel, getFallbackPhoto, toMillis } from "../utils.ts";

interface PhotoGalleryScreenProps {
  photos: ProgressPhotoEntry[];
  currentWeightKg: number | null;
  deletingPhotoId: string | null;
  onBack: () => void;
  onOpenImportPhoto: () => void;
  onDeletePhoto: (photoId: string) => void;
}

interface MonthGroup {
  key: string;
  title: string;
  photos: ProgressPhotoEntry[];
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

export function PhotoGalleryScreen({
  photos,
  currentWeightKg,
  deletingPhotoId,
  onBack,
  onOpenImportPhoto,
  onDeletePhoto,
}: PhotoGalleryScreenProps) {
  const [fullscreenPhotoUrl, setFullscreenPhotoUrl] = useState<string | null>(null);
  const [fullscreenPhotoAlt, setFullscreenPhotoAlt] = useState<string>("Photo de progression");
  const isFullscreenOpen = fullscreenPhotoUrl !== null;

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
            className="rounded-full p-2 transition-colors hover:bg-primary/10"
            aria-label="Filtrer par date"
          >
            <span className="material-symbols-outlined text-text-primary">calendar_month</span>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24">
        <div className="px-4 py-6">
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
                    {group.photos.length} photo{group.photos.length > 1 ? "s" : ""}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {group.photos.map((photo, index) => {
                    const photoMs = toMillis(photo.takenAt);
                    const photoUrl = photo.previewUrl ?? getFallbackPhoto(index);
                    const isDeleting = deletingPhotoId === photo.id;

                    return (
                      <article
                        key={photo.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setFullscreenPhotoUrl(photoUrl);
                          setFullscreenPhotoAlt(`Photo de progression du ${dayLabel.format(new Date(photoMs))}`);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setFullscreenPhotoUrl(photoUrl);
                            setFullscreenPhotoAlt(
                              `Photo de progression du ${dayLabel.format(new Date(photoMs))}`,
                            );
                          }
                        }}
                        className="group relative aspect-[3/4] cursor-zoom-in overflow-hidden rounded-xl border border-primary/5 bg-slate-800"
                      >
                        <img
                          src={photoUrl}
                          alt={`Photo de progression ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
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

                        <div className="absolute right-2 top-2 z-10 flex gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setFullscreenPhotoUrl(photoUrl);
                              setFullscreenPhotoAlt(
                                `Photo de progression du ${dayLabel.format(new Date(photoMs))}`,
                              );
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
          className="flex size-14 items-center justify-center rounded-full bg-primary text-background-dark shadow-lg shadow-primary/20 transition-transform hover:scale-105 active:scale-95"
          aria-label="Ajouter une photo"
        >
          <span className="material-symbols-outlined text-3xl font-bold">add</span>
        </button>
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
    </div>
  );
}
