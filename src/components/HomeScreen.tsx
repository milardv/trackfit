import React from "react";

export function HomeScreen() {
    return (
        <div className="flex flex-col gap-6 p-4 pb-24">
            {/* Header */}
            <header className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 overflow-hidden rounded-full border-2 border-primary bg-card-dark">
                        <img
                            src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alex&backgroundColor=b6e3f4"
                            alt="Profile"
                            className="h-full w-full object-cover"
                        />
                    </div>
                    <div>
                        <p className="text-sm text-text-secondary">Welcome back,</p>
                        <h1 className="text-lg font-bold text-white">Alex Johnson</h1>
                    </div>
                </div>
                <button className="relative flex h-10 w-10 items-center justify-center rounded-full bg-card-dark text-white">
                    <span className="material-symbols-outlined">notifications</span>
                    <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary"></span>
                </button>
            </header>

            {/* Today's Plan */}
            <section className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-white">Today's Plan</h2>
                    <span className="rounded-full bg-card-dark px-3 py-1 text-xs font-bold tracking-wider text-primary">
            MONDAY
          </span>
                </div>

                <div className="relative overflow-hidden rounded-3xl bg-card-dark">
                    <div className="absolute inset-0">
                        <img
                            src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1470&auto=format&fit=crop"
                            alt="Gym"
                            className="h-full w-full object-cover opacity-40"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/60 to-transparent"></div>
                    </div>

                    <div className="relative flex flex-col gap-4 p-6">
                        <div className="flex items-center gap-2 text-primary">
              <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "20px" }}
              >
                fitness_center
              </span>
                            <span className="text-sm font-bold tracking-wider">
                UPPER BODY
              </span>
                        </div>

                        <div>
                            <h3 className="text-4xl font-bold text-white">Keep Cool</h3>
                            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                                Focus on endurance and flexibility. High volume, low intensity
                                session to start the week.
                            </p>
                        </div>

                        <div className="mt-4 flex items-center justify-between">
                            <div className="flex gap-4 text-sm font-medium text-white">
                                <div className="flex items-center gap-1">
                  <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "18px" }}
                  >
                    timer
                  </span>
                                    <span>45 min</span>
                                </div>
                                <div className="flex items-center gap-1">
                  <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "18px" }}
                  >
                    local_fire_department
                  </span>
                                    <span>320 cal</span>
                                </div>
                            </div>

                            <button className="flex items-center gap-1 rounded-full bg-primary px-6 py-3 font-bold text-background-dark shadow-[0_0_20px_rgba(19,236,91,0.4)]">
                                Start
                                <span
                                    className="material-symbols-outlined"
                                    style={{ fontSize: "20px" }}
                                >
                  play_arrow
                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Weekly Progress */}
            <section className="flex flex-col gap-4">
                <h2 className="text-xl font-bold text-white">Weekly Progress</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-4 rounded-2xl bg-card-dark p-5 border border-white/5">
                        <div className="flex items-center justify-between">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
                                <span className="material-symbols-outlined">schedule</span>
                            </div>
                            <span className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
                <span
                    className="material-symbols-outlined"
                    style={{ fontSize: "14px" }}
                >
                  trending_up
                </span>
                5%
              </span>
                        </div>
                        <div>
                            <p className="text-sm text-text-secondary">Last Session</p>
                            <p className="text-2xl font-bold text-white">
                                45
                                <span className="text-sm font-normal text-text-secondary">
                  m
                </span>{" "}
                                12
                                <span className="text-sm font-normal text-text-secondary">
                  s
                </span>
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 rounded-2xl bg-card-dark p-5 border border-white/5">
                        <div className="flex items-center justify-between">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/20 text-purple-400">
                                <span className="material-symbols-outlined">weight</span>
                            </div>
                            <span className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
                <span
                    className="material-symbols-outlined"
                    style={{ fontSize: "14px" }}
                >
                  trending_up
                </span>
                12%
              </span>
                        </div>
                        <div>
                            <p className="text-sm text-text-secondary">Total Volume</p>
                            <p className="text-2xl font-bold text-white">
                                12.5
                                <span className="text-sm font-normal text-text-secondary">
                  k lbs
                </span>
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Upcoming */}
            <section className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">Upcoming</h2>
                    <button className="text-sm font-bold text-primary">View All</button>
                </div>

                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between rounded-2xl bg-card-dark p-4 border border-white/5">
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col items-center justify-center rounded-xl bg-background-dark px-4 py-2">
                <span className="text-xs font-bold text-text-secondary">
                  TUE
                </span>
                                <span className="text-xl font-bold text-white">12</span>
                            </div>
                            <div>
                                <h4 className="font-bold text-white">Leg Day Destruction</h4>
                                <p className="text-sm text-text-secondary">
                                    Squats, Lunges • 60 min
                                </p>
                            </div>
                        </div>
                        <button className="flex h-8 w-8 items-center justify-center rounded-full bg-background-dark text-white">
              <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "20px" }}
              >
                chevron_right
              </span>
                        </button>
                    </div>

                    <div className="flex items-center justify-between rounded-2xl bg-card-dark p-4 border border-white/5">
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col items-center justify-center rounded-xl bg-background-dark px-4 py-2">
                <span className="text-xs font-bold text-text-secondary">
                  WED
                </span>
                                <span className="text-xl font-bold text-white">13</span>
                            </div>
                            <div>
                                <h4 className="font-bold text-white">Active Recovery</h4>
                                <p className="text-sm text-text-secondary">
                                    Yoga, Stretching • 30 min
                                </p>
                            </div>
                        </div>
                        <button className="flex h-8 w-8 items-center justify-center rounded-full bg-background-dark text-white">
              <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "20px" }}
              >
                chevron_right
              </span>
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}
