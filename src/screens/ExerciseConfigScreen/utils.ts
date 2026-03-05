export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function toNumber(value: string): number | null {
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
}
