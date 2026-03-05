export function getFirstName(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) {
    return "Sportif";
  }
  return trimmed.split(/\s+/)[0] ?? "Sportif";
}

export function buildAvatarUrl(displayName: string): string {
  const seed = encodeURIComponent(displayName || "TrackFit");
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3f4`;
}

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

export function formatDuration(durationSec: number | null): string {
  if (durationSec === null || !Number.isFinite(durationSec)) {
    return "--";
  }

  const totalSec = Math.max(0, Math.round(durationSec));
  const totalMin = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;

  if (totalMin >= 60) {
    const hours = Math.floor(totalMin / 60);
    const minutes = totalMin % 60;
    return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  }

  return `${totalMin}m ${String(seconds).padStart(2, "0")}s`;
}

export function formatSignedPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "--";
  }

  const rounded = Math.round(value);
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded}%`;
}

const sessionDateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const monthBadgeFormatter = new Intl.DateTimeFormat("fr-FR", { month: "short" });
const dayBadgeFormatter = new Intl.DateTimeFormat("fr-FR", { day: "2-digit" });

export function formatSessionDateTime(dateMs: number): string {
  return sessionDateTimeFormatter.format(new Date(dateMs));
}

export function getSessionBadge(dateMs: number): { month: string; day: string } {
  const month = monthBadgeFormatter
    .format(new Date(dateMs))
    .replace(".", "")
    .toUpperCase();
  const day = dayBadgeFormatter.format(new Date(dateMs));
  return { month, day };
}
