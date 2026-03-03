import { useEffect, useMemo, useState } from "react";
import {
  listExercises,
  listPlanItems,
  listPlans,
} from "../services/firestoreService.ts";

interface WorkoutScreenProps {
  userId: string;
  onCreateSession: () => void;
  refreshKey?: number;
}

interface PlanCard {
  id: string;
  name: string;
  gymName: string;
  exerciseCount: number;
  exerciseNames: string[];
  estimatedDurationMin: number | null;
  estimatedCaloriesKcal: number | null;
}

function normalizeGymLabel(gymName: string): string {
  const trimmed = gymName.trim();
  if (!trimmed) {
    return "Salle";
  }
  return trimmed;
}

function getGymIcon(gymName: string): "location_on" | "home_pin" {
  return gymName.toLowerCase().includes("maison") ? "home_pin" : "location_on";
}

function getGymTone(gymName: string): string {
  return gymName.toLowerCase().includes("maison") ? "text-slate-400" : "text-primary";
}

export function WorkoutScreen({
  userId,
  onCreateSession,
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
        const exerciseNamesById = new Map(
          exerciseDocs.map((exercise) => [exercise.id, exercise.name]),
        );

        const planCards = await Promise.all(
          planDocs.map(async (plan) => {
            const items = await listPlanItems(userId, plan.id, 40);
            const names = items
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((item) => exerciseNamesById.get(item.exerciseId) ?? "Exercice");

            return {
              id: plan.id,
              name: plan.name,
              gymName: normalizeGymLabel(plan.gymName),
              exerciseCount: items.length,
              exerciseNames: names,
              estimatedDurationMin: plan.estimatedDurationMin,
              estimatedCaloriesKcal: plan.estimatedCaloriesKcal,
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
          const visibleExercises = plan.exerciseNames.slice(0, 3);
          const hiddenCount = Math.max(0, plan.exerciseCount - visibleExercises.length);
          const hasDuration = plan.estimatedDurationMin !== null;
          const hasCalories = plan.estimatedCaloriesKcal !== null;

          return (
            <article
              key={plan.id}
              className="flex flex-col gap-5 rounded-2xl border border-white/5 bg-card-dark p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <div className={`flex items-center gap-2 ${getGymTone(plan.gymName)}`}>
                    <span className="material-symbols-outlined text-sm">
                      {getGymIcon(plan.gymName)}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {plan.gymName}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-400">
                  {plan.exerciseCount} exercices
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {visibleExercises.map((exerciseName) => (
                  <span
                    key={`${plan.id}-${exerciseName}`}
                    className="rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-300"
                  >
                    {exerciseName}
                  </span>
                ))}
                {hiddenCount > 0 ? (
                  <span className="px-2 py-1 text-xs font-medium text-slate-400">
                    +{hiddenCount} autres
                  </span>
                ) : null}
              </div>

              {hasDuration || hasCalories ? (
                <div className="flex flex-wrap gap-2">
                  {hasDuration ? (
                    <span className="flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      <span className="material-symbols-outlined text-sm">schedule</span>
                      {plan.estimatedDurationMin} min
                    </span>
                  ) : null}
                  {hasCalories ? (
                    <span className="flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      <span className="material-symbols-outlined text-sm">
                        local_fire_department
                      </span>
                      {plan.estimatedCaloriesKcal} kcal
                    </span>
                  ) : null}
                </div>
              ) : null}

              <button
                type="button"
                className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary font-extrabold text-background-dark shadow-lg shadow-primary/10 transition-all hover:bg-primary/90 active:scale-[0.98]"
              >
                <span className="material-symbols-outlined">play_arrow</span>
                DEMARRER
              </button>
            </article>
          );
        })}
      </main>
    </div>
  );
}
