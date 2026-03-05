import { clamp } from "../utils.ts";
import type { EffortPickerModalProps } from "./types.ts";

export function EffortPickerModal({
  pickerConfig,
  onClose,
  onUpdateValue,
}: EffortPickerModalProps) {
  if (!pickerConfig) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-[1px]"
        aria-label="Fermer le selecteur"
      />
      <section className="relative z-[121] w-full max-w-md rounded-t-2xl border-t border-white/10 bg-[#15231a] p-4 pb-6 shadow-2xl">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/20" />

        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-white">{pickerConfig.title}</h3>
            <p className="text-sm text-text-secondary">{pickerConfig.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full border border-white/10 text-text-secondary transition-colors hover:border-primary/30 hover:text-white"
            aria-label="Fermer"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              onUpdateValue(
                clamp(
                  pickerConfig.value - pickerConfig.step,
                  pickerConfig.min,
                  pickerConfig.max,
                ),
              )
            }
            className="flex size-12 items-center justify-center rounded-xl border border-white/10 bg-card-dark text-primary transition-colors hover:border-primary/40"
            aria-label="Diminuer"
          >
            <span className="material-symbols-outlined">remove</span>
          </button>

          <div className="flex flex-1 flex-col items-center rounded-xl border border-primary/20 bg-card-dark px-3 py-2">
            <p className="text-3xl font-extrabold text-white">{pickerConfig.value}</p>
            <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              {pickerConfig.unitLabel}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              onUpdateValue(
                clamp(
                  pickerConfig.value + pickerConfig.step,
                  pickerConfig.min,
                  pickerConfig.max,
                ),
              )
            }
            className="flex size-12 items-center justify-center rounded-xl border border-white/10 bg-card-dark text-primary transition-colors hover:border-primary/40"
            aria-label="Augmenter"
          >
            <span className="material-symbols-outlined">add</span>
          </button>
        </div>

        <input
          type="range"
          min={pickerConfig.min}
          max={pickerConfig.max}
          step={pickerConfig.step}
          value={pickerConfig.value}
          onChange={(event) => onUpdateValue(Number(event.target.value))}
          className="mb-4 h-2 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-primary"
          aria-label={`Regler ${pickerConfig.title.toLowerCase()}`}
        />

        <div className="mb-5 flex flex-wrap gap-2">
          {pickerConfig.presets.map((preset) => {
            const isActive = pickerConfig.value === preset;

            return (
              <button
                key={`${pickerConfig.title}-${preset}`}
                type="button"
                onClick={() => onUpdateValue(preset)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  isActive
                    ? "border-primary/40 bg-primary/20 text-primary"
                    : "border-white/10 bg-card-dark text-text-secondary hover:border-primary/30 hover:text-white"
                }`}
              >
                {preset} {pickerConfig.unitLabel}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-primary font-bold text-background-dark transition-colors hover:bg-green-400"
        >
          Valider
        </button>
      </section>
    </div>
  );
}
