import { useEffect, useMemo, useState } from "react";
import { ExercisePickerScreen } from "./ExercisePickerScreen.tsx";
import { estimateSessionMetrics } from "../services/sessionEstimationService.ts";
import { listExercises } from "../services/firestoreService.ts";
import type { EstimationSource } from "../types/firestore.ts";
import type { SessionEstimationInput } from "../types/sessionEstimation.ts";
import type { ExerciseDoc, TrackingMode } from "../types/firestore.ts";

type ExerciseOption = ExerciseDoc & { id: string };

export interface SessionExerciseSelection {
  id: string;
  name: string;
  trackingMode: TrackingMode;
  defaultSets: number;
  defaultReps: number | null;
  defaultWeightKg: number | null;
  defaultDurationSec: number | null;
  defaultRestSec: number;
}

export interface SessionConfig {
  name: string;
  gymName: string;
  exercises: SessionExerciseSelection[];
  estimatedDurationMin: number | null;
  estimatedCaloriesKcal: number | null;
  estimationSource: EstimationSource | null;
}

interface CreateSessionScreenProps {
  userId: string;
  onBack: () => void;
  onSave: (config: SessionConfig) => Promise<void> | void;
  isSubmitting?: boolean;
  errorMessage?: string | null;
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

function getExerciseTarget(exercise: SessionExerciseSelection): string {
  if (exercise.trackingMode === "duration_only") {
    return `${exercise.defaultDurationSec ?? 30} sec`;
  }

  if (exercise.defaultReps !== null) {
    return `${exercise.defaultReps} reps`;
  }

  return "Objectif libre";
}

export function CreateSessionScreen({
  userId,
  onBack,
  onSave,
  isSubmitting = false,
  errorMessage = null,
}: CreateSessionScreenProps) {
  const [name, setName] = useState("Seance Haut du corps");
  const [gymName, setGymName] = useState("Keep Cool rue d'Alger");
  const [availableExercises, setAvailableExercises] = useState<ExerciseOption[]>(
    [],
  );
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);
  const [isExercisePickerOpen, setIsExercisePickerOpen] = useState(false);
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState("");
  const [isLoadingExercises, setIsLoadingExercises] = useState(true);
  const [sessionEstimate, setSessionEstimate] = useState<{
    estimatedDurationMin: number;
    estimatedCaloriesKcal: number;
    estimationSource: EstimationSource;
  } | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
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
  }, [isExercisePickerOpen, onBack]);

  useEffect(() => {
    let cancelled = false;

    const loadExercises = async () => {
      setIsLoadingExercises(true);
      setLocalError(null);

      try {
        const exercises = await listExercises(userId);

        if (cancelled) {
          return;
        }

        setAvailableExercises(exercises);
        setSelectedExerciseIds((previous) => {
          if (previous.length > 0) {
            return previous.filter((id) =>
              exercises.some((exercise) => exercise.id === id),
            );
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
        }
      }
    };

    void loadExercises();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const selectedExercises = useMemo(() => {
    const byId = new Map(availableExercises.map((exercise) => [exercise.id, exercise]));

    return selectedExerciseIds
      .map((exerciseId) => byId.get(exerciseId))
      .filter((exercise): exercise is ExerciseOption => Boolean(exercise));
  }, [availableExercises, selectedExerciseIds]);

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

  const openExercisePicker = () => {
    setExerciseSearchQuery("");
    setIsExercisePickerOpen(true);
  };

  const closeExercisePicker = () => {
    setExerciseSearchQuery("");
    setIsExercisePickerOpen(false);
  };

  const handleCreateExerciseFromPicker = () => {
    closeExercisePicker();
    setLocalError(
      "Pour creer un nouvel exercice, passe par le menu Ajouter puis Nouvel exercice.",
    );
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

  const displayedError = localError ?? errorMessage;

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
          Creer une seance
        </h2>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSubmitting || isLoadingExercises}
          className="flex w-12 items-center justify-end text-base font-bold tracking-wide text-primary transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Sauver
        </button>
      </header>

      <main className="hide-scrollbar flex flex-1 flex-col gap-6 overflow-y-auto p-4 pb-32">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label htmlFor="session-name" className="text-base font-medium text-slate-200">
              Nom de la seance
            </label>
            <input
              id="session-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="ex: Seance Keep Cool"
              className="h-14 w-full rounded-xl border border-primary/20 bg-[#1c2e21] px-4 text-base text-white transition-colors placeholder:text-slate-500 focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="session-gym" className="text-base font-medium text-slate-200">
              Lieu
            </label>
            <div className="relative flex items-center">
              <input
                id="session-gym"
                type="text"
                value={gymName}
                onChange={(event) => setGymName(event.target.value)}
                placeholder="ex: Basic Fit"
                className="h-14 w-full rounded-xl border border-primary/20 bg-[#1c2e21] px-4 pr-12 text-base text-white transition-colors placeholder:text-slate-500 focus:border-primary focus:ring-1 focus:ring-primary"
              />
              <div className="pointer-events-none absolute right-4 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">location_on</span>
              </div>
            </div>
          </div>
        </div>

        <div className="my-2 h-px w-full bg-white/5" />

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white">Exercices</h3>
            <button
              type="button"
              onClick={openExercisePicker}
              disabled={isLoadingExercises}
              className="group flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-xl text-primary transition-transform group-hover:scale-110">
                add_circle
              </span>
              <span className="text-sm font-bold text-primary">Ajouter</span>
            </button>
          </div>

          {isLoadingExercises ? (
            <div className="rounded-xl border border-white/10 bg-card-dark p-4 text-sm text-text-secondary">
              Chargement des exercices...
            </div>
          ) : null}

          <div className="flex flex-col gap-3">
            {selectedExercises.map((exercise, index) => (
              <article
                key={exercise.id}
                className="group relative flex items-center gap-3 rounded-xl border border-white/5 bg-[#1c2e21] p-3 shadow-sm"
              >
                <div className="flex shrink-0 flex-col items-center gap-1 text-slate-500">
                  <button
                    type="button"
                    onClick={() => moveExercise(index, -1)}
                    disabled={index === 0}
                    className="rounded p-0.5 transition-colors hover:text-slate-300 disabled:opacity-30"
                    aria-label={`Monter ${exercise.name}`}
                  >
                    <span className="material-symbols-outlined text-[16px]">arrow_drop_up</span>
                  </button>
                  <span className="material-symbols-outlined text-[20px]">
                    drag_indicator
                  </span>
                  <button
                    type="button"
                    onClick={() => moveExercise(index, 1)}
                    disabled={index === selectedExercises.length - 1}
                    className="rounded p-0.5 transition-colors hover:text-slate-300 disabled:opacity-30"
                    aria-label={`Descendre ${exercise.name}`}
                  >
                    <span className="material-symbols-outlined text-[16px]">arrow_drop_down</span>
                  </button>
                </div>

                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/15 text-primary">
                  <span className="material-symbols-outlined">fitness_center</span>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-bold text-white">{exercise.name}</p>
                  <p className="truncate text-sm font-medium text-slate-400">
                    {getTrackingLabel(exercise.trackingMode)}
                  </p>
                  <div className="mt-1 flex gap-2">
                    <span className="rounded-md bg-white/5 px-2 py-0.5 text-xs text-slate-300">
                      {exercise.defaultSets} series
                    </span>
                    <span className="rounded-md bg-white/5 px-2 py-0.5 text-xs text-slate-300">
                      {getExerciseTarget(exercise)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeExercise(exercise.id)}
                  className="shrink-0 p-2 text-slate-500 transition-colors hover:text-primary"
                  aria-label={`Retirer ${exercise.name}`}
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </article>
            ))}

            {!isLoadingExercises && selectedExercises.length === 0 ? (
              <button
                type="button"
                onClick={openExercisePicker}
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/10 py-6 transition-colors hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-slate-500">add</span>
                <span className="text-sm font-medium text-slate-500">
                  Ajouter un exercice
                </span>
              </button>
            ) : null}
          </div>
        </section>
      </main>

      {isExercisePickerOpen ? (
        <ExercisePickerScreen
          exercises={availableExercises}
          selectedExerciseIds={selectedExerciseIds}
          searchQuery={exerciseSearchQuery}
          isLoading={isLoadingExercises}
          onSearchChange={setExerciseSearchQuery}
          onClose={closeExercisePicker}
          onAddExercise={addExerciseById}
          onCreateExercise={handleCreateExerciseFromPicker}
        />
      ) : null}

      <div className="fixed bottom-0 left-0 right-0 z-20 mx-auto w-full max-w-md border-t border-white/5 bg-background-dark/95 p-4 backdrop-blur-lg">
        {displayedError ? (
          <p className="mb-3 rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {displayedError}
          </p>
        ) : null}

        <button
          type="button"
          onClick={handleSave}
          disabled={isSubmitting || isLoadingExercises}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-lg font-bold text-slate-900 shadow-[0_0_20px_rgba(19,236,91,0.3)] transition-all active:scale-[0.98] hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <span className="material-symbols-outlined">save</span>
          {isSubmitting ? "Enregistrement..." : "Enregistrer la seance"}
        </button>
      </div>
    </div>
  );
}
