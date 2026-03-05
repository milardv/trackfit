import { formatAxisTickValue, formatSignedNumber } from "../utils.ts";
import type { StatsChartPanelProps } from "./types.ts";

export function StatsChartPanel({
  activeTab,
  chartTitle,
  chartSubtitle,
  forceTrendPct,
  selectedExerciseFilter,
  exerciseFilterOptions,
  onExerciseFilterChange,
  forceYAxisLegend,
  axisConfig,
  chartGeometry,
  chartPoints,
  selectedForcePointId,
  onSelectForcePoint,
}: StatsChartPanelProps) {
  return (
    <>
      <div>
        <div className="flex items-center gap-3">
          <h2 className="text-3xl font-bold text-white">{chartTitle}</h2>
          {activeTab === "force" && forceTrendPct !== null ? (
            <span className="rounded-full bg-primary/20 px-2 py-1 text-xs font-bold text-primary">
              Evolution {formatSignedNumber(forceTrendPct, "%")}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-text-secondary">
          {chartSubtitle} <span className="mx-2">-</span>
          <span className="font-bold text-primary">30 derniers jours</span>
        </p>

        {activeTab === "force" ? (
          <div className="mt-4 flex flex-col gap-2">
            <label
              htmlFor="exercise-filter"
              className="text-xs font-bold uppercase tracking-wider text-text-secondary"
            >
              Filtre exercice
            </label>
            <div className="relative">
              <select
                id="exercise-filter"
                value={selectedExerciseFilter}
                onChange={(event) => onExerciseFilterChange(event.target.value)}
                className="h-12 w-full appearance-none rounded-xl border border-primary/20 bg-card-dark px-4 pr-10 text-sm font-medium text-white transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="all">Toutes les evolutions (score global)</option>
                {exerciseFilterOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary">
                expand_more
              </span>
            </div>
            <p className="text-xs text-primary">{forceYAxisLegend}</p>
          </div>
        ) : null}
      </div>

      <div className="relative mt-8 w-full">
        <div className="absolute -left-7 top-24 -rotate-90 text-[10px] font-bold uppercase tracking-widest text-text-secondary">
          {axisConfig.label}
        </div>

        <div className="flex min-h-[260px] pl-8">
          <div className="flex h-[200px] flex-col justify-between pb-8 pr-3 text-[11px] font-bold text-text-secondary">
            {axisConfig.ticks.map((tickValue, index) => (
              <span key={`tick-${index}`}>
                {formatAxisTickValue(tickValue, axisConfig.decimals)}
              </span>
            ))}
          </div>

          <div className="relative flex-1">
            {chartGeometry ? (
              <svg
                className="h-[200px] w-full overflow-visible"
                preserveAspectRatio="none"
                viewBox="0 0 100 50"
              >
                <defs>
                  <linearGradient id="statsGradientDynamic" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#13ec5b" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#13ec5b" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {axisConfig.ticks.map((_, index) => {
                  const y =
                    axisConfig.ticks.length === 1
                      ? 25
                      : (index / (axisConfig.ticks.length - 1)) * 50;

                  return (
                    <line
                      key={`grid-${index}`}
                      x1={0}
                      x2={100}
                      y1={y}
                      y2={y}
                      stroke="#2a3f30"
                      strokeWidth="0.6"
                      strokeDasharray="1.2 1.2"
                      vectorEffect="non-scaling-stroke"
                    />
                  );
                })}

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
                {chartGeometry.dots.map((dot, index) => {
                  const point = chartPoints[index];
                  const isForcePoint = activeTab === "force";
                  const isSelectedForcePoint =
                    isForcePoint && point.id === selectedForcePointId;
                  const dotRadius = isSelectedForcePoint ? 2.2 : 1.5;

                  return (
                    <circle
                      key={`dot-${point.id}`}
                      cx={dot.x}
                      cy={dot.y}
                      r={dotRadius}
                      className={
                        isSelectedForcePoint
                          ? "cursor-pointer fill-primary stroke-primary"
                          : isForcePoint
                            ? "cursor-pointer fill-background-dark stroke-primary"
                            : "fill-background-dark stroke-primary"
                      }
                      strokeWidth={isSelectedForcePoint ? 0.8 : 0.5}
                      onClick={
                        isForcePoint ? () => onSelectForcePoint(point.id) : undefined
                      }
                    />
                  );
                })}
              </svg>
            ) : (
              <div className="flex h-[200px] items-center justify-center text-sm text-text-secondary">
                Pas assez de donnees pour afficher une courbe.
              </div>
            )}

            <div className="mt-4 flex justify-between px-1 text-[11px] font-bold text-text-secondary">
              {chartPoints.slice(-4).map((point, index) => (
                <span key={`${point.label}-${index}`}>{point.label}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
