import type {
  BodyMetricEntry,
  PeriodOption,
  ProgressPhotoEntry,
  SessionEntry,
  SessionSummary,
  WeightChartGeometry,
  WeightChartPoint,
  WeightSummary,
} from "./types.ts";

export const shortDate = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
});

export function toMillis(value: unknown): number {
  if (
    value !== null &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof (value as { toMillis?: unknown }).toMillis === "function"
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }
  return Date.now();
}

export function roundToTenth(value: number): number {
  return Math.round(value * 10) / 10;
}

export function formatSignedNumber(value: number | null, suffix: string): string {
  if (value === null || !Number.isFinite(value)) {
    return "N/A";
  }
  const rounded = roundToTenth(value);
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded}${suffix}`;
}

export function formatPct(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "--";
  }
  return `${roundToTenth(value)}%`;
}

export function getPeriodMonths(period: PeriodOption): number {
  if (period === "6m") {
    return 6;
  }
  if (period === "1y") {
    return 12;
  }
  return 3;
}

export function buildWeightChartPoints(
  bodyMetrics: BodyMetricEntry[],
  period: PeriodOption,
): WeightChartPoint[] {
  const now = Date.now();
  const months = getPeriodMonths(period);
  const fromMs = now - months * 30 * 24 * 60 * 60 * 1000;

  return bodyMetrics
    .filter((entry) => toMillis(entry.measuredAt) >= fromMs)
    .slice()
    .sort((a, b) => toMillis(a.measuredAt) - toMillis(b.measuredAt))
    .slice(-6)
    .map((entry) => {
      const ms = toMillis(entry.measuredAt);
      return {
        id: entry.id,
        label: shortDate.format(new Date(ms)),
        value: entry.weightKg,
        ms,
      };
    });
}

export function buildWeightChartGeometry(
  points: WeightChartPoint[],
): WeightChartGeometry | null {
  if (points.length === 0) {
    return null;
  }

  const values = points.map((point) => point.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue;
  const margin = range > 0 ? range * 0.2 : Math.max(maxValue * 0.06, 1);
  const axisMin = Math.max(0, minValue - margin);
  const axisMax = maxValue + margin;
  const safeRange = Math.max(1, axisMax - axisMin);

  const dots = points.map((point, index) => {
    const x = points.length === 1 ? 50 : (index / (points.length - 1)) * 100;
    const y = 46 - ((point.value - axisMin) / safeRange) * 40;
    return { id: point.id, x, y };
  });

  const linePath = dots
    .map((dot, index) => `${index === 0 ? "M" : "L"}${dot.x} ${dot.y}`)
    .join(" ");
  const areaPath = `${linePath} L100 50 L0 50 Z`;

  return { linePath, areaPath, dots };
}

export function computeWeightSummary(bodyMetrics: BodyMetricEntry[]): WeightSummary {
  if (bodyMetrics.length === 0) {
    return {
      currentWeightKg: null,
      deltaWeightKg: null,
      currentBodyFatPct: null,
      deltaBodyFatPct: null,
      currentMusclePct: null,
      deltaMusclePct: null,
    };
  }

  const sorted = bodyMetrics
    .slice()
    .sort((a, b) => toMillis(b.measuredAt) - toMillis(a.measuredAt));
  const latest = sorted[0];
  const latestMs = toMillis(latest.measuredAt);
  const older =
    sorted.find((entry) => latestMs - toMillis(entry.measuredAt) >= 30 * 24 * 60 * 60 * 1000) ??
    sorted[1] ??
    null;

  const latestBodyFat = typeof latest.bodyFatPct === "number" ? latest.bodyFatPct : null;
  const olderBodyFat = older && typeof older.bodyFatPct === "number" ? older.bodyFatPct : null;
  const latestMuscle = typeof latest.musclePct === "number" ? latest.musclePct : null;
  const olderMuscle = older && typeof older.musclePct === "number" ? older.musclePct : null;

  return {
    currentWeightKg: latest.weightKg,
    deltaWeightKg: older ? latest.weightKg - older.weightKg : null,
    currentBodyFatPct: latestBodyFat,
    deltaBodyFatPct:
      latestBodyFat !== null && olderBodyFat !== null ? latestBodyFat - olderBodyFat : null,
    currentMusclePct: latestMuscle,
    deltaMusclePct:
      latestMuscle !== null && olderMuscle !== null ? latestMuscle - olderMuscle : null,
  };
}

export function computeSessionSummary(sessions: SessionEntry[]): SessionSummary {
  const completed = sessions.filter((session) => session.status === "completed");
  const now = Date.now();
  const monthMs = 30 * 24 * 60 * 60 * 1000;
  const thisMonthCount = completed.filter(
    (session) => now - toMillis(session.startedAt) <= monthMs,
  ).length;

  return {
    completedCount: completed.length,
    thisMonthCount,
  };
}

export function formatWeightLabel(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "--";
  }
  return `${roundToTenth(value)}`;
}

export function getFallbackPhoto(index: number): string {
  const photos = [
    "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=1470&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=1470&auto=format&fit=crop",
  ];
  return photos[index % photos.length] ?? photos[0];
}

export function inferMediaTypeFromUrl(url: string | null): "image" | "video" {
  if (typeof url !== "string" || url.trim().length === 0) {
    return "image";
  }

  const lower = url.toLowerCase();
  if (lower.includes("/video/upload/")) {
    return "video";
  }

  if (/\.(mp4|mov|webm|m4v)(\?|#|$)/.test(lower)) {
    return "video";
  }

  return "image";
}

export function resolveProgressPhotoMediaType(photo: ProgressPhotoEntry): "image" | "video" {
  if (photo.mediaType === "image" || photo.mediaType === "video") {
    return photo.mediaType;
  }

  return inferMediaTypeFromUrl(photo.mediaUrl ?? photo.storagePath ?? photo.previewUrl);
}
