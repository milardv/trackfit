import type { TrackingMode } from "../../types/firestore.ts";
import { MEASURE_FIELD_CONFIG, shortDate, shortDateTime } from "./constants.ts";
import type {
  BodyMetricEntry,
  ChartAxisConfig,
  ChartBounds,
  ChartGeometry,
  ChartPoint,
  DetailRow,
  ExerciseFilterOption,
  ForceChartModel,
  ForceChartPoint,
  ForceSummary,
  ForceValueUnit,
  MeasureField,
  MeasuresSummary,
  SessionExerciseRow,
  StatsTab,
  VolumeRecentSummary,
} from "./types.ts";

export function toMillis(value: unknown): number {
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

export function formatSignedNumber(value: number | null, suffix: string): string {
  if (value === null || !Number.isFinite(value)) {
    return "N/A";
  }

  const rounded = Math.round(value * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded}${suffix}`;
}

export function formatPct(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "N/A";
  }
  return `${Math.round(value * 10) / 10}%`;
}

export function buildChart(
  points: ChartPoint[],
  bounds?: ChartBounds,
): ChartGeometry | null {
  if (points.length === 0) {
    return null;
  }

  const values = points.map((point) => point.value);
  const minValue = bounds?.min ?? Math.min(...values);
  const maxValue = bounds?.max ?? Math.max(...values);
  const safeRange = maxValue > minValue ? maxValue - minValue : 1;

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

export function roundToTenth(value: number): number {
  return Math.round(value * 10) / 10;
}

export function computeMedian(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

export function getComparableEffortMetric(entry: SessionExerciseRow): number {
  const completedOrTargetSets = Math.max(1, entry.completedSets || entry.targetSets);

  if (entry.trackingMode === "duration_only") {
    const targetDuration = (entry.targetDurationSec ?? 0) * completedOrTargetSets;
    return Math.max(0, entry.totalDurationSec, targetDuration);
  }

  if (entry.trackingMode === "reps_only") {
    const targetReps = (entry.targetReps ?? 0) * completedOrTargetSets;
    return Math.max(0, entry.totalReps, targetReps);
  }

  const targetVolume =
    (entry.targetWeightKg ?? 0) * (entry.targetReps ?? 0) * completedOrTargetSets;
  return Math.max(0, entry.totalVolumeKg, targetVolume);
}

export function getExerciseDisplayMetric(
  entry: SessionExerciseRow,
  mode: TrackingMode,
): number {
  const completedOrTargetSets = Math.max(1, entry.completedSets || entry.targetSets);

  if (mode === "duration_only") {
    const targetDuration = (entry.targetDurationSec ?? 0) * completedOrTargetSets;
    return Math.max(0, entry.totalDurationSec, targetDuration);
  }

  if (mode === "reps_only") {
    const targetReps = (entry.targetReps ?? 0) * completedOrTargetSets;
    return Math.max(0, entry.totalReps, targetReps);
  }

  const targetVolume =
    (entry.targetWeightKg ?? 0) * (entry.targetReps ?? 0) * completedOrTargetSets;
  return Math.max(0, entry.totalVolumeKg, targetVolume);
}

export function getForceModeConfig(mode: TrackingMode): {
  subtitle: string;
  yAxisLegend: string;
  valueUnit: ForceValueUnit;
  primaryLabel: string;
} {
  if (mode === "duration_only") {
    return {
      subtitle: "Evolution du temps total",
      yAxisLegend: "Ordonnees: temps total (sec)",
      valueUnit: "sec",
      primaryLabel: "Temps total",
    };
  }

  if (mode === "reps_only") {
    return {
      subtitle: "Evolution des mouvements totaux",
      yAxisLegend: "Ordonnees: mouvements totaux (reps)",
      valueUnit: "reps",
      primaryLabel: "Mouvements totaux",
    };
  }

  return {
    subtitle: "Evolution du volume total",
    yAxisLegend: "Ordonnees: volume total (kg)",
    valueUnit: "kg",
    primaryLabel: "Volume total",
  };
}

export function formatValueForUnit(
  value: number | null,
  unit: ForceValueUnit,
): string {
  if (value === null || !Number.isFinite(value)) {
    return "--";
  }

  if (unit === "pts") {
    return `${roundToTenth(value)}`;
  }

  return `${Math.round(value)}`;
}

export function getUnitSuffix(unit: ForceValueUnit): string {
  if (unit === "pts") {
    return " pts";
  }

  return ` ${unit}`;
}

export function getForceAxisLabel(unit: ForceValueUnit): string {
  if (unit === "reps") {
    return "Mouvements (reps)";
  }
  if (unit === "sec") {
    return "Temps (sec)";
  }
  if (unit === "kg") {
    return "Volume (kg)";
  }
  return "Score (pts)";
}

export function formatAxisTickValue(value: number, decimals: number): string {
  if (decimals <= 0) {
    return `${Math.round(value)}`;
  }
  return `${roundToTenth(value)}`;
}

export function normalizeNumericString(value: string): string {
  const normalized = value.replace(",", ".").replace(/[^0-9.]/g, "");
  const firstDotIndex = normalized.indexOf(".");
  if (firstDotIndex === -1) {
    return normalized;
  }

  const head = normalized.slice(0, firstDotIndex + 1);
  const tail = normalized.slice(firstDotIndex + 1).replace(/\./g, "");
  return `${head}${tail}`;
}

export function formatMeasureFieldDisplay(
  field: MeasureField,
  value: string,
): string {
  const config = MEASURE_FIELD_CONFIG[field];
  if (!value.trim()) {
    return "Non renseigne";
  }

  return `${value} ${config.unit}`;
}

export function parseOptionalNumber(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) {
    return null;
  }
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return Number.NaN;
  }
  return parsed;
}

export function buildExerciseFilterOptions(
  sessionExercises: SessionExerciseRow[],
): ExerciseFilterOption[] {
  const groups = new Map<string, ExerciseFilterOption>();

  sessionExercises.forEach((entry) => {
    const current = groups.get(entry.exerciseId);
    if (!current) {
      groups.set(entry.exerciseId, {
        id: entry.exerciseId,
        name: entry.exerciseNameSnapshot,
        trackingMode: entry.trackingMode,
        count: 1,
        lastMs: entry.sessionMs,
      });
      return;
    }

    const shouldUseCurrentLabel = entry.sessionMs >= current.lastMs;
    groups.set(entry.exerciseId, {
      ...current,
      name: shouldUseCurrentLabel ? entry.exerciseNameSnapshot : current.name,
      trackingMode: shouldUseCurrentLabel ? entry.trackingMode : current.trackingMode,
      count: current.count + 1,
      lastMs: Math.max(current.lastMs, entry.sessionMs),
    });
  });

  return [...groups.values()].sort((a, b) => {
    if (a.name !== b.name) {
      return a.name.localeCompare(b.name, "fr");
    }
    return b.lastMs - a.lastMs;
  });
}

export function buildForceChartModel(
  sessionExercises: SessionExerciseRow[],
  selectedExerciseOption: ExerciseFilterOption | null,
): ForceChartModel {
  if (sessionExercises.length === 0) {
    return {
      title: "Evolution globale",
      subtitle: "Score combine poids, repetitions et duree",
      yAxisLegend: "Ordonnees: score de performance (base 100)",
      valueUnit: "pts",
      points: [],
    };
  }

  if (!selectedExerciseOption) {
    const valuesByExercise = new Map<string, number[]>();
    sessionExercises.forEach((entry) => {
      const metricValue = getComparableEffortMetric(entry);
      if (metricValue <= 0) {
        return;
      }
      const current = valuesByExercise.get(entry.exerciseId) ?? [];
      current.push(metricValue);
      valuesByExercise.set(entry.exerciseId, current);
    });

    const baselineByExercise = new Map<string, number>();
    valuesByExercise.forEach((values, exerciseId) => {
      const baseline = computeMedian(values);
      baselineByExercise.set(exerciseId, baseline > 0 ? baseline : 1);
    });

    const sessionGroups = new Map<
      string,
      { sessionMs: number; entries: SessionExerciseRow[] }
    >();
    sessionExercises.forEach((entry) => {
      const current = sessionGroups.get(entry.sessionId);
      if (!current) {
        sessionGroups.set(entry.sessionId, {
          sessionMs: entry.sessionMs,
          entries: [entry],
        });
        return;
      }

      current.entries.push(entry);
      current.sessionMs = Math.max(current.sessionMs, entry.sessionMs);
    });

    const points = [...sessionGroups.entries()]
      .map(([sessionId, group]) => {
        const effortScores = group.entries
          .map((entry) => {
            const metricValue = getComparableEffortMetric(entry);
            if (metricValue <= 0) {
              return null;
            }
            const baseline = baselineByExercise.get(entry.exerciseId) ?? 1;
            return Math.min(300, (metricValue / baseline) * 100);
          })
          .filter((value): value is number => value !== null);

        if (effortScores.length === 0) {
          return null;
        }

        const score = roundToTenth(
          effortScores.reduce((sum, value) => sum + value, 0) / effortScores.length,
        );
        const totalVolumeKg = group.entries.reduce(
          (sum, entry) => sum + entry.totalVolumeKg,
          0,
        );
        const totalReps = group.entries.reduce((sum, entry) => sum + entry.totalReps, 0);
        const totalDurationSec = group.entries.reduce(
          (sum, entry) => sum + entry.totalDurationSec,
          0,
        );

        return {
          id: `session-${sessionId}`,
          sessionId,
          sessionMs: group.sessionMs,
          label: shortDate.format(new Date(group.sessionMs)),
          value: score,
          detailTitle: `Seance du ${shortDateTime.format(new Date(group.sessionMs))}`,
          detailRows: [
            { label: "Score global", value: `${Math.round(score)} pts` },
            {
              label: "Exercices comptabilises",
              value: `${group.entries.length}`,
            },
            { label: "Volume total", value: `${Math.round(totalVolumeKg)} kg` },
            { label: "Mouvements totaux", value: `${totalReps} reps` },
            { label: "Temps total", value: `${Math.round(totalDurationSec)} sec` },
          ],
        } satisfies ForceChartPoint;
      })
      .filter((point): point is ForceChartPoint => point !== null)
      .sort((a, b) => a.sessionMs - b.sessionMs)
      .slice(-12);

    return {
      title: "Evolution globale",
      subtitle: "Score combine poids, repetitions et duree",
      yAxisLegend: "Ordonnees: score de performance (base 100)",
      valueUnit: "pts",
      points,
    };
  }

  const modeConfig = getForceModeConfig(selectedExerciseOption.trackingMode);
  const exercisePoints = sessionExercises
    .filter((entry) => entry.exerciseId === selectedExerciseOption.id)
    .slice()
    .sort((a, b) => a.sessionMs - b.sessionMs)
    .slice(-12)
    .map((entry) => {
      const metricValue = getExerciseDisplayMetric(entry, selectedExerciseOption.trackingMode);
      const detailRows: DetailRow[] = [
        {
          label: modeConfig.primaryLabel,
          value: `${formatValueForUnit(metricValue, modeConfig.valueUnit)} ${modeConfig.valueUnit}`,
        },
        {
          label: "Series completees",
          value: `${entry.completedSets}/${entry.targetSets}`,
        },
      ];

      if (selectedExerciseOption.trackingMode !== "duration_only") {
        detailRows.push({
          label: "Mouvements realises",
          value: `${entry.totalReps} reps`,
        });
      }

      if (selectedExerciseOption.trackingMode === "duration_only") {
        detailRows.push({
          label: "Temps total",
          value: `${Math.round(entry.totalDurationSec)} sec`,
        });
      }

      if (selectedExerciseOption.trackingMode === "weight_reps") {
        detailRows.push({
          label: "Volume total",
          value: `${Math.round(entry.totalVolumeKg)} kg`,
        });
        if ((entry.targetWeightKg ?? 0) > 0) {
          detailRows.push({
            label: "Charge cible",
            value: `${Math.round(entry.targetWeightKg ?? 0)} kg`,
          });
        }
      }

      return {
        id: `${entry.sessionId}-${entry.id}`,
        sessionId: entry.sessionId,
        sessionMs: entry.sessionMs,
        label: shortDate.format(new Date(entry.sessionMs)),
        value: roundToTenth(metricValue),
        detailTitle: `${selectedExerciseOption.name} - ${shortDateTime.format(new Date(entry.sessionMs))}`,
        detailRows,
      } satisfies ForceChartPoint;
    });

  return {
    title: selectedExerciseOption.name,
    subtitle: modeConfig.subtitle,
    yAxisLegend: modeConfig.yAxisLegend,
    valueUnit: modeConfig.valueUnit,
    points: exercisePoints,
  };
}

export function computeForceSummary(points: ForceChartPoint[]): ForceSummary {
  if (points.length === 0) {
    return {
      currentValue: null,
      bestValue: null,
      monthDelta: null,
    };
  }

  const currentValue = points[points.length - 1].value;
  const bestValue = Math.max(...points.map((point) => point.value));
  const now = Date.now();
  const monthMs = 30 * 24 * 60 * 60 * 1000;
  const thisMonth = points.filter((point) => now - point.sessionMs <= monthMs);
  const previousMonth = points.filter(
    (point) => now - point.sessionMs > monthMs && now - point.sessionMs <= monthMs * 2,
  );
  const thisMonthBest =
    thisMonth.length > 0 ? Math.max(...thisMonth.map((point) => point.value)) : null;
  const previousMonthBest =
    previousMonth.length > 0
      ? Math.max(...previousMonth.map((point) => point.value))
      : null;

  return {
    currentValue: roundToTenth(currentValue),
    bestValue: roundToTenth(bestValue),
    monthDelta:
      thisMonthBest !== null && previousMonthBest !== null
        ? roundToTenth(thisMonthBest - previousMonthBest)
        : null,
  };
}

export function buildVolumeChartPoints(
  sessionExercises: SessionExerciseRow[],
): ChartPoint[] {
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
      id: `week-${index}`,
      label,
      value: Math.max(0, volume),
    });
  }

  return points;
}

export function computeVolumeRecent(
  sessionExercises: SessionExerciseRow[],
): VolumeRecentSummary {
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
}

export function buildMeasuresChartPoints(bodyMetrics: BodyMetricEntry[]): ChartPoint[] {
  return bodyMetrics
    .slice()
    .sort((a, b) => toMillis(a.measuredAt) - toMillis(b.measuredAt))
    .slice(-6)
    .map((entry) => ({
      id: `metric-${entry.id}`,
      label: shortDate.format(new Date(toMillis(entry.measuredAt))),
      value: entry.weightKg,
    }));
}

export function computeMeasuresSummary(
  bodyMetrics: BodyMetricEntry[],
): MeasuresSummary {
  if (bodyMetrics.length === 0) {
    return {
      currentWeightKg: null,
      currentBodyFatPct: null,
      currentMusclePct: null,
      deltaWeightKg: null,
      deltaBodyFatPct: null,
      deltaMusclePct: null,
    };
  }

  const latest = bodyMetrics[0];
  const latestMs = toMillis(latest.measuredAt);
  const older =
    bodyMetrics.find(
      (entry) => latestMs - toMillis(entry.measuredAt) >= 30 * 24 * 60 * 60 * 1000,
    ) ??
    bodyMetrics[1] ??
    null;

  const latestBodyFat = typeof latest.bodyFatPct === "number" ? latest.bodyFatPct : null;
  const olderBodyFat = older && typeof older.bodyFatPct === "number" ? older.bodyFatPct : null;
  const latestMuscle = typeof latest.musclePct === "number" ? latest.musclePct : null;
  const olderMuscle = older && typeof older.musclePct === "number" ? older.musclePct : null;

  return {
    currentWeightKg: latest.weightKg,
    currentBodyFatPct: latestBodyFat,
    currentMusclePct: latestMuscle,
    deltaWeightKg: older ? latest.weightKg - older.weightKg : null,
    deltaBodyFatPct:
      olderBodyFat !== null && latestBodyFat !== null
        ? latestBodyFat - olderBodyFat
        : null,
    deltaMusclePct:
      olderMuscle !== null && latestMuscle !== null
        ? latestMuscle - olderMuscle
        : null,
  };
}

export function buildChartAxisConfig(
  activeTab: StatsTab,
  chartPoints: ChartPoint[],
  forceValueUnit: ForceValueUnit,
): ChartAxisConfig {
  const values = chartPoints.map((point) => point.value);

  const unit: ForceValueUnit | "kg" = activeTab === "force" ? forceValueUnit : "kg";
  const label =
    activeTab === "force"
      ? getForceAxisLabel(forceValueUnit)
      : activeTab === "volume"
        ? "Volume (kg)"
        : "Poids (kg)";
  const range = values.length > 0 ? Math.max(...values) - Math.min(...values) : 0;
  const decimals = range < 1 ? 2 : range < 10 ? 1 : 0;

  if (values.length === 0) {
    return {
      label,
      decimals,
      min: 0,
      max: 4,
      ticks: [0, 0, 0, 0, 0],
    };
  }

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue;

  let axisMin: number;
  let axisMax: number;

  if (valueRange <= 0) {
    if (maxValue <= 0) {
      axisMin = 0;
      axisMax = 4;
    } else {
      const margin = Math.max(maxValue * 0.08, unit === "pts" ? 2 : 1);
      axisMin = maxValue - margin;
      axisMax = maxValue + margin;
    }
  } else {
    const margin = valueRange * 0.18;
    axisMin = minValue - margin;
    axisMax = maxValue + margin;
  }

  axisMin = Math.max(0, axisMin);

  if (axisMax <= axisMin) {
    axisMax = axisMin + 1;
  }

  const tickCount = 5;
  const step = (axisMax - axisMin) / (tickCount - 1);
  const ticks = Array.from({ length: tickCount }, (_, index) => axisMax - index * step);

  return {
    label,
    decimals,
    min: axisMin,
    max: axisMax,
    ticks,
  };
}
