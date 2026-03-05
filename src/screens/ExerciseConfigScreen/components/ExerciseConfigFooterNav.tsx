import type { ExerciseConfigFooterNavProps } from "./types.ts";

export function ExerciseConfigFooterNav({ items }: ExerciseConfigFooterNavProps) {
  return (
    <footer className="fixed bottom-0 left-0 z-20 w-full border-t border-white/5 bg-background-dark/95 px-4 pb-6 pt-2 backdrop-blur-lg">
      <div className="mx-auto w-full max-w-md">
        <div className="flex justify-between items-end">
          {items.map((item) => (
            <div
              key={item.label}
              className="flex flex-1 flex-col items-center justify-end gap-1"
            >
              <div
                className={`flex h-8 items-center justify-center ${
                  item.isActive ? "text-white" : "text-text-secondary"
                }`}
              >
                <span className="material-symbols-outlined text-[24px]">
                  {item.icon}
                </span>
              </div>
              <p
                className={`text-xs font-medium leading-normal ${
                  item.isActive ? "text-white" : "text-text-secondary"
                }`}
              >
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}
