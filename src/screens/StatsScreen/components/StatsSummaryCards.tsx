import {
  formatPct,
  formatSignedNumber,
  formatValueForUnit,
  getUnitSuffix,
} from "../utils.ts";
import type { StatsSummaryCardsProps } from "./types.ts";

export function StatsSummaryCards({
  activeTab,
  forceSummary,
  forceTrendPct,
  forceValueUnit,
  volumeRecent,
  measuresSummary,
}: StatsSummaryCardsProps) {
  return (
    <div className="mt-8 grid grid-cols-2 gap-4">
      {activeTab === "force" ? (
        <>
          <div className="flex flex-col gap-2 rounded-2xl border border-white/5 bg-card-dark p-4">
            <div className="flex items-center gap-2 text-text-secondary">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: "18px" }}>
                fitness_center
              </span>
              <span className="text-xs font-bold tracking-wider">DERNIERE VALEUR</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-white">
                {formatValueForUnit(forceSummary.currentValue, forceValueUnit)}
              </span>
              <span className="text-sm text-text-secondary">{forceValueUnit}</span>
            </div>
            <div className="text-xs text-primary">
              {forceTrendPct !== null
                ? `${formatSignedNumber(forceTrendPct, "%")} depuis le debut`
                : "Pas assez d historique"}
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-2xl border border-white/5 bg-card-dark p-4">
            <div className="flex items-center gap-2 text-text-secondary">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: "18px" }}>
                emoji_events
              </span>
              <span className="text-xs font-bold tracking-wider">MEILLEUR NIVEAU</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-white">
                {formatValueForUnit(forceSummary.bestValue, forceValueUnit)}
              </span>
              <span className="text-sm text-text-secondary">{forceValueUnit}</span>
            </div>
            <div className="text-xs text-primary">
              {forceSummary.monthDelta !== null
                ? `${formatSignedNumber(forceSummary.monthDelta, getUnitSuffix(forceValueUnit))} vs mois dernier`
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
              <span className="text-3xl font-bold text-white">{volumeRecent.reps}</span>
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

          <div className="flex flex-col gap-2 rounded-2xl border border-white/5 bg-card-dark p-4">
            <div className="flex items-center gap-2 text-text-secondary">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: "18px" }}>
                monitoring
              </span>
              <span className="text-xs font-bold tracking-wider">MUSCLES</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-white">
                {measuresSummary.currentMusclePct !== null
                  ? formatPct(measuresSummary.currentMusclePct)
                  : "--"}
              </span>
            </div>
            <div className="text-xs text-primary">
              {measuresSummary.deltaMusclePct !== null
                ? `${formatSignedNumber(measuresSummary.deltaMusclePct, "%")} vs mois dernier`
                : "Pas assez d historique"}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
