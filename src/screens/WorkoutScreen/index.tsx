import { useEffect, useMemo, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { WorkoutPlanCard } from "../../components/WorkoutPlanCard.tsx";
import {
  createExercise,
  deleteExercise,
  listExercises,
  listOwnSharedPlans,
  listPlanItems,
  listPlans,
  publishPlanForFriends,
  unpublishPlanForFriends,
  updateExercise,
} from "../../services/firestoreService.ts";
import {
  ExerciseConfigScreen,
  type ExerciseConfig,
} from "../ExerciseConfigScreen/index.tsx";
import type {
  PlanCard,
  WorkoutExerciseCard,
  WorkoutPlanExercise,
  WorkoutPlanToStart,
  WorkoutScreenProps,
  WorkoutScreenTab,
} from "./types.ts";
import { normalizeGymLabel } from "./utils.ts";

export type { WorkoutPlanExercise, WorkoutPlanToStart } from "./types.ts";

function getExerciseIcon(trackingMode: WorkoutExerciseCard["trackingMode"]): string {
  if (trackingMode === "duration_only") {
    return "self_improvement";
  }

  return "fitness_center";
}

function formatExerciseCategory(category: string): string {
  const normalized = category.trim().replace(/[_-]+/g, " ");

  if (!normalized) {
    return "Personnalise";
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function getExerciseHighlights(exercise: WorkoutExerciseCard): string[] {
  const highlights = [`${Math.max(1, exercise.defaultSets)} series`];

  if (exercise.trackingMode === "duration_only") {
    highlights.push(`${Math.max(5, exercise.defaultDurationSec ?? 40)} sec effort`);
  } else {
    highlights.push(`${Math.max(1, exercise.defaultReps ?? 12)} reps`);
  }

  if (exercise.trackingMode === "weight_reps" && (exercise.defaultWeightKg ?? 0) > 0) {
    highlights.push(`${exercise.defaultWeightKg} kg`);
  }

  highlights.push(`${Math.max(0, exercise.defaultRestSec)} sec repos`);

  if (exercise.isMachine) {
    highlights.push("Machine");
  }

  return highlights;
}

function toExerciseConfig(exercise: WorkoutExerciseCard): ExerciseConfig {
  return {
    name: exercise.name,
    sets: exercise.defaultSets,
    trackingMode: exercise.trackingMode,
    reps: exercise.defaultReps,
    durationSec: exercise.defaultDurationSec,
    weightKg: exercise.defaultWeightKg,
    restSec: exercise.defaultRestSec,
  };
}

function buildExercisePayload(
  config: ExerciseConfig,
  existingExercise?: WorkoutExerciseCard | null,
) {
  return {
    name: config.name,
    category: existingExercise?.category ?? "personnalise",
    trackingMode: config.trackingMode,
    defaultSets: config.sets,
    defaultReps: config.reps,
    defaultWeightKg: config.weightKg,
    defaultDurationSec: config.durationSec,
    defaultRestSec: config.restSec,
    isActive: existingExercise?.isActive ?? true,
    sourceSharedExerciseId: existingExercise?.sourceSharedExerciseId ?? null,
    instructions: existingExercise?.instructions ?? null,
    isMachine: existingExercise?.isMachine ?? false,
    hasImage: existingExercise?.hasImage ?? false,
    hasVideo: existingExercise?.hasVideo ?? false,
    media: existingExercise?.media ?? null,
    source: existingExercise?.source ?? null,
    sourceUrl: existingExercise?.sourceUrl ?? null,
    sourceId: existingExercise?.sourceId ?? null,
    license: existingExercise?.license ?? null,
  };
}

function onExerciseCardKeyDown(
  event: ReactKeyboardEvent<HTMLElement>,
  onOpen: () => void,
) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    onOpen();
  }
}

export function WorkoutScreen({
  userId,
  onCreateSession,
  onStartPlan,
  onEditPlan,
  refreshKey = 0,
}: WorkoutScreenProps) {
  const [activeTab, setActiveTab] = useState<WorkoutScreenTab>("plans");
  const [plans, setPlans] = useState<PlanCard[]>([]);
  const [exercises, setExercises] = useState<WorkoutExerciseCard[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [isLoadingExercises, setIsLoadingExercises] = useState(true);
  const [planErrorMessage, setPlanErrorMessage] = useState<string | null>(null);
  const [exerciseLoadErrorMessage, setExerciseLoadErrorMessage] = useState<string | null>(
    null,
  );
  const [isExerciseConfigOpen, setIsExerciseConfigOpen] = useState(false);
  const [exerciseConfigMode, setExerciseConfigMode] = useState<"create" | "edit">(
    "create",
  );
  const [editingExercise, setEditingExercise] = useState<WorkoutExerciseCard | null>(
    null,
  );
  const [isSavingExercise, setIsSavingExercise] = useState(false);
  const [isDeletingExercise, setIsDeletingExercise] = useState(false);
  const [exerciseConfigErrorMessage, setExerciseConfigErrorMessage] = useState<
    string | null
  >(null);
  const [shareProcessingPlanId, setShareProcessingPlanId] = useState<string | null>(null);
  const [shareStatusMessage, setShareStatusMessage] = useState<string | null>(null);
  const [shareErrorMessage, setShareErrorMessage] = useState<string | null>(null);
  const [localRefreshKey, setLocalRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const exerciseDocsPromise = listExercises(userId, 300, true);

    const loadExercises = async () => {
      setIsLoadingExercises(true);
      setExerciseLoadErrorMessage(null);

      try {
        const exerciseDocs = await exerciseDocsPromise;

        if (!cancelled) {
          setExercises(exerciseDocs.filter((exercise) => exercise.isActive));
        }
      } catch {
        if (!cancelled) {
          setExercises([]);
          setExerciseLoadErrorMessage(
            "Impossible de charger vos exercices pour le moment. Reessayez dans un instant.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingExercises(false);
        }
      }
    };

    const loadPlans = async () => {
      setIsLoadingPlans(true);
      setPlanErrorMessage(null);

      try {
        const [planDocs, exerciseDocs, sharedPlans] = await Promise.all([
          listPlans(userId, 30),
          exerciseDocsPromise.catch(() => []),
          listOwnSharedPlans(userId, 100).catch(() => []),
        ]);
        const exerciseById = new Map(exerciseDocs.map((exercise) => [exercise.id, exercise]));
        const sharedPlanSourceIds = new Set(sharedPlans.map((sharedPlan) => sharedPlan.sourcePlanId));

        const planCards = await Promise.all(
          planDocs.map(async (plan) => {
            const items = await listPlanItems(userId, plan.id, 40);
            const sortedItems = items.slice().sort((a, b) => a.order - b.order);

            const planExercises = sortedItems.map((item, index) => {
              const linkedExercise = exerciseById.get(item.exerciseId);
              const exerciseName = linkedExercise?.name ?? "Exercice";
              const trackingMode = linkedExercise?.trackingMode ?? "reps_only";

              return {
                key: `${item.exerciseId}-${item.order}-${index}`,
                exerciseId: item.exerciseId,
                exerciseName,
                order: item.order,
                trackingMode,
                targetSets: Math.max(1, item.targetSets),
                targetReps: item.targetReps ?? null,
                targetWeightKg: item.targetWeightKg ?? null,
                targetDurationSec: item.targetDurationSec ?? null,
                restSec: Math.max(0, item.restSec),
                instructions: linkedExercise?.instructions ?? null,
                isMachine: linkedExercise?.isMachine ?? false,
                hasImage: linkedExercise?.hasImage ?? false,
                hasVideo: linkedExercise?.hasVideo ?? false,
                media: linkedExercise?.media ?? null,
                source: linkedExercise?.source ?? null,
                sourceUrl: linkedExercise?.sourceUrl ?? null,
                sourceId: linkedExercise?.sourceId ?? null,
                license: linkedExercise?.license ?? null,
              } satisfies WorkoutPlanExercise;
            });

            return {
              id: plan.id,
              name: plan.name,
              gymName: normalizeGymLabel(plan.gymName),
              estimatedDurationMin: plan.estimatedDurationMin ?? null,
              estimatedCaloriesKcal: plan.estimatedCaloriesKcal ?? null,
              estimationSource: plan.estimationSource ?? null,
              exerciseCount: planExercises.length,
              exerciseNames: planExercises.map((exercise) => exercise.exerciseName),
              exercises: planExercises,
              isSharedWithFriends: sharedPlanSourceIds.has(plan.id),
            } satisfies PlanCard;
          }),
        );

        if (!cancelled) {
          setPlans(planCards);
          setShareErrorMessage(null);
        }
      } catch {
        if (!cancelled) {
          setPlans([]);
          setPlanErrorMessage(
            "Impossible de charger vos seances pour le moment. Reessayez dans un instant.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingPlans(false);
        }
      }
    };

    void loadExercises();
    void loadPlans();

    return () => {
      cancelled = true;
    };
  }, [localRefreshKey, refreshKey, userId]);

  const hasPlans = useMemo(() => plans.length > 0, [plans.length]);
  const hasExercises = useMemo(() => exercises.length > 0, [exercises.length]);
  const isPlansTab = activeTab === "plans";
  const headerTitle = isPlansTab ? "Mes Seances" : "Mes Exercices";
  const headerSubtitle = isPlansTab
    ? "Pret pour votre entrainement ?"
    : "Gerez votre bibliotheque d exercices";

  const onPlanCardKeyDown = (
    event: ReactKeyboardEvent<HTMLElement>,
    plan: WorkoutPlanToStart,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onEditPlan(plan);
    }
  };

  const openCreateExercise = () => {
    setExerciseConfigMode("create");
    setEditingExercise(null);
    setExerciseConfigErrorMessage(null);
    setIsExerciseConfigOpen(true);
  };

  const openEditExercise = (exercise: WorkoutExerciseCard) => {
    setExerciseConfigMode("edit");
    setEditingExercise(exercise);
    setExerciseConfigErrorMessage(null);
    setIsExerciseConfigOpen(true);
  };

  const closeExerciseConfig = () => {
    setIsExerciseConfigOpen(false);
    setEditingExercise(null);
    setExerciseConfigErrorMessage(null);
  };

  const handleTogglePlanSharing = async (plan: PlanCard): Promise<void> => {
    if (shareProcessingPlanId) {
      return;
    }

    setShareProcessingPlanId(plan.id);
    setShareStatusMessage(null);
    setShareErrorMessage(null);

    try {
      if (plan.isSharedWithFriends) {
        await unpublishPlanForFriends(userId, plan.id);
        setPlans((previous) =>
          previous.map((entry) =>
            entry.id === plan.id ? { ...entry, isSharedWithFriends: false } : entry,
          ),
        );
        setShareStatusMessage(
          `"${plan.name}" n est plus visible par tes amis.`,
        );
      } else {
        await publishPlanForFriends(userId, plan.id);
        setPlans((previous) =>
          previous.map((entry) =>
            entry.id === plan.id ? { ...entry, isSharedWithFriends: true } : entry,
          ),
        );
        setShareStatusMessage(
          `"${plan.name}" est maintenant visible dans l espace social de tes amis.`,
        );
      }
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Impossible de mettre a jour la visibilite de cette seance.";
      setShareErrorMessage(message);
    } finally {
      setShareProcessingPlanId(null);
    }
  };

  const handleSubmitExerciseConfig = async (config: ExerciseConfig): Promise<void> => {
    if (isSavingExercise) {
      return;
    }

    setIsSavingExercise(true);
    setExerciseConfigErrorMessage(null);

    try {
      if (exerciseConfigMode === "edit" && editingExercise) {
        await updateExercise(
          userId,
          editingExercise.id,
          buildExercisePayload(config, editingExercise),
        );
      } else {
        await createExercise(userId, buildExercisePayload(config));
      }

      closeExerciseConfig();
      setLocalRefreshKey((value) => value + 1);
    } catch {
      setExerciseConfigErrorMessage(
        exerciseConfigMode === "edit"
          ? "Impossible de mettre a jour l exercice pour le moment. Reessaie dans un instant."
          : "Impossible de creer l exercice pour le moment. Reessaie dans un instant.",
      );
    } finally {
      setIsSavingExercise(false);
    }
  };

  const handleDeleteExercise = async (): Promise<void> => {
    if (!editingExercise || isDeletingExercise) {
      return;
    }

    const shouldDelete = window.confirm(
      `Supprimer ${editingExercise.name} ? Cet exercice n apparaitra plus dans votre bibliotheque.`,
    );

    if (!shouldDelete) {
      return;
    }

    setIsDeletingExercise(true);
    setExerciseConfigErrorMessage(null);

    try {
      await deleteExercise(userId, editingExercise.id);
      closeExerciseConfig();
      setLocalRefreshKey((value) => value + 1);
    } catch {
      setExerciseConfigErrorMessage(
        "Impossible de supprimer l exercice pour le moment. Reessaie dans un instant.",
      );
    } finally {
      setIsDeletingExercise(false);
    }
  };

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col bg-background-dark pb-24 text-text-primary">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-background-dark/80 px-6 pt-6 backdrop-blur-xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">
              {headerTitle}
            </h1>
            <p className="text-sm font-medium text-slate-400">{headerSubtitle}</p>
          </div>

          <button
            type="button"
            onClick={isPlansTab ? onCreateSession : openCreateExercise}
            className="flex size-11 items-center justify-center rounded-full bg-primary text-background-dark shadow-lg shadow-primary/20 transition-transform active:scale-90"
            aria-label={isPlansTab ? "Creer une seance" : "Creer un exercice"}
          >
            <span className="material-symbols-outlined font-bold">add</span>
          </button>
        </div>

        <div className="flex border-b border-white/5">
          <button
            type="button"
            onClick={() => setActiveTab("plans")}
            aria-pressed={isPlansTab}
            className={`flex-1 border-b-2 py-3 text-sm font-bold transition-colors ${
              isPlansTab
                ? "border-primary text-primary"
                : "border-transparent text-slate-500"
            }`}
          >
            Seances
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("exercises")}
            aria-pressed={!isPlansTab}
            className={`flex-1 border-b-2 py-3 text-sm font-bold transition-colors ${
              !isPlansTab
                ? "border-primary text-primary"
                : "border-transparent text-slate-500"
            }`}
          >
            Exercices
          </button>
        </div>
      </header>

      <main className="hide-scrollbar flex flex-1 flex-col gap-6 overflow-y-auto p-6">
        {isPlansTab ? (
          <>
            {isLoadingPlans ? (
              <div className="rounded-2xl border border-white/5 bg-card-dark p-5 text-sm text-slate-400">
                Chargement des seances...
              </div>
            ) : null}

            {planErrorMessage ? (
              <p className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {planErrorMessage}
              </p>
            ) : null}

            {shareErrorMessage ? (
              <p className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                {shareErrorMessage}
              </p>
            ) : null}

            {shareStatusMessage ? (
              <p className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-primary">
                {shareStatusMessage}
              </p>
            ) : null}

            {!isLoadingPlans && hasPlans ? (
              <div className="rounded-2xl border border-primary/15 bg-primary/10 p-4 text-sm text-slate-200">
                Rends une seance publique depuis sa carte. Elle apparaitra ensuite dans le profil
                de tes amis, qui pourront la copier dans leurs propres seances.
              </div>
            ) : null}

            {!isLoadingPlans && !planErrorMessage && !hasPlans ? (
              <div className="flex flex-col gap-4 rounded-2xl border border-white/5 bg-card-dark p-6">
                <h2 className="text-xl font-bold text-white">Aucune seance pour le moment</h2>
                <p className="text-sm text-slate-400">
                  Creez votre premiere seance pour demarrer votre routine.
                </p>
                <button
                  type="button"
                  onClick={onCreateSession}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 font-bold text-primary transition-colors hover:bg-primary/20"
                >
                  <span className="material-symbols-outlined">add_circle</span>
                  Creer une seance
                </button>
              </div>
            ) : null}

            {plans.map((plan) => {
              const canStart = plan.exercises.length > 0;

              return (
                <WorkoutPlanCard
                  key={plan.id}
                  name={plan.name}
                  gymName={plan.gymName}
                  exerciseCount={plan.exerciseCount}
                  exerciseNames={plan.exerciseNames}
                  canStart={canStart}
                  onCardClick={() => onEditPlan(plan)}
                  onCardKeyDown={(event) => onPlanCardKeyDown(event, plan)}
                  onStart={(event) => {
                    event.stopPropagation();
                    onStartPlan(plan);
                  }}
                  onShare={(event) => {
                    event.stopPropagation();
                    void handleTogglePlanSharing(plan);
                  }}
                  shareLabel={plan.isSharedWithFriends ? "PUBLIQUE" : "PARTAGER"}
                  isShareActive={Boolean(plan.isSharedWithFriends)}
                  isShareDisabled={shareProcessingPlanId === plan.id || !canStart}
                />
              );
            })}
          </>
        ) : (
          <>
            {isLoadingExercises ? (
              <div className="rounded-2xl border border-white/5 bg-card-dark p-5 text-sm text-slate-400">
                Chargement des exercices...
              </div>
            ) : null}

            {exerciseLoadErrorMessage ? (
              <p className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {exerciseLoadErrorMessage}
              </p>
            ) : null}

            {!isLoadingExercises && !exerciseLoadErrorMessage && !hasExercises ? (
              <div className="flex flex-col gap-4 rounded-2xl border border-white/5 bg-card-dark p-6">
                <h2 className="text-xl font-bold text-white">Aucun exercice pour le moment</h2>
                <p className="text-sm text-slate-400">
                  Creez vos mouvements favoris pour les reutiliser dans vos seances.
                </p>
                <button
                  type="button"
                  onClick={openCreateExercise}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 font-bold text-primary transition-colors hover:bg-primary/20"
                >
                  <span className="material-symbols-outlined">add_circle</span>
                  Creer un exercice
                </button>
              </div>
            ) : null}

            {exercises.map((exercise) => (
              <article
                key={exercise.id}
                role="button"
                tabIndex={0}
                onClick={() => openEditExercise(exercise)}
                onKeyDown={(event) =>
                  onExerciseCardKeyDown(event, () => openEditExercise(exercise))}
                className="cursor-pointer rounded-2xl border border-white/10 bg-card-dark p-4 shadow-sm transition-colors hover:border-primary/30"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <span className="material-symbols-outlined text-2xl">
                        {getExerciseIcon(exercise.trackingMode)}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-lg font-bold text-white">
                          {exercise.name}
                        </h3>
                        {exercise.source ? (
                          <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                            Importe
                          </span>
                        ) : null}
                      </div>

                      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">
                        {formatExerciseCategory(exercise.category)}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {getExerciseHighlights(exercise).map((highlight) => (
                          <span
                            key={`${exercise.id}-${highlight}`}
                            className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-200"
                          >
                            {highlight}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-400">
                    <span className="material-symbols-outlined text-[22px]">
                      edit_note
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </>
        )}
      </main>

      {isExerciseConfigOpen ? (
        <ExerciseConfigScreen
          onBack={closeExerciseConfig}
          onCreate={handleSubmitExerciseConfig}
          onDelete={exerciseConfigMode === "edit" ? handleDeleteExercise : undefined}
          initialConfig={editingExercise ? toExerciseConfig(editingExercise) : null}
          mode={exerciseConfigMode}
          isSubmitting={isSavingExercise}
          isDeleting={isDeletingExercise}
          errorMessage={exerciseConfigErrorMessage}
          zIndexClass="z-[96]"
        />
      ) : null}
    </div>
  );
}
