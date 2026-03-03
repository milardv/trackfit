import { useEffect, useMemo, useState } from "react";

const DURATION_PRESETS = [30, 40, 60, 90];
const REST_MIN = 10;
const REST_MAX = 120;

export interface ExerciseConfig {
  name: string;
  sets: number;
  durationSec: number;
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

export function ExerciseConfigScreen({
  onBack,
  onCreate,
  isSubmitting = false,
  errorMessage = null,
}: ExerciseConfigScreenProps) {
  const [name, setName] = useState("Gainage");
  const [sets, setSets] = useState(3);
  const [durationSec, setDurationSec] = useState(40);
  const [restSec, setRestSec] = useState(30);

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

  return (
    <div className="fixed inset-0 z-[95] flex min-h-screen flex-col bg-background-dark text-text-primary">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/5 bg-background-dark/90 px-4 py-4 backdrop-blur-md">
        <button
          type="button"
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10"
          aria-label="Revenir au menu d ajout"
        >
          <span className="material-symbols-outlined text-[24px]">arrow_back</span>
        </button>
        <h2 className="flex-1 text-center text-lg font-bold tracking-tight text-white">
          Objectifs Gainage
        </h2>
        <div className="h-10 w-10" />
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col overflow-y-auto px-4 pb-28 pt-2">
        <h1 className="pb-2 text-left text-[28px] font-bold leading-tight tracking-tight text-white">
          Configurez votre exercice
        </h1>
        <p className="pb-6 text-base text-text-secondary">
          Definissez le nombre de series et les temps d effort.
        </p>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-base font-medium text-white">Nom de l exercice</label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-16 w-full rounded-xl border border-[#3b5443] bg-[#1c271f] px-4 pr-12 text-xl font-medium text-white outline-none transition-all placeholder:text-[#6b8c78] focus:border-primary focus:ring-1 focus:ring-primary"
              />
              <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#6b8c78]">
                <span className="material-symbols-outlined text-xl">edit</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-base font-medium text-white">Series</label>
            <div className="flex items-center gap-3 overflow-hidden rounded-xl border border-[#3b5443] bg-[#1c271f] p-2">
              <button
                type="button"
                onClick={() => setSets((value) => Math.max(1, value - 1))}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#28392e] text-primary transition-colors hover:bg-[#3b5443]"
                aria-label="Retirer une serie"
              >
                <span className="material-symbols-outlined">remove</span>
              </button>

              <input
                type="number"
                min={1}
                value={sets}
                onChange={(event) => {
                  const nextValue = Number(event.target.value);
                  setSets(Number.isFinite(nextValue) ? Math.max(1, nextValue) : 1);
                }}
                className="min-w-0 flex-1 appearance-none bg-transparent p-0 text-center text-2xl font-bold text-white outline-none"
              />

              <button
                type="button"
                onClick={() => setSets((value) => value + 1)}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#28392e] text-primary transition-colors hover:bg-[#3b5443]"
                aria-label="Ajouter une serie"
              >
                <span className="material-symbols-outlined">add</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-base font-medium text-white">Duree (sec)</label>
            <div className="relative">
              <input
                type="number"
                min={1}
                value={durationSec}
                onChange={(event) => {
                  const nextValue = Number(event.target.value);
                  setDurationSec(Number.isFinite(nextValue) ? Math.max(1, nextValue) : 1);
                }}
                className="h-16 w-full rounded-xl border border-[#3b5443] bg-[#1c271f] px-4 pr-14 text-xl font-medium text-white outline-none transition-all placeholder:text-[#6b8c78] focus:border-primary focus:ring-1 focus:ring-primary"
              />
              <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-medium text-[#6b8c78]">
                sec
              </div>
            </div>

            <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-2">
              {DURATION_PRESETS.map((preset) => {
                const isSelected = durationSec === preset;

                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setDurationSec(preset)}
                    className={
                      isSelected
                        ? "whitespace-nowrap rounded-full border border-primary bg-primary px-4 py-2 text-sm font-bold text-background-dark"
                        : "whitespace-nowrap rounded-full border border-transparent bg-[#1c271f] px-4 py-2 text-sm font-medium text-[#9db9a6] transition-colors hover:border-primary/50"
                    }
                  >
                    {preset}s
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-base font-medium text-white">Repos (sec)</label>
            <div className="relative">
              <input
                type="number"
                min={REST_MIN}
                max={REST_MAX}
                value={restSec}
                onChange={(event) => {
                  const nextValue = Number(event.target.value);
                  setRestSec(
                    Number.isFinite(nextValue)
                      ? clamp(nextValue, REST_MIN, REST_MAX)
                      : REST_MIN,
                  );
                }}
                className="h-16 w-full rounded-xl border border-[#3b5443] bg-[#1c271f] px-4 pr-14 text-xl font-medium text-white outline-none transition-all placeholder:text-[#6b8c78] focus:border-primary focus:ring-1 focus:ring-primary"
              />
              <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-medium text-[#6b8c78]">
                sec
              </div>
            </div>

            <div className="relative w-full px-1 pt-2">
              <div className="relative h-1 w-full rounded-full bg-[#28392e]">
                <div
                  className="absolute left-0 top-0 h-full rounded-full bg-primary"
                  style={{ width: `${restProgress}%` }}
                />
              </div>
              <input
                type="range"
                min={REST_MIN}
                max={REST_MAX}
                step={5}
                value={restSec}
                onChange={(event) => setRestSec(Number(event.target.value))}
                className="absolute inset-0 h-5 w-full cursor-pointer appearance-none bg-transparent"
                aria-label="Regler le temps de repos"
              />
            </div>
          </div>
        </div>

        <div className="mt-8">
          <button
            type="button"
            onClick={() =>
              void onCreate({
                name: name.trim() || "Exercice",
                sets,
                durationSec,
                restSec,
              })
            }
            disabled={isSubmitting}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary text-lg font-bold text-background-dark shadow-lg shadow-primary/20 transition-all hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <span className="material-symbols-outlined">play_arrow</span>
            {isSubmitting ? "Creation..." : "Creer"}
          </button>
          {errorMessage ? (
            <p className="mt-3 rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {errorMessage}
            </p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
