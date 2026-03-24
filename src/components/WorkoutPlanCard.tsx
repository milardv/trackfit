import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
} from "react";

interface WorkoutPlanCardProps {
  name: string;
  gymName: string;
  exerciseCount: number;
  exerciseNames: string[];
  canStart?: boolean;
  onCardClick?: () => void;
  onCardKeyDown?: (event: ReactKeyboardEvent<HTMLElement>) => void;
  onStart?: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  startLabel?: string;
  onShare?: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  shareLabel?: string;
  isShareActive?: boolean;
  isShareDisabled?: boolean;
}

function getGymIcon(gymName: string): "location_on" | "home_pin" {
  return gymName.toLowerCase().includes("maison") ? "home_pin" : "location_on";
}

function getGymTone(gymName: string): string {
  return gymName.toLowerCase().includes("maison") ? "text-slate-300" : "text-primary";
}

export function WorkoutPlanCard({
  name,
  gymName,
  exerciseCount,
  exerciseNames,
  canStart = true,
  onCardClick,
  onCardKeyDown,
  onStart,
  startLabel = "DEMARRER",
  onShare,
  shareLabel = "RENDRE PUBLIQUE",
  isShareActive = false,
  isShareDisabled = false,
}: WorkoutPlanCardProps) {
  const visibleExercises = exerciseNames.slice(0, 3);
  const hiddenCount = Math.max(0, exerciseCount - visibleExercises.length);
  const isClickable = Boolean(onCardClick);

  return (
    <article
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onCardClick}
      onKeyDown={onCardKeyDown}
      className={`relative flex flex-col gap-5 overflow-hidden rounded-2xl border border-white/10 bg-card-dark p-5 shadow-sm transition-colors ${
        isClickable ? "cursor-pointer hover:border-primary/40" : ""
      }`}
    >
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1470&auto=format&fit=crop"
          alt="Salle de sport"
          className="h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/60 to-transparent" />
      </div>

      <div className="relative z-10 flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <div className={`flex items-center gap-2 ${getGymTone(gymName)}`}>
            <span className="material-symbols-outlined text-sm">{getGymIcon(gymName)}</span>
            <span className="text-xs font-bold uppercase tracking-wider">{gymName}</span>
          </div>
          <h3 className="text-xl font-bold text-white">{name}</h3>
        </div>
        <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-slate-100">
          {exerciseCount} exercices
        </span>
      </div>

      <div className="relative z-10 flex flex-wrap gap-2">
        {visibleExercises.map((exerciseName, index) => (
          <span
            key={`${name}-${exerciseName}-${index}`}
            className="rounded border border-white/20 bg-black/25 px-2 py-1 text-xs text-slate-100"
          >
            {exerciseName}
          </span>
        ))}
        {hiddenCount > 0 ? (
          <span className="px-2 py-1 text-xs font-medium text-slate-200">
            +{hiddenCount} autres
          </span>
        ) : null}
      </div>

      {!canStart ? (
        <p className="relative z-10 text-xs text-amber-200">
          Cette seance ne contient pas encore d exercices.
        </p>
      ) : null}

      <div className="relative z-10 flex gap-3">
        {onShare ? (
          <button
            type="button"
            onClick={onShare}
            disabled={isShareDisabled}
            className={`flex h-14 items-center justify-center gap-2 rounded-xl border px-4 font-extrabold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${
              isShareActive
                ? "border-primary/25 bg-primary/12 text-primary hover:bg-primary/18"
                : "border-white/10 bg-black/20 text-slate-100 hover:bg-white/10"
            }`}
          >
            <span className="material-symbols-outlined">
              {isShareActive ? "public" : "share"}
            </span>
            {shareLabel}
          </button>
        ) : null}

        <button
          type="button"
          onClick={onStart}
          disabled={!canStart}
          className="flex h-14 flex-1 items-center justify-center gap-2 rounded-xl bg-primary font-extrabold text-background-dark shadow-lg shadow-primary/10 transition-all hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="material-symbols-outlined">play_arrow</span>
          {startLabel}
        </button>
      </div>
    </article>
  );
}
