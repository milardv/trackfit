export function ProgressScreen() {
    return (
        <div className="flex min-h-screen flex-col bg-background-dark pb-24">
            {/* Header */}
            <header className="sticky top-0 z-20 flex items-center justify-between bg-background-dark/90 px-4 py-4 backdrop-blur-md border-b border-white/5">
                <button className="flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/10">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="text-lg font-bold text-white">Evolution corporelle</h1>
                <button className="flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/10">
                    <span className="material-symbols-outlined">more_vert</span>
                </button>
            </header>

            <main className="flex flex-col gap-6 p-4">
                {/* Stats Overview */}
                <section className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2 rounded-2xl bg-card-dark p-5 border border-white/5 shadow-sm">
                        <div className="flex items-center gap-2">
              <span
                  className="material-symbols-outlined text-primary"
                  style={{ fontSize: "20px" }}
              >
                monitor_weight
              </span>
                            <p className="text-sm font-medium text-text-secondary">Poids</p>
                        </div>
                        <div className="flex items-end gap-2">
                            <p className="text-2xl font-bold text-white tracking-tight">
                                185{" "}
                                <span className="text-sm font-normal text-slate-400">lbs</span>
                            </p>
                        </div>
                        <div className="flex items-center gap-1 text-xs font-medium text-primary">
              <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "16px" }}
              >
                trending_down
              </span>
                            <span>2.5%</span>
                            <span className="ml-1 font-normal text-slate-500">
                vs mois dernier
              </span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 rounded-2xl bg-card-dark p-5 border border-white/5 shadow-sm">
                        <div className="flex items-center gap-2">
              <span
                  className="material-symbols-outlined text-primary"
                  style={{ fontSize: "20px" }}
              >
                opacity
              </span>
                            <p className="text-sm font-medium text-text-secondary">
                                Masse grasse
                            </p>
                        </div>
                        <div className="flex items-end gap-2">
                            <p className="text-2xl font-bold text-white tracking-tight">
                                15%
                            </p>
                        </div>
                        <div className="flex items-center gap-1 text-xs font-medium text-primary">
              <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "16px" }}
              >
                trending_down
              </span>
                            <span>1.2%</span>
                            <span className="ml-1 font-normal text-slate-500">
                vs mois dernier
              </span>
                        </div>
                    </div>
                </section>

                {/* Chart Section */}
                <section className="flex flex-col gap-4">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-xl font-bold text-white tracking-tight">
                            Historique des mesures
                        </h2>
                        <select className="cursor-pointer bg-transparent text-sm font-medium text-primary focus:outline-none">
                            <option value="3m">3 derniers mois</option>
                            <option value="6m">6 derniers mois</option>
                            <option value="1y">Derniere annee</option>
                        </select>
                    </div>

                    <div className="rounded-2xl bg-card-dark p-6 border border-white/5 shadow-sm">
                        <div className="mb-6 flex items-baseline gap-2">
                            <h3 className="text-3xl font-bold text-white">
                                185{" "}
                                <span className="text-lg font-medium text-slate-400">lbs</span>
                            </h3>
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                -5 lbs
              </span>
                        </div>

                        <div className="relative h-48 w-full">
                            <svg
                                className="h-full w-full overflow-visible"
                                preserveAspectRatio="none"
                                viewBox="0 0 100 50"
                            >
                                <defs>
                                    <linearGradient
                                        id="chartGradient"
                                        x1="0"
                                        x2="0"
                                        y1="0"
                                        y2="1"
                                    >
                                        <stop
                                            offset="0%"
                                            stopColor="#13ec5b"
                                            stopOpacity="0.2"
                                        ></stop>
                                        <stop
                                            offset="100%"
                                            stopColor="#13ec5b"
                                            stopOpacity="0"
                                        ></stop>
                                    </linearGradient>
                                </defs>
                                <path
                                    d="M0 50 L0 35 C10 35 15 30 25 32 C35 34 40 25 50 20 C60 15 65 18 75 15 C85 12 90 5 100 2 L100 50 Z"
                                    fill="url(#chartGradient)"
                                ></path>
                                <path
                                    d="M0 35 C10 35 15 30 25 32 C35 34 40 25 50 20 C60 15 65 18 75 15 C85 12 90 5 100 2"
                                    fill="none"
                                    stroke="#13ec5b"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    vectorEffect="non-scaling-stroke"
                                ></path>

                                <circle
                                    cx="25"
                                    cy="32"
                                    r="1.5"
                                    className="fill-background-dark stroke-primary"
                                    strokeWidth="0.5"
                                ></circle>
                                <circle
                                    cx="50"
                                    cy="20"
                                    r="1.5"
                                    className="fill-background-dark stroke-primary"
                                    strokeWidth="0.5"
                                ></circle>
                                <circle
                                    cx="75"
                                    cy="15"
                                    r="1.5"
                                    className="fill-background-dark stroke-primary"
                                    strokeWidth="0.5"
                                ></circle>
                                <circle
                                    cx="100"
                                    cy="2"
                                    r="2"
                                    className="fill-primary stroke-background-dark"
                                    strokeWidth="0.5"
                                ></circle>
                            </svg>

                            <div className="absolute -bottom-6 left-0 right-0 flex justify-between text-xs font-medium text-slate-500">
                                <span>1 nov.</span>
                                <span>1 dec.</span>
                                <span>1 janv.</span>
                                <span>Aujourd'hui</span>
                            </div>
                        </div>
                        <div className="h-4"></div>
                    </div>
                </section>

                {/* Progress Photos */}
                <section className="mt-2 flex flex-col gap-4">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-xl font-bold text-white tracking-tight">
                            Photos de progression
                        </h2>
                        <button className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                            Voir tout
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="group relative aspect-[3/4] overflow-hidden rounded-xl bg-card-dark border border-white/5">
                            <img
                                src="https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=1470&auto=format&fit=crop"
                                alt="Progression 12 janv."
                                className="h-full w-full object-cover opacity-80 transition-transform duration-500 group-hover:scale-105 group-hover:opacity-100"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                            <div className="absolute bottom-3 left-3">
                                <p className="text-xs font-semibold uppercase tracking-wider text-white/90">
                                    12 janv. 2024
                                </p>
                                <p className="text-sm font-bold text-white">188 lbs</p>
                            </div>
                            <div className="absolute right-3 top-3 rounded-full bg-black/40 p-1 backdrop-blur-sm">
                <span
                    className="material-symbols-outlined text-white"
                    style={{ fontSize: "16px" }}
                >
                  compare_arrows
                </span>
                            </div>
                        </div>

                        <div className="group relative aspect-[3/4] overflow-hidden rounded-xl bg-card-dark border border-white/5">
                            <img
                                src="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=1470&auto=format&fit=crop"
                                alt="Progression 15 fev."
                                className="h-full w-full object-cover opacity-80 transition-transform duration-500 group-hover:scale-105 group-hover:opacity-100"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                            <div className="absolute bottom-3 left-3">
                                <p className="text-xs font-semibold uppercase tracking-wider text-white/90">
                                    15 fev. 2024
                                </p>
                                <p className="text-sm font-bold text-white">185 lbs</p>
                            </div>
                        </div>
                    </div>

                    {/* Comparisons Row */}
                    <div className="flex items-center justify-between rounded-xl bg-card-dark p-4 border border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="flex -space-x-3">
                                <div className="h-10 w-10 overflow-hidden rounded-full border-2 border-card-dark">
                                    <img
                                        src="https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=150&auto=format&fit=crop"
                                        alt="Miniature 1"
                                        className="h-full w-full object-cover"
                                    />
                                </div>
                                <div className="relative h-10 w-10 overflow-hidden rounded-full border-2 border-card-dark">
                                    <img
                                        src="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=150&auto=format&fit=crop"
                                        alt="Miniature 2"
                                        className="h-full w-full object-cover"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col">
                <span className="text-sm font-bold text-white">
                  Comparer les photos
                </span>
                                <span className="text-xs text-slate-500">12 janv. vs 15 fev.</span>
                            </div>
                        </div>
                        <span
                            className="material-symbols-outlined text-slate-400"
                            style={{ fontSize: "20px" }}
                        >
              chevron_right
            </span>
                    </div>
                </section>

                <div className="h-10"></div>
            </main>

            {/* Floating Action Button */}
            <button className="fixed bottom-24 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-background-dark shadow-lg shadow-primary/30 transition-transform hover:scale-105 active:scale-95">
        <span
            className="material-symbols-outlined"
            style={{ fontSize: "28px", fontWeight: 600 }}
        >
          add
        </span>
            </button>
        </div>
    );
}
