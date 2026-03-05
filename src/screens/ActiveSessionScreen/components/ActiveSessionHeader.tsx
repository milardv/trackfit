import type { ActiveSessionHeaderProps } from "./types.ts";

export function ActiveSessionHeader({
  view,
  planName,
  activeExerciseName,
  onBack,
  onClose,
}: ActiveSessionHeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/5 bg-[#1a3322]/80 px-4 py-4 backdrop-blur-md">
      <button
        type="button"
        onClick={onBack}
        className="flex size-10 items-center justify-center rounded-full text-slate-100 transition-colors hover:bg-white/10"
        aria-label="Retour"
      >
        <span className="material-symbols-outlined">arrow_back</span>
      </button>
      <h2 className="flex-1 truncate px-2 text-center text-lg font-bold text-white">
        {view === "exercise_active" && activeExerciseName
          ? `${activeExerciseName} - Workout`
          : planName}
      </h2>
      <button
        type="button"
        onClick={onClose}
        className="flex size-10 items-center justify-center rounded-full text-slate-100 transition-colors hover:bg-white/10"
        aria-label="Fermer"
      >
        <span className="material-symbols-outlined">close</span>
      </button>
    </header>
  );
}
