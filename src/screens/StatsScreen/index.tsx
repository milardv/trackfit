import { useEffect, useMemo, useState } from "react";
import { Timestamp } from "firebase/firestore";
import { NumericKeypadModal } from "../../components/NumericKeypadModal.tsx";
import {
  addBodyMetric,
  listBodyMetrics,
  listSessionExercises,
  listSessions,
} from "../../services/firestoreService.ts";
import {
  MEASURE_FIELD_CONFIG,
} from "./constants.ts";
import type {
  BodyMetricEntry,
  ChartAxisConfig,
  ChartPoint,
  ExerciseFilterOption,
  ForceChartModel,
  ForceSummary,
  MeasureField,
  MeasureFieldState,
  MeasuresSummary,
  SessionExerciseRow,
  StatsScreenProps,
  StatsTab,
  VolumeRecentSummary,
} from "./types.ts";
import {
  buildChartAxisConfig,
  buildChart,
  buildExerciseFilterOptions,
  buildForceChartModel,
  buildMeasuresChartPoints,
  buildVolumeChartPoints,
  computeForceSummary,
  computeMeasuresSummary,
  computeVolumeRecent,
  normalizeNumericString,
  parseOptionalNumber,
  roundToTenth,
  toMillis,
} from "./utils.ts";
import { ForceDetailsCard } from "./components/ForceDetailsCard.tsx";
import { MeasuresFormSection } from "./components/MeasuresFormSection.tsx";
import { StatsChartPanel } from "./components/StatsChartPanel.tsx";
import { StatsSummaryCards } from "./components/StatsSummaryCards.tsx";
import { StatsTabs } from "./components/StatsTabs.tsx";

export function StatsScreen({ userId }: StatsScreenProps) {
  const [activeTab, setActiveTab] = useState<StatsTab>("force");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sessionExercises, setSessionExercises] = useState<SessionExerciseRow[]>([]);
  const [bodyMetrics, setBodyMetrics] = useState<BodyMetricEntry[]>([]);
  const [selectedExerciseFilter, setSelectedExerciseFilter] = useState<string>("all");
  const [selectedForcePointId, setSelectedForcePointId] = useState<string | null>(null);
  const [measureForm, setMeasureForm] = useState<MeasureFieldState>({
    weightKg: "",
    bodyFatPct: "",
    musclePct: "",
  });
  const [measureFormError, setMeasureFormError] = useState<string | null>(null);
  const [measureFormSuccess, setMeasureFormSuccess] = useState<string | null>(null);
  const [isSavingMeasure, setIsSavingMeasure] = useState(false);
  const [isMeasureFormVisible, setIsMeasureFormVisible] = useState(false);
  const [activeMeasureField, setActiveMeasureField] = useState<MeasureField | null>(
    null,
  );
  const [measureKeypadValue, setMeasureKeypadValue] = useState("");
  const [measureKeypadError, setMeasureKeypadError] = useState<string | null>(null);

  const updateMeasureField = (field: MeasureField, value: string) => {
    setMeasureForm((current) => ({
      ...current,
      [field]: value,
    }));
    setMeasureFormError(null);
    setMeasureFormSuccess(null);
  };

  const openMeasureKeypad = (field: MeasureField) => {
    setActiveMeasureField(field);
    setMeasureKeypadValue(normalizeNumericString(measureForm[field]));
    setMeasureKeypadError(null);
  };

  const closeMeasureKeypad = () => {
    setActiveMeasureField(null);
    setMeasureKeypadError(null);
  };

  const toggleMeasureForm = () => {
    setIsMeasureFormVisible((current) => {
      const next = !current;
      if (!next) {
        closeMeasureKeypad();
      }
      return next;
    });
  };

  const handleMeasureKeypadDigit = (digit: string) => {
    setMeasureKeypadValue((current) => {
      if (current === "0") {
        return digit;
      }
      return `${current}${digit}`;
    });
    setMeasureKeypadError(null);
  };

  const handleMeasureKeypadDecimal = () => {
    setMeasureKeypadValue((current) => {
      if (!current) {
        return "0.";
      }
      if (current.includes(".")) {
        return current;
      }
      return `${current}.`;
    });
    setMeasureKeypadError(null);
  };

  const handleMeasureKeypadBackspace = () => {
    setMeasureKeypadValue((current) => current.slice(0, -1));
    setMeasureKeypadError(null);
  };

  const handleConfirmMeasureKeypad = () => {
    if (!activeMeasureField) {
      return;
    }

    const config = MEASURE_FIELD_CONFIG[activeMeasureField];
    const rawValue = normalizeNumericString(measureKeypadValue);

    if (!rawValue) {
      if (config.required) {
        setMeasureKeypadError(`${config.label} obligatoire.`);
        return;
      }
      updateMeasureField(activeMeasureField, "");
      closeMeasureKeypad();
      return;
    }

    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) {
      setMeasureKeypadError("Valeur invalide.");
      return;
    }

    if (parsed < config.min || parsed > config.max) {
      setMeasureKeypadError(
        `Valeur attendue entre ${config.min} et ${config.max} ${config.unit}.`,
      );
      return;
    }

    const rounded = Math.round(parsed * 10) / 10;
    updateMeasureField(activeMeasureField, `${rounded}`.replace(".", ","));
    closeMeasureKeypad();
  };

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const [sessions, metrics] = await Promise.all([
          listSessions(userId, 120),
          listBodyMetrics(userId, 120),
        ]);

        const completedSessions = sessions.filter((session) => session.status === "completed");

        const exerciseGroups = await Promise.all(
          completedSessions.map(async (session) => {
            const exercises = await listSessionExercises(userId, session.id, 120);
            const sessionMs = toMillis(session.endedAt ?? session.startedAt);

            return exercises.map((exercise) => ({
              ...exercise,
              sessionId: session.id,
              sessionMs,
            }));
          }),
        );

        const flattenedExercises = exerciseGroups
          .flat()
          .filter(
            (exercise) =>
              exercise.status === "completed" ||
              exercise.completedSets > 0 ||
              exercise.totalReps > 0 ||
              exercise.totalDurationSec > 0 ||
              exercise.totalVolumeKg > 0,
          )
          .sort((a, b) => b.sessionMs - a.sessionMs);

        const sortedMetrics = metrics
          .slice()
          .sort((a, b) => toMillis(b.measuredAt) - toMillis(a.measuredAt));

        if (!cancelled) {
          setSessionExercises(flattenedExercises);
          setBodyMetrics(sortedMetrics);
        }
      } catch {
        if (!cancelled) {
          setErrorMessage("Impossible de charger les statistiques pour le moment.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!activeMeasureField) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveMeasureField(null);
        setMeasureKeypadError(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeMeasureField]);

  const handleSaveMeasure = async () => {
    if (isSavingMeasure) {
      return;
    }

    const weight = parseOptionalNumber(measureForm.weightKg);
    const bodyFat = parseOptionalNumber(measureForm.bodyFatPct);
    const muscle = parseOptionalNumber(measureForm.musclePct);

    if (weight === null || Number.isNaN(weight) || weight <= 0 || weight > 350) {
      setMeasureFormError("Entre un poids valide entre 1 et 350 kg.");
      setMeasureFormSuccess(null);
      return;
    }

    if (bodyFat !== null && (Number.isNaN(bodyFat) || bodyFat < 0 || bodyFat > 100)) {
      setMeasureFormError("Le pourcentage de masse grasse doit etre entre 0 et 100.");
      setMeasureFormSuccess(null);
      return;
    }

    if (muscle !== null && (Number.isNaN(muscle) || muscle < 0 || muscle > 100)) {
      setMeasureFormError("Le pourcentage de muscles doit etre entre 0 et 100.");
      setMeasureFormSuccess(null);
      return;
    }

    setIsSavingMeasure(true);
    setMeasureFormError(null);
    setMeasureFormSuccess(null);

    try {
      const measuredAt = Timestamp.now();
      const weightKg = roundToTenth(weight);
      const bodyFatPct = bodyFat === null ? null : roundToTenth(bodyFat);
      const musclePct = muscle === null ? null : roundToTenth(muscle);

      const id = await addBodyMetric(userId, {
        measuredAt,
        weightKg,
        bodyFatPct,
        musclePct,
        muscleMassKg: null,
      });

      const localEntry: BodyMetricEntry = {
        id,
        measuredAt,
        weightKg,
        bodyFatPct,
        musclePct,
        muscleMassKg: null,
        note: "",
        createdAt: measuredAt,
        updatedAt: measuredAt,
      };

      setBodyMetrics((previous) =>
        [localEntry, ...previous].sort(
          (a, b) => toMillis(b.measuredAt) - toMillis(a.measuredAt),
        ),
      );
      setMeasureForm({
        weightKg: "",
        bodyFatPct: "",
        musclePct: "",
      });
      setMeasureFormSuccess("Mesure enregistree.");
    } catch {
      setMeasureFormError("Impossible d enregistrer la mesure pour le moment.");
      setMeasureFormSuccess(null);
    } finally {
      setIsSavingMeasure(false);
    }
  };

  const exerciseFilterOptions = useMemo<ExerciseFilterOption[]>(
    () => buildExerciseFilterOptions(sessionExercises),
    [sessionExercises],
  );

  const selectedExerciseOption = useMemo(() => {
    if (selectedExerciseFilter === "all") {
      return null;
    }

    return exerciseFilterOptions.find((option) => option.id === selectedExerciseFilter) ?? null;
  }, [exerciseFilterOptions, selectedExerciseFilter]);

  useEffect(() => {
    if (selectedExerciseFilter === "all") {
      return;
    }

    const stillExists = exerciseFilterOptions.some(
      (option) => option.id === selectedExerciseFilter,
    );
    if (!stillExists) {
      setSelectedExerciseFilter("all");
    }
  }, [exerciseFilterOptions, selectedExerciseFilter]);

  const forceChartModel = useMemo<ForceChartModel>(
    () => buildForceChartModel(sessionExercises, selectedExerciseOption),
    [selectedExerciseOption, sessionExercises],
  );

  useEffect(() => {
    if (forceChartModel.points.length === 0) {
      setSelectedForcePointId(null);
      return;
    }

    setSelectedForcePointId((current) => {
      if (current && forceChartModel.points.some((point) => point.id === current)) {
        return current;
      }

      return forceChartModel.points[forceChartModel.points.length - 1].id;
    });
  }, [forceChartModel.points]);

  const selectedForcePoint = useMemo(() => {
    if (!selectedForcePointId) {
      return null;
    }

    return forceChartModel.points.find((point) => point.id === selectedForcePointId) ?? null;
  }, [forceChartModel.points, selectedForcePointId]);

  const forceTrendPct = useMemo(() => {
    if (forceChartModel.points.length < 2) {
      return null;
    }

    const first = forceChartModel.points[0].value;
    const latest = forceChartModel.points[forceChartModel.points.length - 1].value;
    if (first <= 0) {
      return null;
    }

    return ((latest - first) / first) * 100;
  }, [forceChartModel.points]);

  const forceSummary = useMemo<ForceSummary>(
    () => computeForceSummary(forceChartModel.points),
    [forceChartModel.points],
  );

  const volumeChartPoints = useMemo<ChartPoint[]>(
    () => buildVolumeChartPoints(sessionExercises),
    [sessionExercises],
  );

  const volumeRecent = useMemo<VolumeRecentSummary>(
    () => computeVolumeRecent(sessionExercises),
    [sessionExercises],
  );

  const measuresChartPoints = useMemo<ChartPoint[]>(
    () => buildMeasuresChartPoints(bodyMetrics),
    [bodyMetrics],
  );

  const measuresSummary = useMemo<MeasuresSummary>(
    () => computeMeasuresSummary(bodyMetrics),
    [bodyMetrics],
  );

  const chartPoints = useMemo(() => {
    if (activeTab === "force") {
      return forceChartModel.points;
    }
    if (activeTab === "volume") {
      return volumeChartPoints;
    }
    return measuresChartPoints;
  }, [activeTab, forceChartModel.points, measuresChartPoints, volumeChartPoints]);

  const chartTitle =
    activeTab === "force"
      ? forceChartModel.title
      : activeTab === "volume"
        ? "Volume total"
        : "Poids";
  const chartSubtitle =
    activeTab === "force"
      ? forceChartModel.subtitle
      : activeTab === "volume"
        ? "Evolution du volume (kg)"
        : "Evolution du poids (kg)";

  const chartAxisConfig = useMemo<ChartAxisConfig>(
    () => buildChartAxisConfig(activeTab, chartPoints, forceChartModel.valueUnit),
    [activeTab, chartPoints, forceChartModel.valueUnit],
  );

  const chartGeometry = useMemo(
    () => buildChart(chartPoints, { min: chartAxisConfig.min, max: chartAxisConfig.max }),
    [chartAxisConfig.max, chartAxisConfig.min, chartPoints],
  );

  const activeMeasureConfig = activeMeasureField
    ? MEASURE_FIELD_CONFIG[activeMeasureField]
    : null;
  const measureKeypadDisplayValue = measureKeypadValue
    ? measureKeypadValue.replace(".", ",")
    : "--";

  return (
    <div className="flex min-h-screen flex-col bg-background-dark pb-24">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/5 bg-background-dark/90 px-4 py-4 backdrop-blur-md">
        <h1 className="text-lg font-bold text-white">Analyse de performance</h1>
      </header>

      <StatsTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex flex-col gap-6 p-4 pt-6">
        {isLoading ? (
          <div className="rounded-2xl border border-white/5 bg-card-dark p-4 text-sm text-text-secondary">
            Chargement des statistiques...
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 p-4 text-sm text-rose-200">
            {errorMessage}
          </div>
        ) : null}

        {!isLoading ? (
          <>
            <StatsChartPanel
              activeTab={activeTab}
              chartTitle={chartTitle}
              chartSubtitle={chartSubtitle}
              forceTrendPct={forceTrendPct}
              selectedExerciseFilter={selectedExerciseFilter}
              exerciseFilterOptions={exerciseFilterOptions}
              onExerciseFilterChange={setSelectedExerciseFilter}
              forceYAxisLegend={forceChartModel.yAxisLegend}
              axisConfig={chartAxisConfig}
              chartGeometry={chartGeometry}
              chartPoints={chartPoints}
              selectedForcePointId={selectedForcePointId}
              onSelectForcePoint={setSelectedForcePointId}
            />

            {activeTab === "force" ? (
              <ForceDetailsCard selectedForcePoint={selectedForcePoint} />
            ) : null}

            {activeTab === "mesures" ? (
              <MeasuresFormSection
                isVisible={isMeasureFormVisible}
                onToggle={toggleMeasureForm}
                measureForm={measureForm}
                onOpenField={openMeasureKeypad}
                onSave={handleSaveMeasure}
                isSaving={isSavingMeasure}
                formError={measureFormError}
                formSuccess={measureFormSuccess}
              />
            ) : null}

            <StatsSummaryCards
              activeTab={activeTab}
              forceSummary={forceSummary}
              forceTrendPct={forceTrendPct}
              forceValueUnit={forceChartModel.valueUnit}
              volumeRecent={volumeRecent}
              measuresSummary={measuresSummary}
            />

          </>
        ) : null}
      </main>

      {activeMeasureConfig ? (
        <NumericKeypadModal
          title={`Modifier ${activeMeasureConfig.label}`}
          unit={activeMeasureConfig.unit}
          displayValue={measureKeypadDisplayValue}
          errorMessage={measureKeypadError}
          onClose={closeMeasureKeypad}
          onDigit={handleMeasureKeypadDigit}
          onDecimal={handleMeasureKeypadDecimal}
          onBackspace={handleMeasureKeypadBackspace}
          onConfirm={handleConfirmMeasureKeypad}
          confirmLabel="Valider"
        />
      ) : null}
    </div>
  );
}
