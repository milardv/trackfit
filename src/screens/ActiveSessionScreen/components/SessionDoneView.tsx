import type { SessionDoneViewProps } from "./types.ts";

export function SessionDoneView({ completedCount, onClose }: SessionDoneViewProps) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-primary/15 text-primary">
        <span className="material-symbols-outlined text-4xl">check_circle</span>
      </div>
      <h1 className="text-2xl font-extrabold text-white">Seance terminee</h1>
      <p className="max-w-[280px] text-sm text-slate-300">
        Bravo, tu as termine {completedCount} exercice{completedCount > 1 ? "s" : ""}.
      </p>
      <button
        type="button"
        onClick={onClose}
        className="mt-2 flex h-12 items-center justify-center rounded-xl bg-primary px-6 font-bold text-background-dark transition-colors hover:bg-[#0fdc53]"
      >
        Retour aux seances
      </button>
    </main>
  );
}
