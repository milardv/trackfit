import type { StatsTabsProps } from "./types.ts";

export function StatsTabs({ activeTab, onTabChange }: StatsTabsProps) {
  const tabButtonClass = (tab: "force" | "volume" | "mesures") =>
    `flex-1 py-4 text-sm font-bold ${
      activeTab === tab
        ? "border-b-2 border-primary text-white"
        : "text-text-secondary"
    }`;

  return (
    <div className="flex border-b border-white/5 px-4">
      <button
        type="button"
        onClick={() => onTabChange("force")}
        className={tabButtonClass("force")}
      >
        Force
      </button>
      <button
        type="button"
        onClick={() => onTabChange("volume")}
        className={tabButtonClass("volume")}
      >
        Volume
      </button>
      <button
        type="button"
        onClick={() => onTabChange("mesures")}
        className={tabButtonClass("mesures")}
      >
        Mesures
      </button>
    </div>
  );
}
