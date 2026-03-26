import { useEffect, useMemo, useState } from "react";
import { ExercisePickerScreen } from "../ExercisePickerScreen/index.tsx";
import {
  ExerciseConfigScreen,
  type ExerciseConfig,
} from "../ExerciseConfigScreen/index.tsx";
import { estimateSessionMetrics } from "../../services/sessionEstimationService.ts";
import {
  createExercise,
  importSharedExerciseToUser,
  listExercises,
  listSharedExercises,
} from "../../services/firestoreService.ts";
import type { SessionEstimationInput } from "../../types/sessionEstimation.ts";
import type {
  CreateSessionScreenProps,
  ExerciseOption,
  SessionEstimate,
  SessionExerciseSelection,
  SharedExerciseOption,
} from "./types.ts";
import { SelectedExerciseList } from "./components/SelectedExerciseList.tsx";
import { SessionFooter } from "./components/SessionFooter.tsx";
import { SessionMetaForm } from "./components/SessionMetaForm.tsx";

export type { SessionConfig, SessionExerciseSelection } from "./types.ts";

export function CreateSessionScreen({
  userId,
  onBack,
  onSave,
  onDelete,
  mode = "create",
  initialConfig = null,
  isSubmitting = false,
  isDeleting = false,
  errorMessage = null,
}: CreateSessionScreenProps) {
  const isEditMode = mode === "edit";
  const [name, setName] = useState(initialConfig?.name ?? "Seance Haut du corps");
  const [gymName, setGymName] = useState(
    initialConfig?.gymName ?? "Keep Cool rue d'Alger",
  );
  const [isPublic, setIsPublic] = useState(initialConfig?.isPublic ?? false);
  const [availableExercises, setAvailableExercises] = useState<ExerciseOption[]>(
    [],
  );
  const [sharedExercises, setSharedExercises] = useState<SharedExerciseOption[]>(
    [],
  );
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>(
    initialConfig?.exercises.map((exercise) => exercise.id) ?? [],
  );
  const [isExercisePickerOpen, setIsExercisePickerOpen] = useState(false);
  const [isExerciseConfigOpen, setIsExerciseConfigOpen] = useState(false);
  const [isCreatingExercise, setIsCreatingExercise] = useState(false);
  const [exerciseCreateError, setExerciseCreateError] = useState<string | null>(
    null,
  );
  const [returnToPickerAfterExerciseConfig, setReturnToPickerAfterExerciseConfig] =
    useState(false);
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState("");
  const [isLoadingExercises, setIsLoadingExercises] = useState(true);
  const [isLoadingSharedExercises, setIsLoadingSharedExercises] = useState(true);
  const [importingSharedExerciseId, setImportingSharedExerciseId] = useState<string | null>(
    null,
  );
  const [sessionEstimate, setSessionEstimate] = useState<SessionEstimate | null>(
    null,
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const [visibilityStatusMessage, setVisibilityStatusMessage] = useState<string | null>(null);

  const initialExerciseById = useMemo(() => {
    const map = new Map<string, SessionExerciseSelection>();
    (initialConfig?.exercises ?? []).forEach((exercise) => {
      if (!map.has(exercise.id)) {
        map.set(exercise.id, exercise);
      }
    });
    return map;
  }, [initialConfig]);

  useEffect(() => {
    setName(initialConfig?.name ?? "Seance Haut du corps");
    setGymName(initialConfig?.gymName ?? "Keep Cool rue d'Alger");
    setIsPublic(initialConfig?.isPublic ?? false);
    setSelectedExerciseIds(initialConfig?.exercises.map((exercise) => exercise.id) ?? []);
    setLocalError(null);
    setVisibilityStatusMessage(null);
  }, [initialConfig, mode]);

  useEffect(() => {
    if (!visibilityStatusMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setVisibilityStatusMessage(null);
    }, 4200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [visibilityStatusMessage]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (isExerciseConfigOpen) {
          return;
        }
        if (isExercisePickerOpen) {
          setIsExercisePickerOpen(false);
          return;
        }
        onBack();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isExerciseConfigOpen, isExercisePickerOpen, onBack]);

  useEffect(() => {
    let cancelled = false;

    const loadExercises = async () => {
      setIsLoadingExercises(true);
      setIsLoadingSharedExercises(true);
      setLocalError(null);

      try {
        const [exercisesResult, sharedResult] = await Promise.allSettled([
          listExercises(userId),
          listSharedExercises(),
        ]);

        if (exercisesResult.status === "rejected") {
          throw new Error("user-exercises-load-failed");
        }

        const exercises = exercisesResult.value;
        const shared =
          sharedResult.status === "fulfilled" ? sharedResult.value : [];

        if (cancelled) {
          return;
        }

        setAvailableExercises(exercises);
        setSharedExercises(shared);
        if (sharedResult.status === "rejected") {
          setLocalError(
            "La bibliotheque partagee n a pas pu etre chargee. Verifie les regles Firestore et le projet Firebase.",
          );
        }
        setSelectedExerciseIds((previous) => {
          if (previous.length > 0) {
            return previous.filter((id) =>
              exercises.some((exercise) => exercise.id === id) ||
                initialExerciseById.has(id),
            );
          }

          if (initialConfig?.exercises.length) {
            return initialConfig.exercises.map((exercise) => exercise.id);
          }

          return exercises.slice(0, 3).map((exercise) => exercise.id);
        });
      } catch {
        if (!cancelled) {
          setLocalError(
            "Impossible de charger les exercices. Verifie ta connexion.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingExercises(false);
          setIsLoadingSharedExercises(false);
        }
      }
    };

    void loadExercises();

    return () => {
      cancelled = true;
    };
  }, [initialConfig, initialExerciseById, userId]);

  const selectedExercises = useMemo(() => {
    const byId = new Map(availableExercises.map((exercise) => [exercise.id, exercise]));

    return selectedExerciseIds.reduce<SessionExerciseSelection[]>((accumulator, exerciseId) => {
      const baseExercise = byId.get(exerciseId);
      const initialExercise = initialExerciseById.get(exerciseId);

      if (!baseExercise && !initialExercise) {
        return accumulator;
      }

      accumulator.push({
        id: exerciseId,
        name: initialExercise?.name ?? baseExercise?.name ?? "Exercice",
        trackingMode:
          initialExercise?.trackingMode ?? baseExercise?.trackingMode ?? "reps_only",
        defaultSets: initialExercise?.defaultSets ?? baseExercise?.defaultSets ?? 3,
        defaultReps: initialExercise?.defaultReps ?? baseExercise?.defaultReps ?? null,
        defaultWeightKg:
          initialExercise?.defaultWeightKg ?? baseExercise?.defaultWeightKg ?? null,
        defaultDurationSec:
          initialExercise?.defaultDurationSec ?? baseExercise?.defaultDurationSec ?? null,
        defaultRestSec:
          initialExercise?.defaultRestSec ?? baseExercise?.defaultRestSec ?? 30,
        instructions:
          initialExercise?.instructions ?? baseExercise?.instructions ?? null,
        isMachine: initialExercise?.isMachine ?? baseExercise?.isMachine ?? false,
        hasImage: initialExercise?.hasImage ?? baseExercise?.hasImage ?? false,
        hasVideo: initialExercise?.hasVideo ?? baseExercise?.hasVideo ?? false,
        media: initialExercise?.media ?? baseExercise?.media ?? null,
        source: initialExercise?.source ?? baseExercise?.source ?? null,
        sourceUrl: initialExercise?.sourceUrl ?? baseExercise?.sourceUrl ?? null,
        sourceId: initialExercise?.sourceId ?? baseExercise?.sourceId ?? null,
        license: initialExercise?.license ?? baseExercise?.license ?? null,
      });

      return accumulator;
    }, []);
  }, [availableExercises, initialExerciseById, selectedExerciseIds]);

  const estimationInput = useMemo<SessionEstimationInput>(
    () => ({
      gymName: gymName.trim() || "Salle",
      exercises: selectedExercises.map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
        trackingMode: exercise.trackingMode,
        targetSets: exercise.defaultSets,
        targetReps: exercise.defaultReps,
        targetWeightKg: exercise.defaultWeightKg,
        targetDurationSec: exercise.defaultDurationSec,
        restSec: exercise.defaultRestSec,
      })),
    }),
    [gymName, selectedExercises],
  );

  useEffect(() => {
    if (selectedExercises.length === 0 || isLoadingExercises) {
      setSessionEstimate(null);
      return;
    }

    let cancelled = false;

    const timer = window.setTimeout(() => {
      void estimateSessionMetrics(estimationInput)
        .then((estimate) => {
          if (!cancelled) {
            setSessionEstimate(estimate);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setSessionEstimate(null);
          }
        });
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [estimationInput, isLoadingExercises, selectedExercises.length]);

  const addExerciseById = (exerciseId: string) => {
    if (selectedExerciseIds.includes(exerciseId)) {
      return;
    }

    setSelectedExerciseIds((previous) => [...previous, exerciseId]);
    setLocalError(null);
  };

  const handleAddSharedExercise = async (
    sharedExerciseId: string,
  ): Promise<void> => {
    if (importingSharedExerciseId) {
      return;
    }

    setImportingSharedExerciseId(sharedExerciseId);
    setLocalError(null);

    try {
      const importedExerciseId = await importSharedExerciseToUser(
        userId,
        sharedExerciseId,
      );
      const exercises = await listExercises(userId);
      setAvailableExercises(exercises);
      setSelectedExerciseIds((previous) =>
        previous.includes(importedExerciseId)
          ? previous
          : [...previous, importedExerciseId],
      );
    } catch {
      setLocalError(
        "Impossible d importer cet exercice partage pour le moment.",
      );
    } finally {
      setImportingSharedExerciseId(null);
    }
  };

  const openExercisePicker = () => {
    setExerciseSearchQuery("");
    setIsExercisePickerOpen(true);
  };

  const closeExercisePicker = () => {
    setExerciseSearchQuery("");
    setIsExercisePickerOpen(false);
  };

  const handleCreateExerciseFromPicker = () => {
    setExerciseCreateError(null);
    closeExercisePicker();
    setReturnToPickerAfterExerciseConfig(true);
    setIsExerciseConfigOpen(true);
  };

  const handleBackFromExerciseConfig = () => {
    setIsExerciseConfigOpen(false);
    setExerciseCreateError(null);

    if (returnToPickerAfterExerciseConfig) {
      setReturnToPickerAfterExerciseConfig(false);
      setIsExercisePickerOpen(true);
    }
  };

  const handleCreateExerciseFromConfig = async (
    config: ExerciseConfig,
  ): Promise<void> => {
    if (isCreatingExercise) {
      return;
    }

    setIsCreatingExercise(true);
    setExerciseCreateError(null);

    try {
      const createdExerciseId = await createExercise(userId, {
        name: config.name,
        category: "personnalise",
        trackingMode: config.trackingMode,
        defaultSets: config.sets,
        defaultReps: config.reps,
        defaultWeightKg: config.weightKg,
        defaultDurationSec: config.durationSec,
        defaultRestSec: config.restSec,
      });

      const exercises = await listExercises(userId);
      setAvailableExercises(exercises);
      setSelectedExerciseIds((previous) =>
        previous.includes(createdExerciseId)
          ? previous
          : [...previous, createdExerciseId],
      );

      setIsExerciseConfigOpen(false);
      setReturnToPickerAfterExerciseConfig(false);
      setLocalError(null);
    } catch {
      setExerciseCreateError(
        "Impossible de creer l exercice pour le moment. Reessaie dans un instant.",
      );
    } finally {
      setIsCreatingExercise(false);
    }
  };

  const removeExercise = (exerciseId: string) => {
    setSelectedExerciseIds((previous) =>
      previous.filter((currentId) => currentId !== exerciseId),
    );
  };

  const moveExercise = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= selectedExerciseIds.length) {
      return;
    }

    setSelectedExerciseIds((previous) => {
      const copy = [...previous];
      const [moved] = copy.splice(index, 1);
      copy.splice(nextIndex, 0, moved);
      return copy;
    });
  };

  const handleSave = () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setLocalError("Le nom de la seance est obligatoire.");
      return;
    }

    if (selectedExercises.length === 0) {
      setLocalError("Ajoute au moins un exercice a la seance.");
      return;
    }

    setLocalError(null);
    void onSave({
      name: trimmedName,
      gymName: gymName.trim() || "Salle",
      isPublic,
      exercises: selectedExercises.map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
        trackingMode: exercise.trackingMode,
        defaultSets: exercise.defaultSets,
        defaultReps: exercise.defaultReps,
        defaultWeightKg: exercise.defaultWeightKg,
        defaultDurationSec: exercise.defaultDurationSec,
        defaultRestSec: exercise.defaultRestSec,
      })),
      estimatedDurationMin: sessionEstimate?.estimatedDurationMin ?? null,
      estimatedCaloriesKcal: sessionEstimate?.estimatedCaloriesKcal ?? null,
      estimationSource: sessionEstimate?.estimationSource ?? null,
    });
  };

  const handleTogglePublicVisibility = () => {
    setIsPublic((current) => {
      const next = !current;
      setVisibilityStatusMessage(
        next
          ? "Cette seance sera visible par tes amis apres sauvegarde."
          : null,
      );
      return next;
    });
  };

  const handleDelete = () => {
    if (!isEditMode || !onDelete) {
      return;
    }

    const shouldDelete = window.confirm(
      "Supprimer cette seance ? Cette action retirera la seance de votre liste.",
    );
    if (!shouldDelete) {
      return;
    }

    setLocalError(null);
    void onDelete();
  };

  const displayedError = localError ?? errorMessage;
  const isBusy =
    isSubmitting ||
    isDeleting ||
    isLoadingExercises ||
    Boolean(importingSharedExerciseId);

  return (
    <div className="fixed inset-0 z-[96] mx-auto flex min-h-screen w-full max-w-md flex-col bg-background-dark text-text-primary shadow-2xl">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/5 bg-background-dark/90 p-4 pb-2 backdrop-blur-md">
        <button
          type="button"
          onClick={onBack}
          className="flex h-12 w-12 shrink-0 items-center justify-start text-white transition-opacity hover:opacity-70"
          aria-label="Revenir au menu d ajout"
        >
          <span className="material-symbols-outlined text-3xl">arrow_back</span>
        </button>
        <h2 className="flex-1 text-center text-lg font-bold tracking-tight text-white">
          {isEditMode ? "Modifier une seance" : "Creer une seance"}
        </h2>
        <button
          type="button"
          onClick={handleSave}
          disabled={isBusy}
          className="flex w-12 items-center justify-end text-base font-bold tracking-wide text-primary transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Sauver
        </button>
      </header>

      <main className="hide-scrollbar flex flex-1 flex-col gap-6 overflow-y-auto p-4 pb-32">
        <section className="rounded-2xl border border-primary/15 bg-card-dark/80 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">
                  {isPublic ? "public" : "lock"}
                </span>
                <p className="text-sm font-black uppercase tracking-[0.14em] text-white">
                  {isPublic ? "Publique" : "Privee"}
                </p>
              </div>
              <p className="mt-2 text-sm text-slate-300">
                {isPublic
                  ? "Tes amis pourront voir cette seance dans l onglet social et la copier."
                  : "Privee par defaut. Active le partage pour la rendre visible a tes amis."}
              </p>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={isPublic}
              onClick={handleTogglePublicVisibility}
              className={`relative flex h-9 w-16 shrink-0 items-center rounded-full border transition-colors ${
                isPublic
                  ? "border-primary/40 bg-primary/20"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <span
                className={`absolute h-7 w-7 rounded-full bg-white shadow-md transition-transform ${
                  isPublic ? "translate-x-8" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {visibilityStatusMessage ? (
            <div className="mt-4 rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-primary">
              {visibilityStatusMessage}
            </div>
          ) : null}
        </section>

        <SessionMetaForm
          name={name}
          gymName={gymName}
          onNameChange={setName}
          onGymNameChange={setGymName}
        />

        <div className="my-2 h-px w-full bg-white/5" />

        <SelectedExerciseList
          selectedExercises={selectedExercises}
          isLoadingExercises={isLoadingExercises}
          onOpenExercisePicker={openExercisePicker}
          onMoveExercise={moveExercise}
          onRemoveExercise={removeExercise}
        />
      </main>

      {isExercisePickerOpen ? (
        <ExercisePickerScreen
          userExercises={availableExercises}
          sharedExercises={sharedExercises}
          selectedExerciseIds={selectedExerciseIds}
          searchQuery={exerciseSearchQuery}
          isLoadingUserExercises={isLoadingExercises}
          isLoadingSharedExercises={isLoadingSharedExercises}
          importingSharedExerciseId={importingSharedExerciseId}
          onSearchChange={setExerciseSearchQuery}
          onClose={closeExercisePicker}
          onAddExercise={addExerciseById}
          onAddSharedExercise={handleAddSharedExercise}
          onCreateExercise={handleCreateExerciseFromPicker}
        />
      ) : null}

      {isExerciseConfigOpen ? (
        <ExerciseConfigScreen
          onBack={handleBackFromExerciseConfig}
          onCreate={handleCreateExerciseFromConfig}
          isSubmitting={isCreatingExercise}
          errorMessage={exerciseCreateError}
          zIndexClass="z-[102]"
        />
      ) : null}

      <SessionFooter
        displayedError={displayedError}
        isBusy={isBusy}
        isSubmitting={isSubmitting}
        isEditMode={isEditMode}
        isDeleting={isDeleting}
        canDelete={isEditMode && Boolean(onDelete)}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
  );
}
