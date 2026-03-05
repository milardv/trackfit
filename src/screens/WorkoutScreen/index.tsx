import { useEffect, useMemo, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { WorkoutPlanCard } from "../../components/WorkoutPlanCard.tsx";
import {
  listExercises,
  listPlanItems,
  listPlans,
} from "../../services/firestoreService.ts";
import type {
  PlanCard,
  WorkoutPlanExercise,
  WorkoutPlanToStart,
  WorkoutScreenProps,
} from "./types.ts";
import { normalizeGymLabel } from "./utils.ts";
export type { WorkoutPlanExercise, WorkoutPlanToStart } from "./types.ts";

export function WorkoutScreen({
  userId,
  onCreateSession,
  onStartPlan,
  onEditPlan,
  refreshKey = 0,
}: WorkoutScreenProps) {
  const [plans, setPlans] = useState<PlanCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadPlans = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const [planDocs, exerciseDocs] = await Promise.all([
          listPlans(userId, 30),
          listExercises(userId, 300),
        ]);
        const exerciseById = new Map(exerciseDocs.map((exercise) => [exercise.id, exercise]));

        const planCards = await Promise.all(
          planDocs.map(async (plan) => {
            const items = await listPlanItems(userId, plan.id, 40);
            const sortedItems = items.slice().sort((a, b) => a.order - b.order);

            const exercises = sortedItems.map((item, index) => {
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
              } satisfies WorkoutPlanExercise;
            });

            return {
              id: plan.id,
              name: plan.name,
              gymName: normalizeGymLabel(plan.gymName),
              estimatedDurationMin: plan.estimatedDurationMin ?? null,
              estimatedCaloriesKcal: plan.estimatedCaloriesKcal ?? null,
              estimationSource: plan.estimationSource ?? null,
              exerciseCount: exercises.length,
              exerciseNames: exercises.map((exercise) => exercise.exerciseName),
              exercises,
            } satisfies PlanCard;
          }),
        );

        if (!cancelled) {
          setPlans(planCards);
        }
      } catch {
        if (!cancelled) {
          setErrorMessage(
            "Impossible de charger vos seances pour le moment. Reessayez dans un instant.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadPlans();

    return () => {
      cancelled = true;
    };
  }, [refreshKey, userId]);

  const hasPlans = useMemo(() => plans.length > 0, [plans.length]);

  const onPlanCardKeyDown = (
    event: ReactKeyboardEvent<HTMLElement>,
    plan: WorkoutPlanToStart,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onEditPlan(plan);
    }
  };

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col bg-background-dark pb-24 text-text-primary">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-background-dark/80 px-6 py-6 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">
              Mes Seances
            </h1>
            <p className="text-sm font-medium text-slate-400">
              Pret pour votre entrainement ?
            </p>
          </div>

          <button
            type="button"
            onClick={onCreateSession}
            className="flex size-11 items-center justify-center rounded-full bg-primary text-background-dark shadow-lg shadow-primary/20 transition-transform active:scale-90"
            aria-label="Creer une seance"
          >
            <span className="material-symbols-outlined font-bold">add</span>
          </button>
        </div>
      </header>

      <main className="hide-scrollbar flex flex-1 flex-col gap-6 overflow-y-auto p-6">
        {isLoading ? (
          <div className="rounded-2xl border border-white/5 bg-card-dark p-5 text-sm text-slate-400">
            Chargement des seances...
          </div>
        ) : null}

        {errorMessage ? (
          <p className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {errorMessage}
          </p>
        ) : null}

        {!isLoading && !errorMessage && !hasPlans ? (
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
            />
          );
        })}
      </main>
    </div>
  );
}
