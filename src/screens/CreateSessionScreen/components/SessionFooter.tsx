import type { SessionFooterProps } from "./types.ts";

export function SessionFooter({
  displayedError,
  isBusy,
  isSubmitting,
  isEditMode,
  isDeleting,
  canDelete,
  onSave,
  onDelete,
}: SessionFooterProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 mx-auto w-full max-w-md border-t border-white/5 bg-background-dark/95 p-4 backdrop-blur-lg">
      {displayedError ? (
        <p className="mb-3 rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {displayedError}
        </p>
      ) : null}

      <button
        type="button"
        onClick={onSave}
        disabled={isBusy}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-lg font-bold text-slate-900 shadow-[0_0_20px_rgba(19,236,91,0.3)] transition-all active:scale-[0.98] hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
      >
        <span className="material-symbols-outlined">save</span>
        {isSubmitting
          ? "Enregistrement..."
          : isEditMode
            ? "Mettre a jour la seance"
            : "Enregistrer la seance"}
      </button>

      {canDelete ? (
        <button
          type="button"
          onClick={onDelete}
          disabled={isBusy}
          className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-rose-400/40 bg-rose-500/10 text-sm font-bold text-rose-200 transition-colors hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-[18px]">delete</span>
          {isDeleting ? "Suppression..." : "Supprimer la seance"}
        </button>
      ) : null}
    </div>
  );
}
