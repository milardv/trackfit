import type { SessionMetaFormProps } from "./types.ts";

export function SessionMetaForm({
  name,
  gymName,
  onNameChange,
  onGymNameChange,
}: SessionMetaFormProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="session-name" className="text-base font-medium text-slate-200">
          Nom de la seance
        </label>
        <input
          id="session-name"
          type="text"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="ex: Seance Keep Cool"
          className="h-14 w-full rounded-xl border border-primary/20 bg-[#1c2e21] px-4 text-base text-white transition-colors placeholder:text-slate-500 focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="session-gym" className="text-base font-medium text-slate-200">
          Lieu
        </label>
        <div className="relative flex items-center">
          <input
            id="session-gym"
            type="text"
            value={gymName}
            onChange={(event) => onGymNameChange(event.target.value)}
            placeholder="ex: Basic Fit"
            className="h-14 w-full rounded-xl border border-primary/20 bg-[#1c2e21] px-4 pr-12 text-base text-white transition-colors placeholder:text-slate-500 focus:border-primary focus:ring-1 focus:ring-primary"
          />
          <div className="pointer-events-none absolute right-4 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined">location_on</span>
          </div>
        </div>
      </div>
    </div>
  );
}
