export const SCREENS = ["home", "workout", "stats", "progress"] as const;

export type Screen = (typeof SCREENS)[number];

export interface NavigationItem {
  screen: Screen;
  label: string;
  icon: string;
}

export const NAV_ITEMS: NavigationItem[] = [
  { screen: "home", label: "Accueil", icon: "home" },
  { screen: "workout", label: "Seances", icon: "fitness_center" },
  { screen: "stats", label: "Stats", icon: "monitoring" },
  { screen: "progress", label: "Profil", icon: "person" },
];
