import { useMemo, useState } from "react";
import type { TrackingMode } from "../../types/firestore.ts";
import type { ExercisePickerScreenProps } from "./types.ts";

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function formatCategory(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "Categorie libre";
  }

  const withSpaces = trimmed.replace(/[_-]+/g, " ");
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

function getTrackingIcon(mode: TrackingMode): string {
  if (mode === "duration_only") {
    return "timer";
  }
  if (mode === "reps_only") {
    return "repeat";
  }
  return "fitness_center";
}

function getTrackingLabel(mode: TrackingMode): string {
  if (mode === "duration_only") {
    return "Duree";
  }
  if (mode === "reps_only") {
    return "Repetitions";
  }
  return "Force";
}

function getSourceLabel(source: string): string {
  if (source === "wger") {
    return "Wger";
  }
  return source.charAt(0).toUpperCase() + source.slice(1);
}

type ExerciseCardItem = {
  id: string;
  name: string;
  category: string;
  trackingMode: TrackingMode;
  instructions?: string | null;
  isMachine?: boolean;
  hasImage?: boolean;
  hasVideo?: boolean;
  media?: {
    imageUrl: string | null;
    videoUrl: string | null;
  } | null;
  source?: string | null;
};

function getInstructionPreview(value: string | null | undefined): string | null {
  const trimmed = value?.replace(/\s+/g, " ").trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.length > 120 ? `${trimmed.slice(0, 117)}...` : trimmed;
}

function getPreviewImageUrl(exercise: ExerciseCardItem): string | null {
  return exercise.media?.imageUrl ?? null;
}

interface ExerciseCardProps {
  exercise: ExerciseCardItem;
  actionLabel: string;
  actionIcon: string;
  disabled: boolean;
  onAction: () => void;
  showSourceBadge?: boolean;
}

function ExerciseCard({
  exercise,
  actionLabel,
  actionIcon,
  disabled,
  onAction,
  showSourceBadge = false,
}: ExerciseCardProps) {
  const imageUrl = getPreviewImageUrl(exercise);
  const instructionPreview = getInstructionPreview(exercise.instructions);
  const hasMedia = exercise.hasImage || exercise.hasVideo;

  return (
    <article
      className="group relative flex items-center gap-4 rounded-xl border border-white/5 bg-card-dark p-3 shadow-sm transition-all active:scale-[0.99]"
    >
      {imageUrl ? (
        <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-[#223727]">
          <img
            src={imageUrl}
            alt={exercise.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
          {exercise.hasVideo ? (
            <div className="absolute bottom-1 right-1 flex size-6 items-center justify-center rounded-full bg-black/70 text-white">
              <span className="material-symbols-outlined text-sm">play_arrow</span>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-[#223727] text-primary">
          <span className="material-symbols-outlined text-2xl">
            {getTrackingIcon(exercise.trackingMode)}
          </span>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-bold text-white">{exercise.name}</p>
        <p className="truncate text-sm font-medium text-slate-400">
          {formatCategory(exercise.category)}, {getTrackingLabel(exercise.trackingMode)}
        </p>
        {instructionPreview ? (
          <p className="mt-1 overflow-hidden text-xs leading-5 text-slate-500 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
            {instructionPreview}
          </p>
        ) : null}
        {showSourceBadge || exercise.isMachine || hasMedia ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {showSourceBadge && exercise.source ? (
              <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs text-primary">
                {getSourceLabel(exercise.source)}
              </span>
            ) : null}
            {exercise.isMachine ? (
              <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-xs text-emerald-300">
                Machine
              </span>
            ) : null}
            {hasMedia ? (
              <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-xs text-cyan-300">
                {exercise.hasVideo ? "Video" : "Image"}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onAction}
        disabled={disabled}
        className={`flex size-10 shrink-0 items-center justify-center rounded-full transition-all ${
          disabled
            ? "cursor-not-allowed bg-primary text-slate-900"
            : "bg-primary/10 text-primary hover:bg-primary hover:text-slate-900"
        }`}
        aria-label={actionLabel}
      >
        <span className="material-symbols-outlined">{actionIcon}</span>
      </button>
    </article>
  );
}

export function ExercisePickerScreen({
  userExercises,
  sharedExercises,
  selectedExerciseIds,
  searchQuery,
  isLoadingUserExercises,
  isLoadingSharedExercises,
  importingSharedExerciseId,
  onSearchChange,
  onClose,
  onAddExercise,
  onAddSharedExercise,
  onCreateExercise,
}: ExercisePickerScreenProps) {
  const [activeTab, setActiveTab] = useState<"user" | "shared">("user");
  const [showMachineOnly, setShowMachineOnly] = useState(false);
  const [showMediaOnly, setShowMediaOnly] = useState(false);

  const selectedIds = useMemo(
    () => new Set(selectedExerciseIds),
    [selectedExerciseIds],
  );

  const filteredUserExercises = useMemo(() => {
    const query = normalize(searchQuery);

    if (!query) {
      return userExercises;
    }

    return userExercises.filter((exercise) => {
      const haystack = normalize(
        `${exercise.name} ${exercise.category} ${getTrackingLabel(exercise.trackingMode)}`,
      );
      return haystack.includes(query);
    });
  }, [searchQuery, userExercises]);

  const filteredSharedExercises = useMemo(() => {
    const query = normalize(searchQuery);

    return sharedExercises.filter((exercise) => {
      if (showMachineOnly && !exercise.isMachine) {
        return false;
      }
      if (showMediaOnly && !exercise.hasImage && !exercise.hasVideo) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = normalize(
        `${exercise.name} ${exercise.category} ${exercise.source} ${getTrackingLabel(exercise.trackingMode)}`,
      );
      return haystack.includes(query);
    });
  }, [searchQuery, sharedExercises, showMachineOnly, showMediaOnly]);

  return (
    <div className="fixed inset-0 z-[98] mx-auto flex min-h-screen w-full max-w-md flex-col bg-background-dark text-text-primary shadow-2xl">
      <header className="sticky top-0 z-20 flex flex-col border-b border-white/5 bg-background-dark/90 backdrop-blur-md">
        <div className="flex items-center justify-between p-4 pb-2">
          <button
            type="button"
            onClick={onClose}
            className="flex size-12 shrink-0 items-center justify-start text-white transition-opacity hover:opacity-70"
            aria-label="Fermer la selection d exercices"
          >
            <span className="material-symbols-outlined text-3xl">close</span>
          </button>

          <h2 className="flex-1 text-center text-lg font-bold tracking-tight text-white">
            Selectionner un exercice
          </h2>

          <div className="flex w-12 items-center justify-end" />
        </div>

        <div className="px-4 pb-3">
          <div className="relative flex items-center">
            <span className="material-symbols-outlined pointer-events-none absolute left-4 text-slate-400">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={
                activeTab === "shared"
                  ? "Rechercher dans la bibliotheque"
                  : "Rechercher un exercice"
              }
              className="h-12 w-full rounded-xl border border-primary/20 bg-[#1c2e21] pl-12 pr-4 text-base text-white transition-colors placeholder:text-slate-500 focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="px-4 pb-4">
          <div className="flex rounded-xl bg-card-dark p-1">
            <button
              type="button"
              onClick={() => setActiveTab("user")}
              className={`h-10 flex-1 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === "user"
                  ? "bg-primary text-slate-900"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Mes exercices
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("shared")}
              className={`h-10 flex-1 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === "shared"
                  ? "bg-primary text-slate-900"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Bibliotheque partagee
            </button>
          </div>
        </div>

        {activeTab === "shared" ? (
          <div className="flex items-center gap-2 px-4 pb-4">
            <button
              type="button"
              onClick={() => setShowMachineOnly((value) => !value)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                showMachineOnly
                  ? "border-primary bg-primary text-slate-900"
                  : "border-white/15 text-slate-300 hover:border-white/30"
              }`}
            >
              Machine
            </button>
            <button
              type="button"
              onClick={() => setShowMediaOnly((value) => !value)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                showMediaOnly
                  ? "border-primary bg-primary text-slate-900"
                  : "border-white/15 text-slate-300 hover:border-white/30"
              }`}
            >
              Avec medias
            </button>
          </div>
        ) : null}
      </header>

      <main className="hide-scrollbar flex flex-1 flex-col gap-6 overflow-y-auto p-4 pb-32">
        {activeTab === "user" ? (
          <section className="flex flex-col gap-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Mes exercices
            </h3>

            {isLoadingUserExercises ? (
              <div className="rounded-xl border border-white/10 bg-card-dark p-4 text-sm text-text-secondary">
                Chargement des exercices...
              </div>
            ) : null}

            {!isLoadingUserExercises && filteredUserExercises.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-card-dark p-4 text-sm text-text-secondary">
                Aucun exercice ne correspond a votre recherche.
              </div>
            ) : null}

            <div className="flex flex-col gap-3">
              {filteredUserExercises.map((exercise) => {
                const isSelected = selectedIds.has(exercise.id);

                return (
                  <ExerciseCard
                    key={exercise.id}
                    exercise={exercise}
                    actionLabel={
                      isSelected
                        ? `${exercise.name} deja ajoute`
                        : `Ajouter ${exercise.name}`
                    }
                    actionIcon={isSelected ? "check" : "add"}
                    disabled={isSelected}
                    onAction={() => onAddExercise(exercise.id)}
                    showSourceBadge={Boolean(exercise.source)}
                  />
                );
              })}
            </div>
          </section>
        ) : (
          <section className="flex flex-col gap-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Bibliotheque partagee
            </h3>

            {isLoadingSharedExercises ? (
              <div className="rounded-xl border border-white/10 bg-card-dark p-4 text-sm text-text-secondary">
                Chargement de la bibliotheque partagee...
              </div>
            ) : null}

            {!isLoadingSharedExercises && filteredSharedExercises.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-card-dark p-4 text-sm text-text-secondary">
                Aucun exercice partage ne correspond aux filtres.
              </div>
            ) : null}

            <div className="flex flex-col gap-3">
              {filteredSharedExercises.map((exercise) => {
                const isImporting = importingSharedExerciseId === exercise.id;

                return (
                  <ExerciseCard
                    key={exercise.id}
                    exercise={exercise}
                    actionLabel={
                      isImporting ? "Import en cours" : `Importer ${exercise.name}`
                    }
                    actionIcon={isImporting ? "hourglass_top" : "add"}
                    disabled={isImporting}
                    onAction={() => void onAddSharedExercise(exercise.id)}
                    showSourceBadge
                  />
                );
              })}
            </div>
          </section>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-20 mx-auto w-full max-w-md border-t border-white/5 bg-background-dark/95 p-4 backdrop-blur-lg">
        <button
          type="button"
          onClick={onCreateExercise}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-primary/30 text-lg font-bold text-primary transition-all hover:bg-primary/5 active:scale-[0.98]"
        >
          <span className="material-symbols-outlined">add_circle</span>
          Creer un nouvel exercice
        </button>
      </div>
    </div>
  );
}
