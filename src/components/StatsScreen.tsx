export function StatsScreen() {
    return (
        <div className="flex min-h-screen flex-col bg-background-dark pb-24">
            {/* Header */}
            <header className="sticky top-0 z-20 flex items-center justify-between bg-background-dark/90 px-4 py-4 backdrop-blur-md border-b border-white/5">
                <button className="flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/10">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="text-lg font-bold text-white">Analyse de performance</h1>
                <button className="flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/10">
                    <span className="material-symbols-outlined">more_vert</span>
                </button>
            </header>

            {/* Tabs */}
            <div className="flex border-b border-white/5 px-4">
                <button className="flex-1 border-b-2 border-primary py-4 text-sm font-bold text-white">
                    Force
                </button>
                <button className="flex-1 py-4 text-sm font-bold text-text-secondary">
                    Volume
                </button>
                <button className="flex-1 py-4 text-sm font-bold text-text-secondary">
                    Mesures
                </button>
            </div>

            <main className="flex flex-col gap-6 p-4 pt-6">
                {/* Chart Header */}
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-3xl font-bold text-white">
                            Developpe incline
                        </h2>
                        <span className="rounded-full bg-primary/20 px-2 py-1 text-xs font-bold text-primary">
              PR +5%
            </span>
                    </div>
                    <p className="mt-1 text-sm text-text-secondary">
                        Progression de charge (kg) <span className="mx-2">•</span>{" "}
                        <span className="font-bold text-primary">30 derniers jours</span>
                    </p>
                </div>

                {/* Chart Area */}
                <div className="relative mt-4 h-48 w-full">
                    {/* Grid lines */}
                    <div className="absolute inset-0 flex flex-col justify-between">
                        {[...Array(4)].map((_, i) => (
                            <div
                                key={i}
                                className="w-full border-b border-dashed border-white/5"
                            ></div>
                        ))}
                    </div>

                    {/* SVG Chart */}
                    <svg
                        className="absolute inset-0 h-full w-full overflow-visible"
                        preserveAspectRatio="none"
                        viewBox="0 0 100 50"
                    >
                        <defs>
                            <linearGradient id="statsGradient" x1="0" x2="0" y1="0" y2="1">
                                <stop offset="0%" stopColor="#13ec5b" stopOpacity="0.2"></stop>
                                <stop offset="100%" stopColor="#13ec5b" stopOpacity="0"></stop>
                            </linearGradient>
                        </defs>
                        <path
                            d="M0 40 C10 40 15 38 20 38 C25 38 30 35 40 25 C50 15 55 18 60 18 C70 18 75 10 80 5 C85 0 90 -5 100 0 L100 50 L0 50 Z"
                            fill="url(#statsGradient)"
                        ></path>
                        <path
                            d="M0 40 C10 40 15 38 20 38 C25 38 30 35 40 25 C50 15 55 18 60 18 C70 18 75 10 80 5 C85 0 90 -5 100 0"
                            fill="none"
                            stroke="#13ec5b"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                        ></path>

                        {/* Data Points */}
                        <circle
                            cx="20"
                            cy="38"
                            r="1.5"
                            className="fill-background-dark stroke-primary"
                            strokeWidth="0.5"
                        ></circle>
                        <circle
                            cx="40"
                            cy="25"
                            r="1.5"
                            className="fill-background-dark stroke-primary"
                            strokeWidth="0.5"
                        ></circle>
                        <circle
                            cx="60"
                            cy="18"
                            r="1.5"
                            className="fill-background-dark stroke-primary"
                            strokeWidth="0.5"
                        ></circle>
                        <circle
                            cx="80"
                            cy="5"
                            r="1.5"
                            className="fill-background-dark stroke-primary"
                            strokeWidth="0.5"
                        ></circle>
                        <circle
                            cx="100"
                            cy="0"
                            r="1.5"
                            className="fill-background-dark stroke-primary"
                            strokeWidth="0.5"
                        ></circle>
                    </svg>

                    {/* X Axis */}
                    <div className="absolute -bottom-6 left-0 right-0 flex justify-between text-xs text-text-secondary">
                        <span>Semaine 1</span>
                        <span>Semaine 2</span>
                        <span>Semaine 3</span>
                        <span>Semaine 4</span>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="mt-8 grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2 rounded-2xl bg-card-dark p-4 border border-white/5">
                        <div className="flex items-center gap-2 text-text-secondary">
              <span
                  className="material-symbols-outlined text-primary"
                  style={{ fontSize: "18px" }}
              >
                fitness_center
              </span>
                            <span className="text-xs font-bold tracking-wider">
                CHARGE MAX
              </span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold text-white">145</span>
                            <span className="text-sm text-text-secondary">kg</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-primary">
              <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "14px" }}
              >
                arrow_drop_up
              </span>
                            5kg vs mois dernier
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 rounded-2xl bg-card-dark p-4 border border-white/5">
                        <div className="flex items-center gap-2 text-text-secondary">
              <span
                  className="material-symbols-outlined text-primary"
                  style={{ fontSize: "18px" }}
              >
                emoji_events
              </span>
                            <span className="text-xs font-bold tracking-wider">1RM EST.</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold text-white">162</span>
                            <span className="text-sm text-text-secondary">kg</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-primary">
              <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "14px" }}
              >
                arrow_drop_up
              </span>
                            2kg vs mois dernier
                        </div>
                    </div>
                </div>

                {/* Recent Sessions */}
                <div className="mt-4 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-white">Seances recentes</h3>
                        <button className="text-sm font-bold text-primary">Voir tout</button>
                    </div>

                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between rounded-2xl bg-card-dark p-4 border border-white/5">
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-background-dark text-primary">
                  <span className="material-symbols-outlined">
                    calendar_today
                  </span>
                                </div>
                                <div>
                                    <h4 className="font-bold text-white">Aujourd'hui, 10:30</h4>
                                    <p className="text-sm text-text-secondary">
                                        4 series • 32 reps au total
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-white">145 kg</p>
                                <p className="text-xs text-primary">Meilleure serie</p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between rounded-2xl bg-card-dark p-4 border border-white/5">
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-background-dark text-text-secondary">
                  <span className="material-symbols-outlined">
                    calendar_today
                  </span>
                                </div>
                                <div>
                                    <h4 className="font-bold text-white">24 oct., 09:15</h4>
                                    <p className="text-sm text-text-secondary">
                                        5 series • 40 reps au total
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-white">140 kg</p>
                                <p className="text-xs text-text-secondary">Meilleure serie</p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between rounded-2xl bg-card-dark p-4 border border-white/5">
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-background-dark text-text-secondary">
                  <span className="material-symbols-outlined">
                    calendar_today
                  </span>
                                </div>
                                <div>
                                    <h4 className="font-bold text-white">20 oct., 18:45</h4>
                                    <p className="text-sm text-text-secondary">
                                        3 series • 24 reps au total
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-white">135 kg</p>
                                <p className="text-xs text-text-secondary">Meilleure serie</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
