import React from "react";

export function WorkoutScreen() {
    return (
        <div className="flex min-h-screen flex-col bg-background-dark pb-24">
            {/* Header */}
            <header className="sticky top-0 z-20 flex items-center justify-between bg-background-dark/90 px-4 py-4 backdrop-blur-md border-b border-white/5">
                <button className="flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/10">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="text-lg font-bold text-white">Delta R - Workout</h1>
                <button className="flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/10">
                    <span className="material-symbols-outlined">more_horiz</span>
                </button>
            </header>

            <main className="flex flex-col gap-8 p-4">
                {/* Timer */}
                <div className="flex justify-center gap-4 pt-4">
                    <div className="flex flex-col items-center gap-2">
                        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-card-dark border border-white/5">
                            <span className="text-3xl font-bold text-white">00</span>
                        </div>
                        <span className="text-xs font-bold tracking-wider text-text-secondary">
              HOURS
            </span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-card-dark border border-white/5">
                            <span className="text-3xl font-bold text-white">15</span>
                        </div>
                        <span className="text-xs font-bold tracking-wider text-text-secondary">
              MINUTES
            </span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-card-dark border border-white/5">
                            <span className="text-3xl font-bold text-primary">42</span>
                        </div>
                        <span className="text-xs font-bold tracking-wider text-primary">
              SECONDS
            </span>
                    </div>
                </div>

                {/* Current Exercise */}
                <div className="flex flex-col items-center gap-4 rounded-3xl bg-card-dark p-6 border border-white/5">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-primary">
            <span
                className="material-symbols-outlined"
                style={{ fontSize: "32px" }}
            >
              fitness_center
            </span>
                    </div>

                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-white">Dumbbell Curl</h2>
                        <p className="mt-1 text-text-secondary">
                            <span className="text-white">12kg</span> • 5 series of 10
                        </p>
                    </div>

                    <div className="mt-2 w-full">
                        <div className="mb-2 flex justify-between text-sm font-bold">
                            <span className="text-white">Progress</span>
                            <span className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">
                Set 2/5
              </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-background-dark">
                            <div className="h-full w-2/5 rounded-full bg-primary"></div>
                        </div>
                    </div>
                </div>

                {/* Session Log */}
                <div className="flex flex-col gap-3">
                    <h3 className="text-sm font-bold tracking-wider text-text-secondary">
                        SESSION LOG
                    </h3>

                    {/* Completed Set */}
                    <div className="flex items-center justify-between rounded-2xl bg-card-dark p-4 border border-white/5">
                        <div className="flex items-center gap-4">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-background-dark text-sm font-bold text-text-secondary">
                                1
                            </div>
                            <div>
                                <p className="font-bold text-text-secondary">10 Reps</p>
                                <p className="text-xs text-text-secondary/70">12kg</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 text-sm font-bold text-primary">
                            Completed
                            <span
                                className="material-symbols-outlined"
                                style={{ fontSize: "16px" }}
                            >
                check_circle
              </span>
                        </div>
                    </div>

                    {/* Current Set */}
                    <div className="flex items-center justify-between rounded-2xl bg-card-dark p-4 border border-primary shadow-[0_0_15px_rgba(19,236,91,0.1)] relative overflow-hidden">
                        <div className="absolute left-0 top-0 h-full w-1 bg-primary"></div>
                        <div className="flex items-center gap-4 pl-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-background-dark">
                                2
                            </div>
                            <div>
                                <p className="font-bold text-white">Current Set</p>
                                <p className="text-xs text-text-secondary">
                                    Target: 10 Reps @ 12kg
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 text-sm font-bold text-text-secondary">
                            In Progress
                            <span
                                className="material-symbols-outlined animate-spin"
                                style={{ fontSize: "16px" }}
                            >
                progress_activity
              </span>
                        </div>
                    </div>

                    {/* Upcoming Set */}
                    <div className="flex items-center justify-between rounded-2xl p-4 border border-dashed border-white/10">
                        <div className="flex items-center gap-4">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-card-dark text-sm font-bold text-text-secondary/50">
                                3
                            </div>
                            <div>
                                <p className="font-bold text-text-secondary/50">Upcoming</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Button */}
                <div className="mt-4 flex flex-col items-center gap-3">
                    <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-bold text-background-dark shadow-[0_0_20px_rgba(19,236,91,0.3)] text-lg">
                        <span className="material-symbols-outlined">timer</span>
                        LOG SET & REST
                    </button>
                    <p className="text-xs text-text-secondary">
                        Starts 60s rest timer automatically
                    </p>
                </div>
            </main>
        </div>
    );
}
