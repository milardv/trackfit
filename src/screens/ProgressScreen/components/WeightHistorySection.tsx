import type { PeriodOption } from "../types.ts";
import { formatSignedNumber, formatWeightLabel } from "../utils.ts";
import type { WeightHistorySectionProps } from "./types.ts";

export function WeightHistorySection({
  period,
  onPeriodChange,
  points,
  geometry,
  currentWeightKg,
  deltaWeightKg,
}: WeightHistorySectionProps) {
  const bottomLabels =
    points.length > 0 ? points.slice(-4).map((point) => point.label) : ["-", "-", "-", "-"];

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xl font-bold tracking-tight text-white">Historique</h2>
        <select
          value={period}
          onChange={(event) => onPeriodChange(event.target.value as PeriodOption)}
          className="cursor-pointer bg-transparent text-sm font-medium text-primary focus:outline-none"
        >
          <option value="3m">3 derniers mois</option>
          <option value="6m">6 derniers mois</option>
          <option value="1y">Dernière année</option>
        </select>
      </div>

      <div className="rounded-2xl border border-white/5 bg-card-dark p-6 shadow-sm">
        <div className="mb-6 flex items-baseline gap-2">
          <h3 className="text-3xl font-bold text-white">
            {formatWeightLabel(currentWeightKg)}{" "}
            <span className="text-lg font-medium text-slate-400">kg</span>
          </h3>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
            {formatSignedNumber(deltaWeightKg, "kg")}
          </span>
        </div>

        <div className="relative h-48 w-full">
          {geometry ? (
            <svg
              className="h-full w-full overflow-visible"
              preserveAspectRatio="none"
              viewBox="0 0 100 50"
            >
              <defs>
                <linearGradient id="profileChartGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#13ec5b" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#13ec5b" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={geometry.areaPath} fill="url(#profileChartGradient)" />
              <path
                d={geometry.linePath}
                fill="none"
                stroke="#13ec5b"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
              {geometry.dots.map((dot, index) => (
                <circle
                  key={`${dot.id}-${index}`}
                  cx={dot.x}
                  cy={dot.y}
                  r={index === geometry.dots.length - 1 ? 2 : 1.5}
                  className={
                    index === geometry.dots.length - 1
                      ? "fill-primary stroke-background-dark"
                      : "fill-background-dark stroke-primary"
                  }
                  strokeWidth="0.5"
                />
              ))}
            </svg>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-text-secondary">
              Pas assez de mesures pour afficher la courbe.
            </div>
          )}

          <div className="absolute -bottom-6 left-0 right-0 flex justify-between text-xs font-medium text-slate-500">
            {bottomLabels.map((label, index) => (
              <span key={`${label}-${index}`}>{label}</span>
            ))}
          </div>
        </div>
        <div className="h-4" />
      </div>
    </section>
  );
}
