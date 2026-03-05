import type { ForceDetailsCardProps } from "./types.ts";

export function ForceDetailsCard({ selectedForcePoint }: ForceDetailsCardProps) {
  return (
    <div className="mt-8 rounded-2xl border border-primary/20 bg-card-dark p-4">
      {selectedForcePoint ? (
        <div className="flex flex-col gap-3">
          <h3 className="text-base font-bold text-white">
            {selectedForcePoint.detailTitle}
          </h3>
          <div className="grid grid-cols-1 gap-2">
            {selectedForcePoint.detailRows.map((row) => (
              <div
                key={`${selectedForcePoint.id}-${row.label}`}
                className="flex items-center justify-between rounded-lg bg-background-dark/60 px-3 py-2"
              >
                <span className="text-xs font-medium text-text-secondary">{row.label}</span>
                <span className="text-sm font-bold text-white">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-text-secondary">
          Selectionne une bulle de la courbe pour voir le detail.
        </p>
      )}
    </div>
  );
}
