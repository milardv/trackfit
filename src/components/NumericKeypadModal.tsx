interface NumericKeypadModalProps {
  title: string;
  unit: string;
  displayValue: string;
  errorMessage?: string | null;
  onClose: () => void;
  onDigit: (digit: string) => void;
  onDecimal: () => void;
  onBackspace: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
}

export function NumericKeypadModal({
  title,
  unit,
  displayValue,
  errorMessage = null,
  onClose,
  onDigit,
  onDecimal,
  onBackspace,
  onConfirm,
  confirmLabel = "Valider",
}: NumericKeypadModalProps) {
  return (
    <div className="fixed inset-0 z-[130] bg-background-dark text-white">
      <div className="mx-auto flex h-full w-full max-w-md flex-col">
        <header className="flex items-center justify-between px-4 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex size-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10"
            aria-label="Fermer le clavier numerique"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
          <h2 className="flex-1 px-2 text-center text-lg font-bold">{title}</h2>
          <div className="size-10" />
        </header>

        <div className="flex flex-1 flex-col items-center justify-center px-6">
          <div className="mb-10 flex flex-col items-center">
            <div className="flex items-baseline gap-1">
              <span className="text-7xl font-bold tracking-tight text-white">
                {displayValue}
              </span>
              <span className="mb-2 text-xl font-medium text-primary">{unit}</span>
            </div>
            <div className="mt-2 h-1 w-12 rounded-full bg-primary" />
          </div>

          <div className="grid w-full max-w-sm grid-cols-3 gap-3">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
              <button
                key={`digit-${digit}`}
                type="button"
                onClick={() => onDigit(digit)}
                className="flex h-16 w-full items-center justify-center rounded-xl bg-[#1c271f] text-2xl font-semibold text-white transition-colors active:bg-[#28392e] active:text-primary"
              >
                {digit}
              </button>
            ))}

            <button
              type="button"
              onClick={onDecimal}
              className="flex h-16 w-full items-center justify-center rounded-xl bg-[#1c271f] text-2xl font-semibold text-white transition-colors active:bg-[#28392e] active:text-primary"
            >
              ,
            </button>

            <button
              type="button"
              onClick={() => onDigit("0")}
              className="flex h-16 w-full items-center justify-center rounded-xl bg-[#1c271f] text-2xl font-semibold text-white transition-colors active:bg-[#28392e] active:text-primary"
            >
              0
            </button>

            <button
              type="button"
              onClick={onBackspace}
              className="flex h-16 w-full items-center justify-center rounded-xl bg-[#1c271f] text-slate-400 transition-colors active:bg-[#28392e] active:text-primary"
              aria-label="Effacer"
            >
              <span className="material-symbols-outlined text-3xl">backspace</span>
            </button>
          </div>

          {errorMessage ? (
            <p className="mt-4 rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              {errorMessage}
            </p>
          ) : null}
        </div>

        <div className="border-t border-white/10 p-6">
          <button
            type="button"
            onClick={onConfirm}
            className="flex h-14 w-full items-center justify-center rounded-full bg-primary text-lg font-bold text-background-dark transition-colors hover:bg-green-400"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
