import { useEffect, useMemo, useState } from "react";
import { WorkoutPlanCard } from "../../components/WorkoutPlanCard.tsx";
import {
  deleteSession,
  listExercises,
  listPlanItems,
  listPlans,
  listSessionExercises,
  listSessions,
} from "../../services/firestoreService.ts";
import type { SessionDoc, SessionExerciseStatus, SessionStatus } from "../../types/firestore.ts";
import type { WorkoutPlanToStart } from "../WorkoutScreen/types.ts";
import { normalizeGymLabel } from "../WorkoutScreen/utils.ts";
import type { HomeScreenProps } from "./types.ts";
import {
  buildAvatarUrl,
  formatDuration,
  formatSessionDateTime,
  formatSignedPercent,
  getFirstName,
  getSessionBadge,
  toMillis,
} from "./utils.ts";

type HomePlanCard = WorkoutPlanToStart & {
  exerciseCount: number;
  exerciseNames: string[];
};

interface PastExerciseSummary {
  id: string;
  name: string;
  status: SessionExerciseStatus;
  targetSets: number;
  completedSets: number;
  totalReps: number;
  totalVolumeKg: number;
  totalDurationSec: number;
}

interface PastSessionSummary {
  id: string;
  gymName: string;
  status: SessionStatus;
  startedAtMs: number;
  endedAtMs: number;
  durationSec: number;
  exerciseCount: number;
  completedExerciseCount: number;
  totalReps: number;
  totalVolumeKg: number;
  totalDurationSec: number;
  exercises: PastExerciseSummary[];
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function getSessionDurationSec(session: SessionDoc): number {
  if (session.durationSec !== null && Number.isFinite(session.durationSec)) {
    return Math.max(0, Math.round(session.durationSec));
  }

  const startedAtMs = toMillis(session.startedAt);
  const endedAtMs = toMillis(session.endedAt ?? session.startedAt);
  return Math.max(0, Math.round((endedAtMs - startedAtMs) / 1000));
}

function getTrendPct(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) {
    return null;
  }

  if (previous <= 0) {
    return current > 0 ? 100 : 0;
  }

  return ((current - previous) / previous) * 100;
}

function getSessionStatusLabel(status: SessionStatus): string {
  if (status === "completed") {
    return "Terminee";
  }
  if (status === "cancelled") {
    return "Annulee";
  }
  return "Active";
}

function getExerciseStatusLabel(status: SessionExerciseStatus): string {
  if (status === "completed") {
    return "Termine";
  }
  if (status === "cancelled") {
    return "Annule";
  }
  return "Actif";
}

function getExerciseStatusClass(status: SessionExerciseStatus): string {
  if (status === "completed") {
    return "border-emerald-400/30 bg-emerald-500/10 text-emerald-300";
  }
  if (status === "cancelled") {
    return "border-amber-400/30 bg-amber-500/10 text-amber-300";
  }
  return "border-sky-400/30 bg-sky-500/10 text-sky-300";
}

export function HomeScreen({
  userId,
  displayName,
  photoURL,
  onCreateSession,
  onStartPlan,
}: HomeScreenProps) {
  const [todaysPlan, setTodaysPlan] = useState<HomePlanCard | null>(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);
  const [planError, setPlanError] = useState<string | null>(null);
  const [pastSessions, setPastSessions] = useState<PastSessionSummary[]>([]);
  const [isLoadingPastSessions, setIsLoadingPastSessions] = useState(true);
  const [pastSessionsError, setPastSessionsError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<PastSessionSummary | null>(null);
  const [isDeletingPastSession, setIsDeletingPastSession] = useState(false);
  const [deletePastSessionError, setDeletePastSessionError] = useState<string | null>(null);
  const firstName = getFirstName(displayName);
  const avatarSrc = photoURL ?? buildAvatarUrl(displayName);
  const hasPlan = useMemo(() => Boolean(todaysPlan), [todaysPlan]);
  const recentPastSessions = useMemo(() => pastSessions.slice(0, 8), [pastSessions]);
  const nowMs = Date.now();
  const latestSession = pastSessions[0] ?? null;
  const previousSession = pastSessions[1] ?? null;
  const lastSessionDuration = latestSession ? formatDuration(latestSession.durationSec) : "--";
  const durationTrendPct =
    latestSession && previousSession
      ? getTrendPct(latestSession.durationSec, previousSession.durationSec)
      : null;
  const volumeCurrentWeek = pastSessions
    .filter((session) => nowMs - session.endedAtMs <= SEVEN_DAYS_MS)
    .reduce((sum, session) => sum + session.totalVolumeKg, 0);
  const volumePreviousWeek = pastSessions
    .filter(
      (session) =>
        nowMs - session.endedAtMs > SEVEN_DAYS_MS &&
        nowMs - session.endedAtMs <= SEVEN_DAYS_MS * 2,
    )
    .reduce((sum, session) => sum + session.totalVolumeKg, 0);
  const volumeTrendPct = getTrendPct(volumeCurrentWeek, volumePreviousWeek);

  useEffect(() => {
    let cancelled = false;

    const loadTodaysPlan = async () => {
      setIsLoadingPlan(true);
      setPlanError(null);

      try {
        const [planDoc] = await listPlans(userId, 1);

        if (!planDoc) {
          if (!cancelled) {
            setTodaysPlan(null);
          }
          return;
        }

        const [items, exerciseDocs] = await Promise.all([
          listPlanItems(userId, planDoc.id, 40),
          listExercises(userId, 300),
        ]);
        const exerciseById = new Map(exerciseDocs.map((exercise) => [exercise.id, exercise]));
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
          };
        });

        if (!cancelled) {
          setTodaysPlan({
            id: planDoc.id,
            name: planDoc.name,
            gymName: normalizeGymLabel(planDoc.gymName),
            estimatedDurationMin: planDoc.estimatedDurationMin ?? null,
            estimatedCaloriesKcal: planDoc.estimatedCaloriesKcal ?? null,
            estimationSource: planDoc.estimationSource ?? null,
            exerciseCount: exercises.length,
            exerciseNames: exercises.map((exercise) => exercise.exerciseName),
            exercises,
          });
        }
      } catch {
        if (!cancelled) {
          setPlanError("Impossible de charger votre seance du moment.");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingPlan(false);
        }
      }
    };

    void loadTodaysPlan();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    let cancelled = false;

    const loadPastSessions = async () => {
      setIsLoadingPastSessions(true);
      setPastSessionsError(null);

      try {
        const sessionDocs = await listSessions(userId, 40);
        const finishedSessions = sessionDocs.filter((session) => session.status !== "active");

        const sessionsWithDetails = await Promise.all(
          finishedSessions.map(async (session) => {
            const exerciseDocs = await listSessionExercises(userId, session.id, 150);
            const exercises = exerciseDocs
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((exercise) => ({
                id: exercise.id,
                name: exercise.exerciseNameSnapshot,
                status: exercise.status,
                targetSets: Math.max(1, exercise.targetSets),
                completedSets: Math.max(0, exercise.completedSets),
                totalReps: Math.max(0, exercise.totalReps),
                totalVolumeKg: Math.max(0, exercise.totalVolumeKg),
                totalDurationSec: Math.max(0, exercise.totalDurationSec),
              }));

            const startedAtMs = toMillis(session.startedAt);
            const endedAtMs = toMillis(session.endedAt ?? session.startedAt);
            const durationSec = getSessionDurationSec(session);
            const completedExerciseCount = exercises.filter(
              (exercise) => exercise.status === "completed",
            ).length;
            const totalReps = exercises.reduce((sum, exercise) => sum + exercise.totalReps, 0);
            const totalVolumeKg = exercises.reduce(
              (sum, exercise) => sum + exercise.totalVolumeKg,
              0,
            );
            const totalDurationSec = exercises.reduce(
              (sum, exercise) => sum + exercise.totalDurationSec,
              0,
            );

            return {
              id: session.id,
              gymName: normalizeGymLabel(session.gymName),
              status: session.status,
              startedAtMs,
              endedAtMs,
              durationSec,
              exerciseCount: exercises.length,
              completedExerciseCount,
              totalReps,
              totalVolumeKg,
              totalDurationSec,
              exercises,
            } satisfies PastSessionSummary;
          }),
        );

        if (!cancelled) {
          const sortedSessions = sessionsWithDetails
            .slice()
            .sort((a, b) => b.endedAtMs - a.endedAtMs);
          setPastSessions(sortedSessions);
        }
      } catch {
        if (!cancelled) {
          setPastSessionsError("Impossible de charger vos seances passees.");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingPastSessions(false);
        }
      }
    };

    void loadPastSessions();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const handleOpenSessionDetails = (session: PastSessionSummary) => {
    setDeletePastSessionError(null);
    setSelectedSession(session);
  };

  const handleCloseSessionDetails = () => {
    if (isDeletingPastSession) {
      return;
    }
    setDeletePastSessionError(null);
    setSelectedSession(null);
  };

  const handleDeleteSelectedSession = async () => {
    if (!selectedSession || isDeletingPastSession) {
      return;
    }

    const confirmed = window.confirm(
      "Supprimer cette seance passee ? Cette action est definitive.",
    );
    if (!confirmed) {
      return;
    }

    setIsDeletingPastSession(true);
    setDeletePastSessionError(null);

    try {
      await deleteSession(userId, selectedSession.id);
      setPastSessions((current) =>
        current.filter((session) => session.id !== selectedSession.id),
      );
      setSelectedSession(null);
    } catch {
      setDeletePastSessionError(
        "Impossible de supprimer cette seance pour le moment. Reessaie dans un instant.",
      );
    } finally {
      setIsDeletingPastSession(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 pb-24">
      {/* Header */}
      <header className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 overflow-hidden rounded-full border-2 border-primary bg-card-dark">
            <img
              src={avatarSrc}
              alt="Photo de profil"
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <p className="text-sm text-text-secondary">Bienvenue, {firstName}</p>
            <h1 className="text-lg font-bold text-white">{displayName}</h1>
          </div>
        </div>
      </header>

      {/* Today's Plan */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Séance du jour</h2>
        </div>

        {isLoadingPlan ? (
          <div className="rounded-2xl border border-white/5 bg-card-dark p-5 text-sm text-slate-400">
            Chargement de votre seance...
          </div>
        ) : null}

        {planError ? (
          <p className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {planError}
          </p>
        ) : null}

        {!isLoadingPlan && !planError && hasPlan && todaysPlan ? (
          <WorkoutPlanCard
            name={todaysPlan.name}
            gymName={todaysPlan.gymName}
            exerciseCount={todaysPlan.exerciseCount}
            exerciseNames={todaysPlan.exerciseNames}
            canStart={todaysPlan.exercises.length > 0}
            onStart={(event) => {
              event.stopPropagation();
              onStartPlan(todaysPlan);
            }}
          />
        ) : null}

        {!isLoadingPlan && !planError && !hasPlan ? (
          <div className="flex flex-col gap-4 rounded-2xl border border-white/5 bg-card-dark p-6">
            <h3 className="text-lg font-bold text-white">Aucune seance enregistree</h3>
            <p className="text-sm text-slate-400">
              Creez une seance pour l afficher directement sur l accueil.
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
      </section>

      {/* Weekly Progress */}
      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-bold text-white">Progression hebdo</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-4 rounded-2xl border border-white/5 bg-card-dark p-5">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
                <span className="material-symbols-outlined">schedule</span>
              </div>
              <span className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "14px" }}
                >
                  trending_up
                </span>
                {formatSignedPercent(durationTrendPct)}
              </span>
            </div>
            <div>
              <p className="text-sm text-text-secondary">Derniere seance</p>
              <p className="text-2xl font-bold text-white">{lastSessionDuration}</p>
              <p className="mt-1 text-xs text-text-secondary">
                {latestSession
                  ? formatSessionDateTime(latestSession.endedAtMs)
                  : "Aucune seance"}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl border border-white/5 bg-card-dark p-5">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/20 text-purple-400">
                <span className="material-symbols-outlined">weight</span>
              </div>
              <span className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "14px" }}
                >
                  trending_up
                </span>
                {formatSignedPercent(volumeTrendPct)}
              </span>
            </div>
            <div>
              <p className="text-sm text-text-secondary">Volume 7 jours</p>
              <p className="text-2xl font-bold text-white">
                {Math.round(volumeCurrentWeek)}
                <span className="text-sm font-normal text-text-secondary">
                  {" "}
                  kg
                </span>
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                Semaine precedente: {Math.round(volumePreviousWeek)} kg
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Past Sessions */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Seances passees</h2>
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {pastSessions.length} total
          </span>
        </div>

        {isLoadingPastSessions ? (
          <div className="rounded-2xl border border-white/5 bg-card-dark p-5 text-sm text-slate-400">
            Chargement des seances passees...
          </div>
        ) : null}

        {pastSessionsError ? (
          <p className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {pastSessionsError}
          </p>
        ) : null}

        {!isLoadingPastSessions && !pastSessionsError && recentPastSessions.length === 0 ? (
          <div className="rounded-2xl border border-white/5 bg-card-dark p-5">
            <p className="text-sm text-slate-400">Aucune seance passee pour le moment.</p>
          </div>
        ) : null}

        {!isLoadingPastSessions && !pastSessionsError && recentPastSessions.length > 0 ? (
          <div className="flex flex-col gap-3">
            {recentPastSessions.map((session) => {
              const badge = getSessionBadge(session.endedAtMs);

              return (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => handleOpenSessionDetails(session)}
                  className="flex items-center justify-between rounded-2xl border border-white/5 bg-card-dark p-4 text-left transition-colors hover:border-primary/35"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex min-w-[58px] flex-col items-center justify-center rounded-xl bg-background-dark px-3 py-2">
                      <span className="text-xs font-bold text-text-secondary">
                        {badge.month}
                      </span>
                      <span className="text-xl font-bold text-white">{badge.day}</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-white">{session.gymName}</h4>
                      <p className="text-xs text-slate-400">
                        {formatSessionDateTime(session.endedAtMs)}
                      </p>
                      <p className="text-sm text-text-secondary">
                        {session.completedExerciseCount}/{session.exerciseCount} ex •{" "}
                        {formatDuration(session.durationSec)} • {Math.round(session.totalVolumeKg)} kg
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-white/15 bg-black/20 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-200">
                      {getSessionStatusLabel(session.status)}
                    </span>
                    <span
                      className="material-symbols-outlined text-white"
                      style={{ fontSize: "20px" }}
                    >
                      chevron_right
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}
      </section>

      {selectedSession ? (
        <div
          className="fixed inset-0 z-[95] flex items-end justify-center bg-black/70 p-4 sm:items-center"
          onClick={handleCloseSessionDetails}
        >
          <div
            className="flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-background-dark"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div>
                <h3 className="text-lg font-bold text-white">Detail seance</h3>
                <p className="text-xs text-slate-400">
                  {formatSessionDateTime(selectedSession.endedAtMs)}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseSessionDetails}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-card-dark text-white transition-colors hover:bg-white/10"
                aria-label="Fermer le detail de la seance"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </header>

            <div className="hide-scrollbar flex flex-1 flex-col gap-4 overflow-y-auto p-4">
              <div className="rounded-2xl border border-white/5 bg-card-dark p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-semibold text-white">{selectedSession.gymName}</p>
                  <span className="rounded-full border border-white/15 bg-black/20 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-200">
                    {getSessionStatusLabel(selectedSession.status)}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg border border-white/5 bg-background-dark px-2 py-2">
                    <p className="text-xs text-slate-400">Duree</p>
                    <p className="text-sm font-semibold text-white">
                      {formatDuration(selectedSession.durationSec)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/5 bg-background-dark px-2 py-2">
                    <p className="text-xs text-slate-400">Volume</p>
                    <p className="text-sm font-semibold text-white">
                      {Math.round(selectedSession.totalVolumeKg)} kg
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/5 bg-background-dark px-2 py-2">
                    <p className="text-xs text-slate-400">Mouvements</p>
                    <p className="text-sm font-semibold text-white">{selectedSession.totalReps}</p>
                  </div>
                </div>
              </div>

              <section className="flex flex-col gap-3">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                  Exercices realises
                </h4>
                {selectedSession.exercises.length === 0 ? (
                  <p className="rounded-xl border border-white/5 bg-card-dark px-3 py-3 text-sm text-slate-400">
                    Aucun exercice enregistre pour cette seance.
                  </p>
                ) : (
                  selectedSession.exercises.map((exercise) => (
                    <article
                      key={exercise.id}
                      className="rounded-xl border border-white/5 bg-card-dark px-3 py-3"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="font-semibold text-white">{exercise.name}</p>
                        <span
                          className={`rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${getExerciseStatusClass(exercise.status)}`}
                        >
                          {getExerciseStatusLabel(exercise.status)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">
                        Series: {exercise.completedSets}/{exercise.targetSets} • Reps:{" "}
                        {exercise.totalReps} • Volume: {Math.round(exercise.totalVolumeKg)} kg •
                        Temps: {Math.round(exercise.totalDurationSec)} sec
                      </p>
                    </article>
                  ))
                )}
              </section>

              {deletePastSessionError ? (
                <p className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                  {deletePastSessionError}
                </p>
              ) : null}
            </div>

            <footer className="flex gap-2 border-t border-white/10 p-4">
              <button
                type="button"
                onClick={handleCloseSessionDetails}
                className="flex h-11 flex-1 items-center justify-center rounded-xl border border-white/15 bg-card-dark text-sm font-semibold text-white transition-colors hover:border-white/30"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleDeleteSelectedSession();
                }}
                disabled={isDeletingPastSession}
                className="flex h-11 flex-1 items-center justify-center rounded-xl border border-rose-400/40 bg-rose-500/10 text-sm font-semibold text-rose-200 transition-colors hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeletingPastSession ? "Suppression..." : "Supprimer"}
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </div>
  );
}
