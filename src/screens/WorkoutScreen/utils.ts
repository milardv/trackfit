export function normalizeGymLabel(gymName: string): string {
  const trimmed = gymName.trim();
  if (!trimmed) {
    return "Salle";
  }
  return trimmed;
}

export function getGymIcon(gymName: string): "location_on" | "home_pin" {
  return gymName.toLowerCase().includes("maison") ? "home_pin" : "location_on";
}

export function getGymTone(gymName: string): string {
  return gymName.toLowerCase().includes("maison")
    ? "text-slate-400"
    : "text-primary";
}
