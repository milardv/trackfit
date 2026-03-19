import type { ExerciseEditModalProps } from "./types.ts";

function toText(value: number | null): string {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "";
}

export function ExerciseEditModal({
  draft,
  isSaving,
  isRemoving = false,
  errorMessage,
  canRemove = false,
  onChange,
  onClose,
  onSave,
  onRemove,
}: ExerciseEditModalProps) {
  const isBusy = isSaving || isRemoving;

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/80 p-4 sm:items-center">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-background-dark">
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h3 className="text-lg font-bold text-white">Modifier l exercice</h3>
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-card-dark text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Fermer la modification"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        <div className="hide-scrollbar flex flex-1 flex-col gap-3 overflow-y-auto p-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              Nom
            </span>
            <input
              type="text"
              value={draft.exerciseName}
              onChange={(event) => onChange({ exerciseName: event.target.value })}
              className="h-10 rounded-lg border border-white/10 bg-card-dark px-3 text-sm text-white outline-none transition-colors focus:border-primary/40"
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                Series
              </span>
              <input
                type="number"
                min={1}
                value={draft.targetSets}
                onChange={(event) =>
                  onChange({
                    targetSets: Math.max(
                      1,
                      Number.parseInt(event.target.value || "1", 10) || 1,
                    ),
                  })
                }
                className="h-10 rounded-lg border border-white/10 bg-card-dark px-3 text-sm text-white outline-none transition-colors focus:border-primary/40"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                Repos (sec)
              </span>
              <input
                type="number"
                min={0}
                value={draft.restSec}
                onChange={(event) =>
                  onChange({
                    restSec: Math.max(
                      0,
                      Number.parseInt(event.target.value || "0", 10) || 0,
                    ),
                  })
                }
                className="h-10 rounded-lg border border-white/10 bg-card-dark px-3 text-sm text-white outline-none transition-colors focus:border-primary/40"
              />
            </label>
          </div>

          {draft.trackingMode !== "duration_only" ? (
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                Repetitions cibles
              </span>
              <input
                type="number"
                min={0}
                value={toText(draft.targetReps)}
                onChange={(event) => {
                  const raw = event.target.value;
                  onChange({
                    targetReps:
                      raw.trim().length === 0
                        ? null
                        : Math.max(0, Number.parseInt(raw, 10) || 0),
                  });
                }}
                className="h-10 rounded-lg border border-white/10 bg-card-dark px-3 text-sm text-white outline-none transition-colors focus:border-primary/40"
              />
            </label>
          ) : null}

          {draft.trackingMode === "weight_reps" ? (
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                Poids cible (kg)
              </span>
              <input
                type="number"
                min={0}
                step="0.5"
                value={toText(draft.targetWeightKg)}
                onChange={(event) => {
                  const raw = event.target.value;
                  onChange({
                    targetWeightKg:
                      raw.trim().length === 0
                        ? null
                        : Math.max(0, Number.parseFloat(raw) || 0),
                  });
                }}
                className="h-10 rounded-lg border border-white/10 bg-card-dark px-3 text-sm text-white outline-none transition-colors focus:border-primary/40"
              />
            </label>
          ) : null}

          {draft.trackingMode === "duration_only" ? (
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                Duree cible (sec)
              </span>
              <input
                type="number"
                min={0}
                value={toText(draft.targetDurationSec)}
                onChange={(event) => {
                  const raw = event.target.value;
                  onChange({
                    targetDurationSec:
                      raw.trim().length === 0
                        ? null
                        : Math.max(0, Number.parseInt(raw, 10) || 0),
                  });
                }}
                className="h-10 rounded-lg border border-white/10 bg-card-dark px-3 text-sm text-white outline-none transition-colors focus:border-primary/40"
              />
            </label>
          ) : null}

          <p className="text-xs text-slate-400">
            Sets deja enregistres: {draft.loggedSetsCount}
          </p>

          {onRemove && !canRemove ? (
            <p className="text-xs text-amber-200">
              Un exercice avec des sets enregistres ne peut plus etre retire de la seance.
            </p>
          ) : null}

          {errorMessage ? (
            <p className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              {errorMessage}
            </p>
          ) : null}
        </div>

        <footer
          className={`grid gap-2 border-t border-white/10 p-4 ${
            onRemove ? "grid-cols-3" : "grid-cols-2"
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="flex h-11 items-center justify-center rounded-xl border border-white/20 bg-card-dark text-sm font-semibold text-white transition-colors hover:border-white/35 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Annuler
          </button>
          {onRemove ? (
            <button
              type="button"
              onClick={onRemove}
              disabled={isBusy || !canRemove}
              className="flex h-11 items-center justify-center rounded-xl border border-rose-400/30 bg-rose-500/10 text-sm font-bold text-rose-200 transition-colors hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRemoving ? "Retrait..." : "Retirer"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onSave}
            disabled={isBusy}
            className="flex h-11 items-center justify-center rounded-xl bg-primary text-sm font-bold text-background-dark transition-colors hover:bg-[#0fdc53] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </footer>
      </div>
    </div>
  );
}
