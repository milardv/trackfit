import type { FooterItem } from "./types.ts";

export const SETS_MIN = 1;
export const SETS_MAX = 20;
export const WEIGHT_MIN = 0;
export const WEIGHT_MAX = 200;
export const REPS_MIN = 1;
export const REPS_MAX = 200;
export const DURATION_MIN = 5;
export const DURATION_MAX = 600;
export const REST_MIN = 10;
export const REST_MAX = 120;

export const FOOTER_ITEMS: FooterItem[] = [
  { icon: "home", label: "Accueil" },
  { icon: "history", label: "Historique" },
  { icon: "bar_chart", label: "Stats" },
  { icon: "person", label: "Profil", isActive: true },
];
