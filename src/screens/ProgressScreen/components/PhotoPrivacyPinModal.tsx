import { useEffect } from "react";
import type { PhotoPrivacyPinModalProps } from "./types.ts";

const PIN_DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "backspace"] as const;

function getModalCopy(mode: NonNullable<PhotoPrivacyPinModalProps["mode"]>): {
  title: string;
  subtitle: string;
  submitLabel: string;
} {
  switch (mode) {
    case "create":
      return {
        title: "Creer ton code",
        subtitle: "Choisis 4 chiffres pour proteger l acces a ta galerie.",
        submitLabel: "Continuer",
      };
    case "confirm":
      return {
        title: "Confirmer le code",
        subtitle: "Retape le meme code pour l enregistrer.",
        submitLabel: "Confirmer",
      };
    case "unlock":
      return {
        title: "Deverrouiller les photos",
        subtitle: "Entre ton code a 4 chiffres pour afficher la galerie.",
        submitLabel: "Deverrouiller",
      };
  }
}

export function PhotoPrivacyPinModal({
  mode,
  value,
  error,
  isBusy,
  onDigit,
  onBackspace,
  onClear,
  onSubmit,
  onClose,
}: PhotoPrivacyPinModalProps) {
  useEffect(() => {
    if (!mode) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (/^\d$/.test(event.key)) {
        onDigit(event.key);
        return;
      }

      if (event.key === "Backspace") {
        onBackspace();
        return;
      }

      if (event.key === "Enter" && value.length === 4) {
        onSubmit();
        return;
      }

      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mode, onBackspace, onClose, onDigit, onSubmit, value.length]);

  if (!mode) {
    return null;
  }

  const { title, subtitle, submitLabel } = getModalCopy(mode);

  return (
    <div className="fixed inset-0 z-[130] flex items-end justify-center">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Fermer la saisie du code"
      />

      <section
        role="dialog"
        aria-modal="true"
        className="relative z-[131] w-full max-w-md rounded-t-[32px] border-t border-white/10 bg-[#102216] px-5 pb-8 pt-4 shadow-[0_-18px_60px_rgba(0,0,0,0.35)]"
      >
        <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-white/20" />

        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-black tracking-tight text-white">{title}</h3>
            <p className="mt-1 max-w-[280px] text-sm leading-relaxed text-slate-400">
              {subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="flex size-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-200 transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Fermer"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="mb-4 rounded-[28px] border border-primary/15 bg-[linear-gradient(160deg,rgba(19,236,91,0.10)_0%,rgba(16,34,22,0.78)_100%)] p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary/80">
              Code a 4 chiffres
            </span>
            {value.length > 0 ? (
              <button
                type="button"
                onClick={onClear}
                disabled={isBusy}
                className="text-xs font-semibold text-slate-300 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Effacer
              </button>
            ) : null}
          </div>

          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, index) => {
              const isFilled = index < value.length;

              return (
                <div
                  key={`${mode}-pin-slot-${index}`}
                  className={`flex h-16 items-center justify-center rounded-2xl border text-2xl font-black transition-colors ${
                    isFilled
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-white/10 bg-white/[0.03] text-slate-500"
                  }`}
                >
                  {isFilled ? "•" : ""}
                </div>
              );
            })}
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-3 gap-3">
          {PIN_DIGITS.map((digit) => {
            if (digit === "clear") {
              return (
                <button
                  key={`${mode}-clear`}
                  type="button"
                  onClick={onClear}
                  disabled={isBusy || value.length === 0}
                  className="flex h-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-bold text-slate-200 transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Effacer
                </button>
              );
            }

            if (digit === "backspace") {
              return (
                <button
                  key={`${mode}-backspace`}
                  type="button"
                  onClick={onBackspace}
                  disabled={isBusy || value.length === 0}
                  className="flex h-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-200 transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Supprimer le dernier chiffre"
                >
                  <span className="material-symbols-outlined">backspace</span>
                </button>
              );
            }

            return (
              <button
                key={`${mode}-${digit}`}
                type="button"
                onClick={() => onDigit(digit)}
                disabled={isBusy || value.length >= 4}
                className="flex h-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-xl font-black text-white transition-colors hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                {digit}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onSubmit}
          disabled={isBusy || value.length !== 4}
          className="mt-5 flex h-[52px] w-full items-center justify-center rounded-2xl bg-primary text-sm font-black uppercase tracking-[0.18em] text-background-dark transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isBusy ? "Chargement..." : submitLabel}
        </button>
      </section>
    </div>
  );
}
