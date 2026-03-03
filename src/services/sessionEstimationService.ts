import type {
  SessionEstimationExerciseInput,
  SessionEstimationInput,
  SessionEstimationResult,
} from "../types/sessionEstimation.ts";

const DEFAULT_BODY_WEIGHT_KG = 70;
const MIN_EXERCISE_SECONDS = 20;
const SECOND_TO_MINUTE = 60;

const GEMINI_API_KEY = String(process.env.GEMINI_API_KEY ?? "").replace(/^"|"$/g, "").trim();
const GEMINI_MODEL = "gemini-2.0-flash";
let isGeminiUnavailable = false;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function extractGeminiText(response: unknown): string {
  const asAny = response as { text?: unknown };
  if (typeof asAny.text === "string") {
    return asAny.text;
  }
  if (typeof asAny.text === "function") {
    return String((asAny.text as () => unknown)() ?? "");
  }
  return "";
}

function parseGeminiEstimate(text: string): {
  estimatedDurationMin: number;
  estimatedCaloriesKcal: number;
} | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  const jsonCandidate = (trimmed.match(/\{[\s\S]*\}/)?.[0] ?? "").trim() || trimmed;

  try {
    const parsed = JSON.parse(jsonCandidate) as Record<string, unknown>;
    const duration =
      typeof parsed.estimatedDurationMin === "number"
        ? parsed.estimatedDurationMin
        : Number.NaN;
    const calories =
      typeof parsed.estimatedCaloriesKcal === "number"
        ? parsed.estimatedCaloriesKcal
        : Number.NaN;

    if (
      !Number.isFinite(duration) ||
      !Number.isFinite(calories) ||
      duration <= 0 ||
      calories <= 0
    ) {
      return null;
    }

    return {
      estimatedDurationMin: Math.round(duration),
      estimatedCaloriesKcal: Math.round(calories),
    };
  } catch {
    return null;
  }
}

function buildGeminiPrompt(
  input: SessionEstimationInput,
  formulaEstimate: SessionEstimationResult,
): string {
  console.log("exercices: ", input.exercises);
  return [
    "Tu es un coach fitness.",
    "Retourne uniquement un JSON valide avec les clefs:",
    '{"estimatedDurationMin": number, "estimatedCaloriesKcal": number}',
    "Contexte:",
    `- Salle: ${input.gymName ?? "Salle"}`,
    `- Poids utilisateur (kg): ${Math.round(input.bodyWeightKg ?? DEFAULT_BODY_WEIGHT_KG)}`,
    `- Base formule: ${formulaEstimate.estimatedDurationMin} min / ${formulaEstimate.estimatedCaloriesKcal} kcal`,
    "- Exercices:",
    JSON.stringify(input.exercises),
    "Contraintes:",
    "- valeurs entieres strictement positives",
    "- pas de texte hors JSON",
  ].join("\n");
}

function getExerciseSeconds(exercise: SessionEstimationExerciseInput): number {
  const sets = clamp(Math.round(exercise.targetSets || 1), 1, 30);
  const restSec = clamp(Math.round(exercise.restSec || 30), 0, 240);
  const transitionSec = 20;

  let activePerSetSec = 30;
  if (exercise.trackingMode === "duration_only") {
    activePerSetSec = clamp(Math.round(exercise.targetDurationSec ?? 40), 10, 900);
  } else {
    const reps = clamp(Math.round(exercise.targetReps ?? 10), 1, 100);
    activePerSetSec = clamp(Math.round(reps * 2.8), 8, 240);
  }

  if (exercise.trackingMode === "weight_reps" && (exercise.targetWeightKg ?? 0) > 0) {
    activePerSetSec = Math.round(activePerSetSec * 1.1);
  }

  return Math.max(
    MIN_EXERCISE_SECONDS,
    sets * activePerSetSec + (sets - 1) * restSec + transitionSec,
  );
}

function getExerciseCalories(
  exercise: SessionEstimationExerciseInput,
  bodyWeightKg: number,
): number {
  const sets = clamp(Math.round(exercise.targetSets || 1), 1, 30);
  const restSec = clamp(Math.round(exercise.restSec || 30), 0, 240);

  let activeSecPerSet = 30;
  let activeMet = 6;
  if (exercise.trackingMode === "duration_only") {
    activeSecPerSet = clamp(Math.round(exercise.targetDurationSec ?? 40), 10, 900);
    activeMet = 5.5;
  } else if (exercise.trackingMode === "weight_reps") {
    const reps = clamp(Math.round(exercise.targetReps ?? 10), 1, 100);
    activeSecPerSet = clamp(Math.round(reps * 2.8), 8, 240);
    activeMet = (exercise.targetWeightKg ?? 0) >= 40 ? 7.2 : 6.7;
  } else {
    const reps = clamp(Math.round(exercise.targetReps ?? 10), 1, 100);
    activeSecPerSet = clamp(Math.round(reps * 2.5), 8, 220);
    activeMet = 6.2;
  }

  const activeMin = (sets * activeSecPerSet) / SECOND_TO_MINUTE;
  const restMin = ((sets - 1) * restSec) / SECOND_TO_MINUTE;
  const kcalPerMinutePerMet = 0.0175 * bodyWeightKg;

  return activeMin * activeMet * kcalPerMinutePerMet + restMin * 1.5 * kcalPerMinutePerMet;
}

export function estimateSessionMetricsWithFormula(
  input: SessionEstimationInput,
  source: SessionEstimationResult["estimationSource"] = "formula",
): SessionEstimationResult {
  const bodyWeightKg = clamp(
    Math.round(input.bodyWeightKg ?? DEFAULT_BODY_WEIGHT_KG),
    35,
    250,
  );

  const totalSeconds = input.exercises.reduce(
    (sum, exercise) => sum + getExerciseSeconds(exercise),
    0,
  );
  const totalCalories = input.exercises.reduce(
    (sum, exercise) => sum + getExerciseCalories(exercise, bodyWeightKg),
    0,
  );

  return {
    estimatedDurationMin: Math.max(1, Math.round(totalSeconds / SECOND_TO_MINUTE)),
    estimatedCaloriesKcal: Math.max(1, Math.round(totalCalories)),
    estimationSource: source,
  };
}

export async function estimateSessionMetrics(
  input: SessionEstimationInput,
): Promise<SessionEstimationResult> {
  if (input.exercises.length === 0) {
    return {
      estimatedDurationMin: 0,
      estimatedCaloriesKcal: 0,
      estimationSource: "formula",
    };
  }

  const formulaEstimate = estimateSessionMetricsWithFormula(input, "formula");
  if (!GEMINI_API_KEY || isGeminiUnavailable) {
    return { ...formulaEstimate, estimationSource: "formula_fallback" };
  }

  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: buildGeminiPrompt(input, formulaEstimate),
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = parseGeminiEstimate(extractGeminiText(response));
    if (!parsed) {
      return { ...formulaEstimate, estimationSource: "formula_fallback" };
    }

    return {
      estimatedDurationMin: Math.max(
        1,
        Math.round(formulaEstimate.estimatedDurationMin * 0.65 + parsed.estimatedDurationMin * 0.35),
      ),
      estimatedCaloriesKcal: Math.max(
        1,
        Math.round(formulaEstimate.estimatedCaloriesKcal * 0.65 + parsed.estimatedCaloriesKcal * 0.35),
      ),
      estimationSource: "hybrid",
    };
  } catch {
    isGeminiUnavailable = true;
  }

  return { ...formulaEstimate, estimationSource: "formula_fallback" };
}
