import { useEffect, useMemo, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import type { TrackingMode } from "../types/firestore.ts";

const SETS_MIN = 1;
const SETS_MAX = 20;
const WEIGHT_MIN = 0;
const WEIGHT_MAX = 200;
const REPS_MIN = 1;
const REPS_MAX = 200;
const DURATION_MIN = 5;
const DURATION_MAX = 600;
const REST_MIN = 10;
const REST_MAX = 120;

type EffortType = "reps" | "duration";

interface FooterItem {
  icon: string;
  label: string;
  isActive?: boolean;
}

const FOOTER_ITEMS: FooterItem[] = [
  { icon: "home", label: "Accueil" },
  { icon: "history", label: "Historique" },
  { icon: "bar_chart", label: "Stats" },
  { icon: "person", label: "Profil", isActive: true },
];

export interface ExerciseConfig {
  name: string;
  sets: number;
  trackingMode: TrackingMode;
  reps: number | null;
  durationSec: number | null;
  weightKg: number | null;
  restSec: number;
}

interface ExerciseConfigScreenProps {
  onBack: () => void;
  onCreate: (config: ExerciseConfig) => Promise<void> | void;
  isSubmitting?: boolean;
  errorMessage?: string | null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toNumber(value: string): number | null {
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
}

export function ExerciseConfigScreen({
  onBack,
  onCreate,
  isSubmitting = false,
  errorMessage = null,
}: ExerciseConfigScreenProps) {
  const [name, setName] = useState("Gainage");
  const [sets, setSets] = useState(3);
  const [hasWeight, setHasWeight] = useState(false);
  const [weightKg, setWeightKg] = useState(20);
  const [reps, setReps] = useState(12);
  const [durationSec, setDurationSec] = useState(40);
  const [restSec, setRestSec] = useState(30);
  const [effortType, setEffortType] = useState<EffortType>("reps");

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onBack();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onBack]);

  const restProgress = useMemo(() => {
    const ratio = (restSec - REST_MIN) / (REST_MAX - REST_MIN);
    return clamp(Math.round(ratio * 100), 0, 100);
  }, [restSec]);

  const updateSets = (value: number) => {
    setSets(clamp(value, SETS_MIN, SETS_MAX));
  };

  const updateWeight = (value: number) => {
    setWeightKg(clamp(value, WEIGHT_MIN, WEIGHT_MAX));
  };

  const updateReps = (value: number) => {
    setReps(clamp(value, REPS_MIN, REPS_MAX));
  };

  const updateDuration = (value: number) => {
    setDurationSec(clamp(value, DURATION_MIN, DURATION_MAX));
  };

  const updateRest = (value: number) => {
    setRestSec(clamp(value, REST_MIN, REST_MAX));
  };

  const onEffortCardKeyDown = (
    event: ReactKeyboardEvent<HTMLDivElement>,
    nextType: EffortType,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setEffortType(nextType);
    }
  };

  const submitConfig = () => {
    const normalizedSets = clamp(sets, SETS_MIN, SETS_MAX);
    const normalizedWeight = clamp(weightKg, WEIGHT_MIN, WEIGHT_MAX);
    const normalizedReps = clamp(reps, REPS_MIN, REPS_MAX);
    const normalizedDuration = clamp(durationSec, DURATION_MIN, DURATION_MAX);
    const normalizedRest = clamp(restSec, REST_MIN, REST_MAX);

    const trackingMode: TrackingMode =
      effortType === "duration"
        ? "duration_only"
        : hasWeight
          ? "weight_reps"
          : "reps_only";

    void onCreate({
      name: name.trim() || "Exercice",
      sets: normalizedSets,
      trackingMode,
      reps: effortType === "reps" ? normalizedReps : null,
      durationSec: effortType === "duration" ? normalizedDuration : null,
      weightKg: effortType === "reps" && hasWeight ? normalizedWeight : null,
      restSec: normalizedRest,
    });
  };

  return (
    <div className="fixed inset-0 z-[95] flex min-h-screen flex-col bg-background-dark text-text-primary">
      <div className="relative flex h-full min-h-screen w-full flex-col overflow-hidden">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/5 bg-background-dark/90 px-4 py-4 backdrop-blur-md">
          <button
            type="button"
            onClick={onBack}
            className="flex size-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10"
            aria-label="Retour"
          >
            <span className="material-symbols-outlined text-2xl text-white">
              arrow_back
            </span>
          </button>
          <h2 className="flex-1 text-center text-lg font-bold leading-tight tracking-tight text-white">
            Configuration d&apos;Exercice
          </h2>
          <div className="size-10" />
        </header>

        <main className="hide-scrollbar mx-auto flex w-full max-w-md flex-1 flex-col overflow-y-auto px-4 pb-32">
          <div className="pb-6 pt-2">
            <h1 className="text-left text-[28px] font-bold leading-tight tracking-tight text-white">
              Personnalisez l&apos;effort
            </h1>
            <p className="text-base font-normal leading-normal text-text-secondary">
              Configurez les parametres selon le type d&apos;exercice.
            </p>
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold uppercase tracking-wider text-slate-200/80">
                Nom de l&apos;exercice
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="h-16 w-full rounded-xl border border-primary/20 bg-[#1c2e21] px-4 pr-12 text-xl font-medium text-white outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#6b8c78]">
                  <span className="material-symbols-outlined text-xl">edit</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold uppercase tracking-wider text-slate-200/80">
                Series
              </label>
              <div className="flex items-center gap-4 rounded-xl border border-primary/20 bg-[#1c2e21] p-2">
                <button
                  type="button"
                  onClick={() => updateSets(sets - 1)}
                  className="flex size-12 items-center justify-center rounded-lg border border-white/10 bg-card-dark text-primary transition-colors hover:border-primary/30"
                  aria-label="Retirer une serie"
                >
                  <span className="material-symbols-outlined">remove</span>
                </button>
                <input
                  type="number"
                  value={sets}
                  min={SETS_MIN}
                  max={SETS_MAX}
                  onChange={(event) => {
                    const next = toNumber(event.target.value);
                    updateSets(next ?? SETS_MIN);
                  }}
                  className="flex-1 bg-transparent p-0 text-center text-2xl font-bold text-white outline-none"
                />
                <button
                  type="button"
                  onClick={() => updateSets(sets + 1)}
                  className="flex size-12 items-center justify-center rounded-lg border border-white/10 bg-card-dark text-primary transition-colors hover:border-primary/30"
                  aria-label="Ajouter une serie"
                >
                  <span className="material-symbols-outlined">add</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <button
                type="button"
                onClick={() => setHasWeight((current) => !current)}
                className={`flex h-12 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-colors ${
                  hasWeight
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-white/10 bg-card-dark text-slate-200 hover:border-primary/30"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {hasWeight ? "remove_circle" : "add_circle"}
                </span>
                {hasWeight ? "Retirer le poids" : "Ajouter un poids"}
              </button>

              {hasWeight ? (
                <section className="flex flex-col gap-2 rounded-xl border border-white/10 bg-card-dark p-4">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-sm font-semibold uppercase tracking-wider text-white">
                      Poids (kg)
                    </p>
                    <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                      ACTIF
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => updateWeight(weightKg - 1)}
                      className="flex size-10 items-center justify-center rounded-full border border-white/10 bg-[#1c2e21] text-primary shadow-sm"
                      aria-label="Diminuer le poids"
                    >
                      <span className="material-symbols-outlined text-sm">remove</span>
                    </button>

                    <div className="flex-1 px-2">
                      <input
                        type="range"
                        min={WEIGHT_MIN}
                        max={WEIGHT_MAX}
                        value={weightKg}
                        onChange={(event) => updateWeight(Number(event.target.value))}
                        className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-primary"
                        aria-label="Regler le poids"
                      />
                      <div className="mt-2 text-center text-xl font-bold text-white">
                        {weightKg}{" "}
                        <span className="text-xs font-normal text-text-secondary">kg</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => updateWeight(weightKg + 1)}
                      className="flex size-10 items-center justify-center rounded-full border border-white/10 bg-[#1c2e21] text-primary shadow-sm"
                      aria-label="Augmenter le poids"
                    >
                      <span className="material-symbols-outlined text-sm">add</span>
                    </button>
                  </div>
                </section>
              ) : null}

              <div className="grid grid-cols-2 gap-4">
                <div
                  role="button"
                  tabIndex={0}
                  aria-pressed={effortType === "reps"}
                  onClick={() => setEffortType("reps")}
                  onKeyDown={(event) => onEffortCardKeyDown(event, "reps")}
                  className={`flex cursor-pointer flex-col gap-2 rounded-xl border p-4 text-left transition-opacity ${
                    effortType === "reps"
                      ? "border-primary/40 bg-card-dark opacity-100"
                      : "border-white/10 bg-card-dark opacity-60 hover:opacity-80"
                  }`}
                >
                  <p className="text-xs font-semibold uppercase text-white">
                    Mouvements
                  </p>
                  <div className="mt-2 flex items-center justify-center gap-2">
                    <input
                      type="number"
                      value={reps}
                      min={REPS_MIN}
                      max={REPS_MAX}
                      onFocus={() => setEffortType("reps")}
                      onChange={(event) => {
                        const next = toNumber(event.target.value);
                        updateReps(next ?? REPS_MIN);
                      }}
                      className="w-full bg-transparent p-0 text-center text-2xl font-bold text-white outline-none"
                    />
                  </div>
                  <p className="text-center text-[10px] font-medium italic text-text-secondary">
                    Reps
                  </p>
                </div>

                <div
                  role="button"
                  tabIndex={0}
                  aria-pressed={effortType === "duration"}
                  onClick={() => setEffortType("duration")}
                  onKeyDown={(event) => onEffortCardKeyDown(event, "duration")}
                  className={`flex cursor-pointer flex-col gap-2 rounded-xl border p-4 text-left transition-opacity ${
                    effortType === "duration"
                      ? "border-primary/40 bg-card-dark opacity-100"
                      : "border-white/10 bg-card-dark opacity-60 hover:opacity-80"
                  }`}
                >
                  <p className="text-xs font-semibold uppercase text-white">
                    Duree
                  </p>
                  <div className="mt-2 flex items-center justify-center gap-2">
                    <input
                      type="number"
                      value={durationSec}
                      min={DURATION_MIN}
                      max={DURATION_MAX}
                      onFocus={() => setEffortType("duration")}
                      onChange={(event) => {
                        const next = toNumber(event.target.value);
                        updateDuration(next ?? DURATION_MIN);
                      }}
                      className="w-full bg-transparent p-0 text-center text-2xl font-bold text-white outline-none"
                    />
                  </div>
                  <p className="text-center text-[10px] font-medium italic text-text-secondary">
                    Secondes
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold uppercase tracking-wider text-slate-200/80">
                Repos (sec)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={restSec}
                  min={REST_MIN}
                  max={REST_MAX}
                  onChange={(event) => {
                    const next = toNumber(event.target.value);
                    updateRest(next ?? REST_MIN);
                  }}
                  className="h-16 w-full rounded-xl border border-primary/20 bg-[#1c2e21] px-4 pr-14 text-xl font-medium text-white outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-medium text-[#6b8c78]">
                  sec
                </div>
              </div>

              <div className="w-full px-1 pt-2">
                <div className="relative h-4 w-full">
                  <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-white/10" />
                  <div
                    className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-primary"
                    style={{ width: `${restProgress}%` }}
                  />
                  <div
                    className="absolute top-1/2 size-4 -translate-y-1/2 rounded-full border-2 border-primary bg-white shadow-md"
                    style={{ left: `${restProgress}%`, transform: "translate(-50%, -50%)" }}
                  />
                  <input
                    type="range"
                    min={REST_MIN}
                    max={REST_MAX}
                    step={5}
                    value={restSec}
                    onChange={(event) => updateRest(Number(event.target.value))}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    aria-label="Regler le temps de repos"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10">
            <button
              type="button"
              onClick={submitConfig}
              disabled={isSubmitting}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary text-lg font-bold text-background-dark shadow-lg shadow-primary/20 transition-all hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <span className="material-symbols-outlined">check_circle</span>
              {isSubmitting ? "Creation..." : "Confirmer l exercice"}
            </button>
          </div>

          {errorMessage ? (
            <p className="mt-3 rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {errorMessage}
            </p>
          ) : null}
        </main>

        <footer className="fixed bottom-0 left-0 z-20 w-full border-t border-white/5 bg-background-dark/95 px-4 pb-6 pt-2 backdrop-blur-lg">
          <div className="mx-auto w-full max-w-md">
            <div className="flex justify-between items-end">
              {FOOTER_ITEMS.map((item) => (
                <div
                  key={item.label}
                  className="flex flex-1 flex-col items-center justify-end gap-1"
                >
                  <div
                    className={`flex h-8 items-center justify-center ${
                      item.isActive
                        ? "text-white"
                        : "text-text-secondary"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[24px]">
                      {item.icon}
                    </span>
                  </div>
                  <p
                    className={`text-xs font-medium leading-normal ${
                      item.isActive
                        ? "text-white"
                        : "text-text-secondary"
                    }`}
                  >
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
