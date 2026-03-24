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
  photoPrivacyEnabled,
  isPhotoPrivacyUnlocked,
  isPhotoPrivacySupported,
  isPhotoPrivacyBusy,
  privacyError,
  privacySuccess,
  isUploadingPhoto,
  deletingPhotoId,
  uploadError,
  uploadSuccess,
  onEnableProtection,
  onAddCurrentDevice,
  onUnlockPhotos,
  onLockPhotos,
  onDisableProtection,
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
  const canViewPhotos = !photoPrivacyEnabled || isPhotoPrivacyUnlocked;
  const galleryActionLabel = canViewPhotos ? "Galerie" : "Deverrouiller la galerie";

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
              onClick={canViewPhotos ? onOpenGallery : onUnlockPhotos}
              className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-background-dark py-3 text-sm font-bold text-primary transition-colors hover:bg-primary/10"
            >
              <span className="material-symbols-outlined text-lg">
                {canViewPhotos ? "grid_view" : "lock_open"}
              </span>
              {galleryActionLabel}
            </button>

            <div className="mb-4 rounded-xl border border-primary/15 bg-background-dark/70 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-full ${
                    photoPrivacyEnabled
                      ? isPhotoPrivacyUnlocked
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-amber-500/15 text-amber-300"
                      : "bg-primary/10 text-primary"
                  }`}>
                    <span className="material-symbols-outlined">
                      {photoPrivacyEnabled
                        ? isPhotoPrivacyUnlocked
                          ? "lock_open"
                          : "lock"
                        : "fingerprint"}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">
                      {photoPrivacyEnabled
                        ? isPhotoPrivacyUnlocked
                          ? "Photos deverrouillees"
                          : "Photos verrouillees"
                        : "Protection biométrique inactive"}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {photoPrivacyEnabled
                        ? isPhotoPrivacyUnlocked
                          ? "La galerie reste ouverte jusqu a verrouillage manuel ou changement d onglet."
                          : "Deverrouille avec Face ID, Touch ID, Windows Hello ou le verrou local de l appareil."
                        : "Ajoute un verrou local pour masquer la consultation des photos sur cet appareil."}
                    </p>
                  </div>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-300">
                  {photoPrivacyEnabled
                    ? isPhotoPrivacyUnlocked
                      ? "Actif"
                      : "Verrouille"
                    : "Inactif"}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {!photoPrivacyEnabled ? (
                  <button
                    type="button"
                    onClick={onEnableProtection}
                    disabled={isPhotoPrivacyBusy || !isPhotoPrivacySupported}
                    className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-background-dark transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-lg">fingerprint</span>
                    Activer
                  </button>
                ) : null}

                {photoPrivacyEnabled && !isPhotoPrivacyUnlocked ? (
                  <button
                    type="button"
                    onClick={onUnlockPhotos}
                    disabled={isPhotoPrivacyBusy}
                    className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-background-dark transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-lg">
                      {isPhotoPrivacyBusy ? "progress_activity" : "lock_open"}
                    </span>
                    Deverrouiller
                  </button>
                ) : null}

                {photoPrivacyEnabled ? (
                  <button
                    type="button"
                    onClick={isPhotoPrivacyUnlocked ? onLockPhotos : onAddCurrentDevice}
                    disabled={isPhotoPrivacyBusy || (!isPhotoPrivacyUnlocked && !isPhotoPrivacySupported)}
                    className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-white transition-colors hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-lg">
                      {isPhotoPrivacyUnlocked ? "lock" : "add_moderator"}
                    </span>
                    {isPhotoPrivacyUnlocked ? "Verrouiller" : "Ajouter cet appareil"}
                  </button>
                ) : null}

                {photoPrivacyEnabled ? (
                  <button
                    type="button"
                    onClick={onDisableProtection}
                    disabled={isPhotoPrivacyBusy}
                    className="flex h-11 items-center justify-center gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 text-sm font-bold text-rose-200 transition-colors hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-lg">lock_reset</span>
                    Desactiver
                  </button>
                ) : null}
              </div>

              {!isPhotoPrivacySupported ? (
                <p className="mt-3 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                  WebAuthn avec authenticator de plateforme n est pas disponible sur ce navigateur.
                </p>
              ) : null}

              {privacyError ? (
                <p className="mt-3 rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                  {privacyError}
                </p>
              ) : null}

              {privacySuccess ? (
                <p className="mt-3 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
                  {privacySuccess}
                </p>
              ) : null}
            </div>

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

                  if (!canViewPhotos) {
                    return (
                      <div
                        key={photo.id}
                        className="relative aspect-[3/4] overflow-hidden rounded-xl border border-white/5 bg-[linear-gradient(160deg,#16261d_0%,#101813_100%)]"
                      >
                        {photo.previewUrl ? (
                          <img
                            src={photo.previewUrl}
                            alt={`Photo de progression floutee ${index + 1}`}
                            className="h-full w-full scale-110 object-cover blur-2xl brightness-[0.55]"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(19,236,91,0.14),transparent_42%)]" />
                        )}
                        <div className="absolute inset-0 bg-black/20" />
                        <div className="absolute inset-x-4 top-4 h-24 rounded-2xl border border-white/5 bg-white/5 backdrop-blur-sm" />
                        <div className="absolute inset-x-4 top-9 flex items-center justify-center text-primary/80">
                          <span className="material-symbols-outlined text-4xl">lock</span>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                        <div className="absolute bottom-3 left-3 right-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/90">
                            {formatPhotoDate(photoMs)}
                          </p>
                          <p className="mt-1 text-sm font-bold text-white">
                            {(photo.weightKgSnapshot ?? currentWeightKg) !== null
                              ? `${formatWeightLabel(photo.weightKgSnapshot ?? currentWeightKg)} kg`
                              : "Poids non renseigne"}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-400">
                            Deverrouille pour afficher la photo
                          </p>
                        </div>
                      </div>
                    );
                  }

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

            {canViewPhotos && comparePhotos.length === 2 ? (
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
