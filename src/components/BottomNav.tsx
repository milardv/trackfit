import React from "react";

export type Screen = "home" | "workout" | "stats" | "progress";

interface BottomNavProps {
    currentScreen: Screen;
    setCurrentScreen: (screen: Screen) => void;
}

export function BottomNav({ currentScreen, setCurrentScreen }: BottomNavProps) {
    return (
        <nav className="fixed bottom-0 left-0 z-50 w-full border-t border-[#28392e] bg-[#1c271f]/95 backdrop-blur-lg pb-safe pt-2">
            <div className="flex items-center justify-around px-2 pb-4">
                <button
                    onClick={() => setCurrentScreen("home")}
                    className="group flex flex-1 flex-col items-center justify-center gap-1 p-1"
                >
                    <div
                        className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors ${currentScreen === "home" ? "bg-primary/20 text-primary" : "text-[#9db9a6] group-hover:text-primary"}`}
                    >
            <span
                className="material-symbols-outlined"
                style={{
                    fontSize: "24px",
                    fontVariationSettings:
                        currentScreen === "home" ? "'FILL' 1" : "'FILL' 0",
                }}
            >
              home
            </span>
                    </div>
                    <span
                        className={`text-[10px] font-medium transition-colors ${
                            currentScreen === "home"
                                ? "text-white"
                                : "text-[#9db9a6] group-hover:text-primary"
                        }`}
                    >
            Home
          </span>
                </button>

                <button
                    onClick={() => setCurrentScreen("workout")}
                    className="group flex flex-1 flex-col items-center justify-center gap-1 p-1"
                >
                    <div
                        className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors ${currentScreen === "workout" ? "bg-primary/20 text-primary" : "text-[#9db9a6] group-hover:text-primary"}`}
                    >
            <span
                className="material-symbols-outlined"
                style={{
                    fontSize: "24px",
                    fontVariationSettings:
                        currentScreen === "workout" ? "'FILL' 1" : "'FILL' 0",
                }}
            >
              fitness_center
            </span>
                    </div>
                    <span
                        className={`text-[10px] font-medium transition-colors ${
                            currentScreen === "workout"
                                ? "text-white"
                                : "text-[#9db9a6] group-hover:text-primary"
                        }`}
                    >
            Workouts
          </span>
                </button>

                <button
                    onClick={() => setCurrentScreen("stats")}
                    className="group flex flex-1 flex-col items-center justify-center gap-1 p-1"
                >
                    <div
                        className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors ${currentScreen === "stats" ? "bg-primary/20 text-primary" : "text-[#9db9a6] group-hover:text-primary"}`}
                    >
            <span
                className="material-symbols-outlined"
                style={{
                    fontSize: "24px",
                    fontVariationSettings:
                        currentScreen === "stats" ? "'FILL' 1" : "'FILL' 0",
                }}
            >
              monitoring
            </span>
                    </div>
                    <span
                        className={`text-[10px] font-medium transition-colors ${
                            currentScreen === "stats"
                                ? "text-white"
                                : "text-[#9db9a6] group-hover:text-primary"
                        }`}
                    >
            Stats
          </span>
                </button>

                <button
                    onClick={() => setCurrentScreen("progress")}
                    className="group flex flex-1 flex-col items-center justify-center gap-1 p-1"
                >
                    <div
                        className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors ${currentScreen === "progress" ? "bg-primary/20 text-primary" : "text-[#9db9a6] group-hover:text-primary"}`}
                    >
            <span
                className="material-symbols-outlined"
                style={{
                    fontSize: "24px",
                    fontVariationSettings:
                        currentScreen === "progress" ? "'FILL' 1" : "'FILL' 0",
                }}
            >
              person
            </span>
                    </div>
                    <span
                        className={`text-[10px] font-medium transition-colors ${
                            currentScreen === "progress"
                                ? "text-white"
                                : "text-[#9db9a6] group-hover:text-primary"
                        }`}
                    >
            Profile
          </span>
                </button>
            </div>
        </nav>
    );
}
