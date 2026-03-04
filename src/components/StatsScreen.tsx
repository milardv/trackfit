import { useEffect, useMemo, useState } from "react";
import {
  listBodyMetrics,
  listSessionExercises,
  listSessions,
} from "../services/firestoreService.ts";
import type { BodyMetricDoc, SessionExerciseDoc } from "../types/firestore.ts";

type StatsTab = "force" | "volume" | "mesures";

interface StatsScreenProps {
  userId: string;
}

interface SessionExerciseRow extends SessionExerciseDoc {
  id: string;
  sessionId: string;
  sessionMs: number;
}

interface ChartPoint {
  label: string;
  value: number;
}

interface ChartGeometry {
  linePath: string;
  areaPath: string;
  dots: Array<{ x: number; y: number }>;
}

interface RecentEntry {
  id: string;
  title: string;
  subtitle: string;
  value: string;
  valueLabel: string;
  isHighlight: boolean;
}

const shortDateTime = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const shortDate = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
});

function toMillis(value: unknown): number {
  if (
    value !== null &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof (value as { toMillis?: unknown }).toMillis === "function"
  ) {
    return ((value as { toMillis: () => number }).toMillis());
  }

  return Date.now();
}

function formatSignedNumber(value: number | null, suffix: string): string {
  if (value === null || !Number.isFinite(value)) {
    return "N/A";
  }

  const rounded = Math.round(value * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded}${suffix}`;
}

function formatPct(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "N/A";
  }
  return `${Math.round(value * 10) / 10}%`;
}

function buildChart(points: ChartPoint[]): ChartGeometry | null {
  if (points.length === 0) {
    return null;
  }

  const values = points.map((point) => point.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const safeRange = Math.max(1, maxValue - minValue);

  const dots = points.map((point, index) => {
    const x = points.length === 1 ? 50 : (index / (points.length - 1)) * 100;
    const y = 46 - ((point.value - minValue) / safeRange) * 40;
    return { x, y };
  });

  const linePath = dots
    .map((dot, index) => `${index === 0 ? "M" : "L"}${dot.x} ${dot.y}`)
    .join(" ");
  const areaPath = `${linePath} L100 50 L0 50 Z`;

  return { linePath, areaPath, dots };
}

function getFallbackValueForExercise(entry: SessionExerciseRow): number {
  if (entry.trackingMode === "duration_only") {
    return entry.targetDurationSec ?? Math.round(entry.totalDurationSec / Math.max(1, entry.completedSets));
  }
  if (entry.trackingMode === "reps_only") {
    return entry.targetReps ?? Math.round(entry.totalReps / Math.max(1, entry.completedSets));
  }
  return entry.targetWeightKg ?? 0;
}

function estimate1RM(entry: SessionExerciseRow): number | null {
  const weight = entry.targetWeightKg ?? null;
  const repsCandidate =
    entry.targetReps ??
    (entry.completedSets > 0 ? Math.round(entry.totalReps / entry.completedSets) : null);

  if (!weight || !repsCandidate || repsCandidate <= 0) {
    return null;
  }

  return weight * (1 + repsCandidate / 30);
}

function getBestSetLabel(entry: SessionExerciseRow): { value: string; label: string } {
  if ((entry.targetWeightKg ?? 0) > 0) {
    return { value: `${Math.round(entry.targetWeightKg ?? 0)} kg`, label: "Meilleure serie" };
  }

  if (entry.trackingMode === "duration_only") {
    const duration =
      entry.targetDurationSec ??
      Math.round(entry.totalDurationSec / Math.max(1, entry.completedSets));
    return { value: `${Math.max(0, duration)} sec`, label: "Duree cible" };
  }

  const reps =
    entry.targetReps ?? Math.round(entry.totalReps / Math.max(1, entry.completedSets));
  return { value: `${Math.max(0, reps)} reps`, label: "Meilleure serie" };
}

export function StatsScreen({ userId }: StatsScreenProps) {
  const [activeTab, setActiveTab] = useState<StatsTab>("force");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sessionExercises, setSessionExercises] = useState<SessionExerciseRow[]>([]);
  const [bodyMetrics, setBodyMetrics] = useState<Array<BodyMetricDoc & { id: string }>>([]);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const [sessions, metrics] = await Promise.all([
          listSessions(userId, 120),
          listBodyMetrics(userId, 120),
        ]);

        const completedSessions = sessions.filter((session) => session.status === "completed");

        const exerciseGroups = await Promise.all(
          completedSessions.map(async (session) => {
            const exercises = await listSessionExercises(userId, session.id, 120);
            const sessionMs = toMillis(session.endedAt ?? session.startedAt);

            return exercises.map((exercise) => ({
              ...exercise,
              sessionId: session.id,
              sessionMs,
            }));
          }),
        );

        const flattenedExercises = exerciseGroups
          .flat()
          .filter(
            (exercise) =>
              exercise.status === "completed" ||
              exercise.completedSets > 0 ||
              exercise.totalReps > 0 ||
              exercise.totalDurationSec > 0 ||
              exercise.totalVolumeKg > 0,
          )
          .sort((a, b) => b.sessionMs - a.sessionMs);

        const sortedMetrics = metrics
          .slice()
          .sort((a, b) => toMillis(b.measuredAt) - toMillis(a.measuredAt));

        if (!cancelled) {
          setSessionExercises(flattenedExercises);
          setBodyMetrics(sortedMetrics);
        }
      } catch {
        if (!cancelled) {
          setErrorMessage("Impossible de charger les statistiques pour le moment.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const selectedExerciseId = useMemo(() => {
    if (sessionExercises.length === 0) {
      return null;
    }

    const groups = new Map<
      string,
      { count: number; lastMs: number; totalVolumeKg: number }
    >();

    sessionExercises.forEach((entry) => {
      const current = groups.get(entry.exerciseId);
      if (!current) {
        groups.set(entry.exerciseId, {
          count: 1,
          lastMs: entry.sessionMs,
          totalVolumeKg: entry.totalVolumeKg,
        });
        return;
      }

      groups.set(entry.exerciseId, {
        count: current.count + 1,
        lastMs: Math.max(current.lastMs, entry.sessionMs),
        totalVolumeKg: current.totalVolumeKg + entry.totalVolumeKg,
      });
    });

    const best = [...groups.entries()].sort((a, b) => {
      if (b[1].count !== a[1].count) {
        return b[1].count - a[1].count;
      }
      if (b[1].totalVolumeKg !== a[1].totalVolumeKg) {
        return b[1].totalVolumeKg - a[1].totalVolumeKg;
      }
      return b[1].lastMs - a[1].lastMs;
    })[0];

    return best?.[0] ?? null;
  }, [sessionExercises]);

  const selectedExerciseEntries = useMemo(() => {
    if (!selectedExerciseId) {
      return [] as SessionExerciseRow[];
    }

    return sessionExercises
      .filter((entry) => entry.exerciseId === selectedExerciseId)
      .slice()
      .sort((a, b) => a.sessionMs - b.sessionMs);
  }, [selectedExerciseId, sessionExercises]);

  const selectedExerciseName = useMemo(() => {
    const latest = selectedExerciseEntries[selectedExerciseEntries.length - 1];
    return latest?.exerciseNameSnapshot ?? "Aucun exercice";
  }, [selectedExerciseEntries]);

  const forceChartPoints = useMemo(() => {
    const weightEntries = selectedExerciseEntries.filter(
      (entry) => (entry.targetWeightKg ?? 0) > 0,
    );
    const source = (weightEntries.length > 0 ? weightEntries : selectedExerciseEntries).slice(-5);

    return source.map((entry) => ({
      label: shortDate.format(new Date(entry.sessionMs)),
      value:
        weightEntries.length > 0
          ? Math.max(0, entry.targetWeightKg ?? 0)
          : Math.max(0, getFallbackValueForExercise(entry)),
    }));
  }, [selectedExerciseEntries]);

  const forceWeightSeries = useMemo(
    () => selectedExerciseEntries.filter((entry) => (entry.targetWeightKg ?? 0) > 0),
    [selectedExerciseEntries],
  );

  const forceMaxWeightKg = useMemo(() => {
    if (forceWeightSeries.length === 0) {
      return null;
    }

    return Math.max(...forceWeightSeries.map((entry) => entry.targetWeightKg ?? 0));
  }, [forceWeightSeries]);

  const forceEstimated1RM = useMemo(() => {
    const candidates = forceWeightSeries
      .map((entry) => estimate1RM(entry))
      .filter((value): value is number => value !== null);

    if (candidates.length === 0) {
      return null;
    }

    return Math.max(...candidates);
  }, [forceWeightSeries]);

  const forcePrPct = useMemo(() => {
    if (forceChartPoints.length < 2) {
      return null;
    }

    const latest = forceChartPoints[forceChartPoints.length - 1].value;
    const previousBest = Math.max(
      ...forceChartPoints.slice(0, -1).map((point) => point.value),
    );
    if (previousBest <= 0) {
      return null;
    }

    return ((latest - previousBest) / previousBest) * 100;
  }, [forceChartPoints]);

  const forceMonthDelta = useMemo(() => {
    if (forceWeightSeries.length === 0) {
      return null;
    }

    const now = Date.now();
    const monthMs = 30 * 24 * 60 * 60 * 1000;

    const thisMonth = forceWeightSeries.filter((entry) => now - entry.sessionMs <= monthMs);
    const previousMonth = forceWeightSeries.filter(
      (entry) => now - entry.sessionMs > monthMs && now - entry.sessionMs <= monthMs * 2,
    );

    const thisMax =
      thisMonth.length > 0
        ? Math.max(...thisMonth.map((entry) => entry.targetWeightKg ?? 0))
        : null;
    const previousMax =
      previousMonth.length > 0
        ? Math.max(...previousMonth.map((entry) => entry.targetWeightKg ?? 0))
        : null;

    if (thisMax === null || previousMax === null) {
      return null;
    }

    return thisMax - previousMax;
  }, [forceWeightSeries]);

  const force1RmMonthDelta = useMemo(() => {
    if (forceWeightSeries.length === 0) {
      return null;
    }

    const now = Date.now();
    const monthMs = 30 * 24 * 60 * 60 * 1000;

    const thisMonth = forceWeightSeries
      .filter((entry) => now - entry.sessionMs <= monthMs)
      .map((entry) => estimate1RM(entry))
      .filter((value): value is number => value !== null);
    const previousMonth = forceWeightSeries
      .filter((entry) => now - entry.sessionMs > monthMs && now - entry.sessionMs <= monthMs * 2)
      .map((entry) => estimate1RM(entry))
      .filter((value): value is number => value !== null);

    if (thisMonth.length === 0 || previousMonth.length === 0) {
      return null;
    }

    return Math.max(...thisMonth) - Math.max(...previousMonth);
  }, [forceWeightSeries]);

  const recentForceSessions = useMemo(() => {
    return selectedExerciseEntries
      .slice()
      .sort((a, b) => b.sessionMs - a.sessionMs)
      .slice(0, 3)
      .map((entry, index) => {
        const { value, label } = getBestSetLabel(entry);
        return {
          id: `${entry.sessionId}-${entry.id}`,
          title: shortDateTime.format(new Date(entry.sessionMs)),
          subtitle: `${entry.completedSets} series - ${entry.totalReps} reps au total`,
          value,
          valueLabel: label,
          isHighlight: index === 0,
        } satisfies RecentEntry;
      });
  }, [selectedExerciseEntries]);

  const volumeChartPoints = useMemo(() => {
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const points: ChartPoint[] = [];

    for (let index = 3; index >= 0; index -= 1) {
      const from = now - (index + 1) * weekMs;
      const to = now - index * weekMs;
      const label = shortDate.format(new Date(to));
      const volume = sessionExercises
        .filter((entry) => entry.sessionMs > from && entry.sessionMs <= to)
        .reduce((sum, entry) => sum + entry.totalVolumeKg, 0);

      points.push({
        label,
        value: Math.max(0, volume),
      });
    }

    return points;
  }, [sessionExercises]);

  const volumeRecent = useMemo(() => {
    const now = Date.now();
    const monthMs = 30 * 24 * 60 * 60 * 1000;
    const current = sessionExercises.filter((entry) => now - entry.sessionMs <= monthMs);
    const previous = sessionExercises.filter(
      (entry) => now - entry.sessionMs > monthMs && now - entry.sessionMs <= monthMs * 2,
    );

    const currentVolume = current.reduce((sum, entry) => sum + entry.totalVolumeKg, 0);
    const currentReps = current.reduce((sum, entry) => sum + entry.totalReps, 0);
    const previousVolume = previous.reduce((sum, entry) => sum + entry.totalVolumeKg, 0);
    const previousReps = previous.reduce((sum, entry) => sum + entry.totalReps, 0);

    return {
      volumeKg: currentVolume,
      reps: currentReps,
      volumeDeltaKg: currentVolume - previousVolume,
      repsDelta: currentReps - previousReps,
    };
  }, [sessionExercises]);

  const measuresChartPoints = useMemo(() => {
    return bodyMetrics
      .slice()
      .sort((a, b) => toMillis(a.measuredAt) - toMillis(b.measuredAt))
      .slice(-6)
      .map((entry) => ({
        label: shortDate.format(new Date(toMillis(entry.measuredAt))),
        value: entry.weightKg,
      }));
  }, [bodyMetrics]);

  const measuresSummary = useMemo(() => {
    if (bodyMetrics.length === 0) {
      return {
        currentWeightKg: null,
        currentBodyFatPct: null,
        deltaWeightKg: null,
        deltaBodyFatPct: null,
      };
    }

    const latest = bodyMetrics[0];
    const latestMs = toMillis(latest.measuredAt);
    const older =
      bodyMetrics.find((entry) => latestMs - toMillis(entry.measuredAt) >= 30 * 24 * 60 * 60 * 1000) ??
      bodyMetrics[1] ??
      null;

    return {
      currentWeightKg: latest.weightKg,
      currentBodyFatPct: latest.bodyFatPct ?? null,
      deltaWeightKg: older ? latest.weightKg - older.weightKg : null,
      deltaBodyFatPct:
        older && latest.bodyFatPct !== null && older.bodyFatPct !== null
          ? latest.bodyFatPct - older.bodyFatPct
          : null,
    };
  }, [bodyMetrics]);

  const chartPoints = useMemo(() => {
    if (activeTab === "force") {
      return forceChartPoints;
    }
    if (activeTab === "volume") {
      return volumeChartPoints;
    }
    return measuresChartPoints;
  }, [activeTab, forceChartPoints, measuresChartPoints, volumeChartPoints]);

  const chartGeometry = useMemo(() => buildChart(chartPoints), [chartPoints]);

  const chartTitle = activeTab === "force" ? selectedExerciseName : activeTab === "volume" ? "Volume total" : "Poids";
  const chartSubtitle =
    activeTab === "force"
      ? "Progression de charge"
      : activeTab === "volume"
        ? "Evolution du volume (kg)"
        : "Evolution du poids (kg)";

  const tabButtonClass = (tab: StatsTab) =>
    `flex-1 py-4 text-sm font-bold ${
      activeTab === tab
        ? "border-b-2 border-primary text-white"
        : "text-text-secondary"
    }`;

  return (
    <div className="flex min-h-screen flex-col bg-background-dark pb-24">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/5 bg-background-dark/90 px-4 py-4 backdrop-blur-md">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/10"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-lg font-bold text-white">Analyse de performance</h1>
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/10"
        >
          <span className="material-symbols-outlined">more_vert</span>
        </button>
      </header>

      <div className="flex border-b border-white/5 px-4">
        <button type="button" onClick={() => setActiveTab("force")} className={tabButtonClass("force")}>
          Force
        </button>
        <button type="button" onClick={() => setActiveTab("volume")} className={tabButtonClass("volume")}>
          Volume
        </button>
        <button type="button" onClick={() => setActiveTab("mesures")} className={tabButtonClass("mesures")}>
          Mesures
        </button>
      </div>

      <main className="flex flex-col gap-6 p-4 pt-6">
        {isLoading ? (
          <div className="rounded-2xl border border-white/5 bg-card-dark p-4 text-sm text-text-secondary">
            Chargement des statistiques...
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 p-4 text-sm text-rose-200">
            {errorMessage}
          </div>
        ) : null}

        {!isLoading ? (
          <>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-bold text-white">{chartTitle}</h2>
                {activeTab === "force" && forcePrPct !== null ? (
                  <span className="rounded-full bg-primary/20 px-2 py-1 text-xs font-bold text-primary">
                    PR {formatSignedNumber(forcePrPct, "%")}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-text-secondary">
                {chartSubtitle} <span className="mx-2">-</span>
                <span className="font-bold text-primary">30 derniers jours</span>
              </p>
            </div>

            <div className="relative mt-4 h-48 w-full">
              <div className="absolute inset-0 flex flex-col justify-between">
                {[...Array(4)].map((_, index) => (
                  <div
                    key={index}
                    className="w-full border-b border-dashed border-white/5"
                  />
                ))}
              </div>

              {chartGeometry ? (
                <svg
                  className="absolute inset-0 h-full w-full overflow-visible"
                  preserveAspectRatio="none"
                  viewBox="0 0 100 50"
                >
                  <defs>
                    <linearGradient id="statsGradientDynamic" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#13ec5b" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#13ec5b" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={chartGeometry.areaPath} fill="url(#statsGradientDynamic)" />
                  <path
                    d={chartGeometry.linePath}
                    fill="none"
                    stroke="#13ec5b"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                  {chartGeometry.dots.map((dot, index) => (
                    <circle
                      key={`dot-${index}`}
                      cx={dot.x}
                      cy={dot.y}
                      r="1.5"
                      className="fill-background-dark stroke-primary"
                      strokeWidth="0.5"
                    />
                  ))}
                </svg>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-text-secondary">
                  Pas assez de donnees pour afficher une courbe.
                </div>
              )}

              <div className="absolute -bottom-6 left-0 right-0 flex justify-between text-xs text-text-secondary">
                {chartPoints.slice(-4).map((point, index) => (
                  <span key={`${point.label}-${index}`}>{point.label}</span>
                ))}
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4">
              {activeTab === "force" ? (
                <>
                  <div className="flex flex-col gap-2 rounded-2xl border border-white/5 bg-card-dark p-4">
                    <div className="flex items-center gap-2 text-text-secondary">
                      <span className="material-symbols-outlined text-primary" style={{ fontSize: "18px" }}>
                        fitness_center
                      </span>
                      <span className="text-xs font-bold tracking-wider">CHARGE MAX</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-white">
                        {forceMaxWeightKg !== null ? Math.round(forceMaxWeightKg) : "--"}
                      </span>
                      <span className="text-sm text-text-secondary">kg</span>
                    </div>
                    <div className="text-xs text-primary">
                      {forceMonthDelta !== null
                        ? `${formatSignedNumber(forceMonthDelta, "kg")} vs mois dernier`
                        : "Pas assez d historique"}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 rounded-2xl border border-white/5 bg-card-dark p-4">
                    <div className="flex items-center gap-2 text-text-secondary">
                      <span className="material-symbols-outlined text-primary" style={{ fontSize: "18px" }}>
                        emoji_events
                      </span>
                      <span className="text-xs font-bold tracking-wider">1RM EST.</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-white">
                        {forceEstimated1RM !== null ? Math.round(forceEstimated1RM) : "--"}
                      </span>
                      <span className="text-sm text-text-secondary">kg</span>
                    </div>
                    <div className="text-xs text-primary">
                      {force1RmMonthDelta !== null
                        ? `${formatSignedNumber(force1RmMonthDelta, "kg")} vs mois dernier`
                        : "Pas assez d historique"}
                    </div>
                  </div>
                </>
              ) : null}

              {activeTab === "volume" ? (
                <>
                  <div className="flex flex-col gap-2 rounded-2xl border border-white/5 bg-card-dark p-4">
                    <div className="flex items-center gap-2 text-text-secondary">
                      <span className="material-symbols-outlined text-primary" style={{ fontSize: "18px" }}>
                        weight
                      </span>
                      <span className="text-xs font-bold tracking-wider">VOLUME 30J</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-white">
                        {Math.round(volumeRecent.volumeKg)}
                      </span>
                      <span className="text-sm text-text-secondary">kg</span>
                    </div>
                    <div className="text-xs text-primary">
                      {`${formatSignedNumber(volumeRecent.volumeDeltaKg, "kg")} vs mois dernier`}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 rounded-2xl border border-white/5 bg-card-dark p-4">
                    <div className="flex items-center gap-2 text-text-secondary">
                      <span className="material-symbols-outlined text-primary" style={{ fontSize: "18px" }}>
                        repeat
                      </span>
                      <span className="text-xs font-bold tracking-wider">REPS 30J</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-white">
                        {volumeRecent.reps}
                      </span>
                      <span className="text-sm text-text-secondary">reps</span>
                    </div>
                    <div className="text-xs text-primary">
                      {`${formatSignedNumber(volumeRecent.repsDelta, "")} vs mois dernier`}
                    </div>
                  </div>
                </>
              ) : null}

              {activeTab === "mesures" ? (
                <>
                  <div className="flex flex-col gap-2 rounded-2xl border border-white/5 bg-card-dark p-4">
                    <div className="flex items-center gap-2 text-text-secondary">
                      <span className="material-symbols-outlined text-primary" style={{ fontSize: "18px" }}>
                        monitor_weight
                      </span>
                      <span className="text-xs font-bold tracking-wider">POIDS</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-white">
                        {measuresSummary.currentWeightKg !== null
                          ? Math.round(measuresSummary.currentWeightKg)
                          : "--"}
                      </span>
                      <span className="text-sm text-text-secondary">kg</span>
                    </div>
                    <div className="text-xs text-primary">
                      {measuresSummary.deltaWeightKg !== null
                        ? `${formatSignedNumber(measuresSummary.deltaWeightKg, "kg")} vs mois dernier`
                        : "Pas assez d historique"}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 rounded-2xl border border-white/5 bg-card-dark p-4">
                    <div className="flex items-center gap-2 text-text-secondary">
                      <span className="material-symbols-outlined text-primary" style={{ fontSize: "18px" }}>
                        opacity
                      </span>
                      <span className="text-xs font-bold tracking-wider">MASSE GRASSE</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-white">
                        {measuresSummary.currentBodyFatPct !== null
                          ? formatPct(measuresSummary.currentBodyFatPct)
                          : "--"}
                      </span>
                    </div>
                    <div className="text-xs text-primary">
                      {measuresSummary.deltaBodyFatPct !== null
                        ? `${formatSignedNumber(measuresSummary.deltaBodyFatPct, "%")} vs mois dernier`
                        : "Pas assez d historique"}
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            {activeTab === "force" ? (
              <div className="mt-4 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">Seances recentes</h3>
                </div>

                <div className="flex flex-col gap-3">
                  {recentForceSessions.length > 0 ? (
                    recentForceSessions.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between rounded-2xl border border-white/5 bg-card-dark p-4"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                              entry.isHighlight
                                ? "bg-background-dark text-primary"
                                : "bg-background-dark text-text-secondary"
                            }`}
                          >
                            <span className="material-symbols-outlined">calendar_today</span>
                          </div>
                          <div>
                            <h4 className="font-bold text-white">{entry.title}</h4>
                            <p className="text-sm text-text-secondary">{entry.subtitle}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-white">{entry.value}</p>
                          <p className={`text-xs ${entry.isHighlight ? "text-primary" : "text-text-secondary"}`}>
                            {entry.valueLabel}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-white/5 bg-card-dark p-4 text-sm text-text-secondary">
                      Aucune seance terminee pour cet exercice.
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </main>
    </div>
  );
}
