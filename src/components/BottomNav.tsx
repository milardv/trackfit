import { NAV_ITEMS, type Screen } from "../app/navigation.ts";

interface BottomNavProps {
  currentScreen: Screen;
  setCurrentScreen: (screen: Screen) => void;
  onQuickAdd: () => void;
}

export function BottomNav({
  currentScreen,
  setCurrentScreen,
  onQuickAdd,
}: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 z-50 w-full border-t border-[#28392e] bg-[#1c271f]/95 backdrop-blur-lg pb-safe pt-2">
      <div className="flex items-center justify-around px-2 pb-4">
        {NAV_ITEMS.map((item, index) => {
          const isActive = currentScreen === item.screen;

          return (
            <div
              key={item.screen}
              className="flex flex-1 items-center justify-center"
            >
              <button
                onClick={() => setCurrentScreen(item.screen)}
                className="group flex w-full flex-col items-center justify-center gap-1 p-1"
              >
                <div
                  className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors ${
                    isActive
                      ? "bg-primary/20 text-primary"
                      : "text-[#9db9a6] group-hover:text-primary"
                  }`}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: "24px",
                      fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                    }}
                  >
                    {item.icon}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-medium transition-colors ${
                    isActive
                      ? "text-white"
                      : "text-[#9db9a6] group-hover:text-primary"
                  }`}
                >
                  {item.label}
                </span>
              </button>

              {index === 1 ? (
                <button
                  type="button"
                  onClick={onQuickAdd}
                  className="mx-1 -mt-7 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-background-dark shadow-[0_0_20px_rgba(19,236,91,0.35)] transition-transform hover:scale-105 active:scale-95"
                  aria-label="Ajouter un exercice ou une seance"
                >
                  <span className="material-symbols-outlined text-[30px] font-semibold">
                    add
                  </span>
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
