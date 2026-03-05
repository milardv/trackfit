import type {
  ChartAxisConfig,
  ChartGeometry,
  ChartPoint,
  ExerciseFilterOption,
  ForceChartPoint,
  ForceSummary,
  ForceValueUnit,
  MeasuresSummary,
  MeasureField,
  MeasureFieldState,
  StatsTab,
  VolumeRecentSummary,
} from "../types.ts";

export interface StatsTabsProps {
  activeTab: StatsTab;
  onTabChange: (tab: StatsTab) => void;
}

export interface StatsChartPanelProps {
  activeTab: StatsTab;
  chartTitle: string;
  chartSubtitle: string;
  forceTrendPct: number | null;
  selectedExerciseFilter: string;
  exerciseFilterOptions: ExerciseFilterOption[];
  onExerciseFilterChange: (value: string) => void;
  forceYAxisLegend: string;
  axisConfig: ChartAxisConfig;
  chartGeometry: ChartGeometry | null;
  chartPoints: ChartPoint[];
  selectedForcePointId: string | null;
  onSelectForcePoint: (pointId: string) => void;
}

export interface ForceDetailsCardProps {
  selectedForcePoint: ForceChartPoint | null;
}

export interface MeasuresFormSectionProps {
  isVisible: boolean;
  onToggle: () => void;
  measureForm: MeasureFieldState;
  onOpenField: (field: MeasureField) => void;
  onSave: () => void;
  isSaving: boolean;
  formError: string | null;
  formSuccess: string | null;
}

export interface StatsSummaryCardsProps {
  activeTab: StatsTab;
  forceSummary: ForceSummary;
  forceTrendPct: number | null;
  forceValueUnit: ForceValueUnit;
  volumeRecent: VolumeRecentSummary;
  measuresSummary: MeasuresSummary;
}
