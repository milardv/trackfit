import { formatPct, formatSignedNumber, formatWeightLabel } from "../utils.ts";
import type { BodyCompositionCardsProps } from "./types.ts";

export function BodyCompositionCards({ summary }: BodyCompositionCardsProps) {
  const weightTrendIcon =
    summary.deltaWeightKg === null
      ? "remove"
      : summary.deltaWeightKg > 0
        ? "trending_up"
        : "trending_down";
  const bodyFatTrendIcon =
    summary.deltaBodyFatPct === null
      ? "remove"
      : summary.deltaBodyFatPct > 0
        ? "trending_up"
        : "trending_down";

  return (
    <section className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2 rounded-2xl border border-white/5 bg-card-dark p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: "20px" }}>
              monitor_weight
            </span>
            <p className="text-sm font-medium text-text-secondary">Poids</p>
          </div>
          <div className="flex items-end gap-2">
            <p className="text-2xl font-bold tracking-tight text-white">
              {formatWeightLabel(summary.currentWeightKg)}{" "}
              <span className="text-sm font-normal text-slate-400">kg</span>
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs font-medium text-primary">
            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
              {weightTrendIcon}
            </span>
            <span>{formatSignedNumber(summary.deltaWeightKg, "kg")}</span>
            <span className="ml-1 font-normal text-slate-500">vs mois dernier</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-2xl border border-white/5 bg-card-dark p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: "20px" }}>
              opacity
            </span>
            <p className="text-sm font-medium text-text-secondary">Masse grasse</p>
          </div>
          <div className="flex items-end gap-2">
            <p className="text-2xl font-bold tracking-tight text-white">
              {formatPct(summary.currentBodyFatPct)}
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs font-medium text-primary">
            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
              {bodyFatTrendIcon}
            </span>
            <span>{formatSignedNumber(summary.deltaBodyFatPct, "%")}</span>
            <span className="ml-1 font-normal text-slate-500">vs mois dernier</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-card-dark p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary" style={{ fontSize: "20px" }}>
            exercise
          </span>
          <p className="text-sm font-medium text-text-secondary">Masse musculaire</p>
        </div>
        <div className="flex items-end gap-3">
          <p className="text-lg font-bold text-white">{formatPct(summary.currentMusclePct)}</p>
          <span className="text-xs font-medium text-primary">
            {formatSignedNumber(summary.deltaMusclePct, "%")}
          </span>
        </div>
      </div>
    </section>
  );
}
