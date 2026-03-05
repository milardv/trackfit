import { MEASURE_FIELDS, MEASURE_FIELD_CONFIG } from "../constants.ts";
import { formatMeasureFieldDisplay } from "../utils.ts";
import type { MeasuresFormSectionProps } from "./types.ts";

export function MeasuresFormSection({
  isVisible,
  onToggle,
  measureForm,
  onOpenField,
  onSave,
  isSaving,
  formError,
  formSuccess,
}: MeasuresFormSectionProps) {
  return (
    <div className="mt-8 flex flex-col gap-3">
      <button
        type="button"
        onClick={onToggle}
        className="flex h-12 w-full items-center justify-between rounded-xl border border-primary/20 bg-card-dark px-4 text-left text-sm font-bold text-white transition-colors hover:border-primary/40"
      >
        <span>
          {isVisible ? "Masquer l ajout de mesure" : "Ajouter une mesure"}
        </span>
        <span className="material-symbols-outlined text-primary">
          {isVisible ? "expand_less" : "expand_more"}
        </span>
      </button>

      {isVisible ? (
        <div className="rounded-2xl border border-primary/20 bg-card-dark p-4">
          <h3 className="text-base font-bold text-white">Ajouter une mesure</h3>
          <p className="mt-1 text-xs text-text-secondary">
            Renseigne ton poids et, si tu veux, tes pourcentages de masse grasse et
            de muscles.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3">
            <div className="grid grid-cols-1 gap-2">
              {MEASURE_FIELDS.map((field) => {
                const config = MEASURE_FIELD_CONFIG[field];
                const displayValue = formatMeasureFieldDisplay(field, measureForm[field]);

                return (
                  <button
                    key={field}
                    type="button"
                    onClick={() => onOpenField(field)}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-background-dark px-4 py-3 text-left transition-colors hover:border-primary/30"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                        {config.label}
                      </span>
                      <span className="text-base font-bold text-white">
                        {displayValue}
                      </span>
                    </div>
                    <span className="material-symbols-outlined text-text-secondary">
                      edit
                    </span>
                  </button>
                );
              })}
            </div>

            {formError ? (
              <p className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                {formError}
              </p>
            ) : null}

            {formSuccess ? (
              <p className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
                {formSuccess}
              </p>
            ) : null}

            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary font-bold text-background-dark transition-colors hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <span className="material-symbols-outlined text-[18px]">save</span>
              {isSaving ? "Enregistrement..." : "Ajouter la mesure"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
