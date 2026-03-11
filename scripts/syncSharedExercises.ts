import { config as loadEnv } from "dotenv";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { parseArgs } from "node:util";
import type { SharedExerciseDoc, TrackingMode } from "../src/types/firestore.ts";

const WGER_API_BASE = "https://wger.de/api/v2";
const WGER_FR_LANGUAGE_ID = 12;
const WGER_EN_LANGUAGE_ID = 2;
const DEFAULT_PAGE_SIZE = 100;
const FIRESTORE_BATCH_LIMIT = 400;

const CATEGORY_MAP: Record<string, string> = {
  abs: "abdos",
  arms: "bras",
  back: "dos",
  calves: "mollets",
  cardio: "cardio",
  chest: "pectoraux",
  legs: "jambes",
  shoulders: "epaules",
  olympics: "halterophilie",
  powerlifting: "powerlifting",
  stretching: "mobilite",
  "full body": "corps_entier",
};

const MACHINE_KEYWORDS = [
  "machine",
  "machines",
  "cable",
  "cables",
  "cavo",
  "polea",
  "poleas",
  "poulie",
  "poulies",
  "smith",
  "leg press",
  "hack squat",
  "pec deck",
  "butterfly",
  "lat pulldown",
  "seated row",
  "chest press",
  "leg extension",
  "leg curl",
  "calf raise machine",
  "guided",
  "guidee",
  "guides",
];

const DURATION_KEYWORDS = [
  "hold",
  "holds",
  "isometric",
  "isometrique",
  "isometrico",
  "isometrica",
  "stretch",
  "stretching",
  "etirement",
  "etirements",
  "mobility",
  "mobilite",
  "plank",
  "gainage",
  "wall sit",
  "dead hang",
  "support hold",
  "handstand hold",
  "seconds",
  "secondes",
  "sec",
  "time",
  "timed",
  "duration",
  "duree",
  "dehnung",
  "stretching",
];

const WEIGHTED_KEYWORDS = [
  "barbell",
  "dumbbell",
  "kettlebell",
  "halter",
  "haltere",
  "halteres",
  "mancuerna",
  "mancuernas",
  "mancuerne",
  "mancuernes",
  "weight",
  "weighted",
  "gewicht",
  "cable",
  "smith",
  "machine",
];

type JsonObject = Record<string, unknown>;

interface WgerPaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

interface WgerCategory {
  id: number;
  name: string;
}

interface WgerEquipment {
  id: number;
  name: string;
}

interface WgerLicense {
  id: number;
  full_name: string;
  short_name: string;
  url: string;
}

interface WgerAlias {
  id?: number;
  uuid?: string;
  alias: string;
}

interface WgerTranslation {
  id: number;
  uuid: string;
  name: string;
  description: string;
  language: number;
  aliases?: WgerAlias[];
  license_author?: string | null;
}

interface WgerImage {
  id: number;
  uuid: string;
  image: string;
  is_main: boolean;
  license_author?: string | null;
}

interface WgerVideo {
  id: number;
  uuid: string;
  video: string;
  is_main: boolean;
  license_author?: string | null;
}

interface WgerExerciseInfo {
  id: number;
  uuid: string;
  category: WgerCategory | null;
  equipment: WgerEquipment[];
  license: WgerLicense | null;
  license_author?: string | null;
  images: WgerImage[];
  translations: WgerTranslation[];
  videos: WgerVideo[];
}

type SharedExerciseSeed = Omit<SharedExerciseDoc, "createdAt" | "updatedAt">;

interface SyncOptions {
  dryRun: boolean;
  limit: number | null;
  pageSize: number;
  skipDeactivateMissing: boolean;
}

function loadEnvironment(): void {
  loadEnv({ path: ".env.local", override: false, quiet: true });
  loadEnv({ path: ".env", override: false, quiet: true });
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value: string): string {
  return normalizeText(value).replace(/\s+/g, "_");
}

function hasAnyKeyword(corpus: string, keywords: string[]): boolean {
  return keywords.some((keyword) => corpus.includes(normalizeText(keyword)));
}

function parsePositiveInteger(value: string | undefined, label: string): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${label}: "${value}"`);
  }

  return parsed;
}

function parseOptions(): SyncOptions {
  const parsed = parseArgs({
    options: {
      "dry-run": { type: "boolean", default: false },
      limit: { type: "string" },
      "page-size": { type: "string" },
      "skip-deactivate-missing": { type: "boolean", default: false },
    },
    allowPositionals: false,
  });

  return {
    dryRun: parsed.values["dry-run"],
    limit: parsePositiveInteger(parsed.values.limit, "limit"),
    pageSize: parsePositiveInteger(parsed.values["page-size"], "page-size") ?? DEFAULT_PAGE_SIZE,
    skipDeactivateMissing: parsed.values["skip-deactivate-missing"],
  };
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchJson<T>(url: string, attempt = 1): Promise<T> {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) {
    if (attempt < 4 && [429, 500, 502, 503, 504].includes(response.status)) {
      await delay(attempt * 500);
      return fetchJson<T>(url, attempt + 1);
    }

    throw new Error(`Wger request failed with status ${response.status} for ${url}`);
  }

  return (await response.json()) as T;
}

async function fetchAllExercises(options: SyncOptions): Promise<WgerExerciseInfo[]> {
  const firstUrl = new URL(`${WGER_API_BASE}/exerciseinfo/`);
  firstUrl.searchParams.set("limit", String(options.pageSize));

  let nextUrl: string | null = firstUrl.toString();
  const exercises: WgerExerciseInfo[] = [];

  while (nextUrl) {
    const page: WgerPaginatedResponse<WgerExerciseInfo> =
      await fetchJson<WgerPaginatedResponse<WgerExerciseInfo>>(nextUrl);

    for (const exercise of page.results) {
      exercises.push(exercise);

      if (options.limit !== null && exercises.length >= options.limit) {
        return exercises.slice(0, options.limit);
      }
    }

    nextUrl = page.next;
  }

  return exercises;
}

function selectPreferredTranslation(
  translations: WgerTranslation[],
): WgerTranslation | null {
  const namedTranslations = translations.filter((translation) => translation.name.trim());

  return (
    namedTranslations.find((translation) => translation.language === WGER_FR_LANGUAGE_ID) ??
    namedTranslations.find((translation) => translation.language === WGER_EN_LANGUAGE_ID) ??
    namedTranslations[0] ??
    null
  );
}

function selectPrimaryImage(images: WgerImage[]): WgerImage | null {
  return images.find((image) => image.is_main) ?? images[0] ?? null;
}

function selectPrimaryVideo(videos: WgerVideo[]): WgerVideo | null {
  return videos.find((video) => video.is_main) ?? videos[0] ?? null;
}

function mapCategory(category: WgerCategory | null): string {
  if (!category?.name.trim()) {
    return "personnalise";
  }

  const normalized = normalizeText(category.name);
  return CATEGORY_MAP[normalized] ?? (slugify(category.name) || "personnalise");
}

function buildSearchCorpus(exercise: WgerExerciseInfo): string {
  const translationBits = exercise.translations.flatMap((translation) => {
    const aliases = (translation.aliases ?? []).map((alias) => alias.alias);
    return [translation.name, stripHtml(translation.description), ...aliases];
  });

  const equipmentBits = exercise.equipment.map((equipment) => equipment.name);

  return normalizeText(
    [
      exercise.category?.name ?? "",
      ...equipmentBits,
      ...translationBits,
    ].join(" "),
  );
}

function inferMachine(exercise: WgerExerciseInfo, corpus: string): boolean {
  const normalizedEquipment = exercise.equipment.map((equipment) => normalizeText(equipment.name));

  if (normalizedEquipment.includes("none bodyweight exercise")) {
    return false;
  }

  return hasAnyKeyword(corpus, MACHINE_KEYWORDS);
}

function inferTrackingMode(
  exercise: WgerExerciseInfo,
  corpus: string,
  isMachine: boolean,
): TrackingMode {
  const normalizedEquipment = exercise.equipment.map((equipment) => normalizeText(equipment.name));
  const category = normalizeText(exercise.category?.name ?? "");

  if (category === "stretching" || category === "cardio" || hasAnyKeyword(corpus, DURATION_KEYWORDS)) {
    return "duration_only";
  }

  if (
    isMachine ||
    hasAnyKeyword(corpus, WEIGHTED_KEYWORDS) ||
    normalizedEquipment.some((equipment) =>
      [
        "barbell",
        "ez bar",
        "e z bar",
        "dumbbell",
        "kettlebell",
      ].includes(equipment),
    )
  ) {
    return "weight_reps";
  }

  return "reps_only";
}

function formatLicense(
  exercise: WgerExerciseInfo,
  translation: WgerTranslation | null,
  image: WgerImage | null,
  video: WgerVideo | null,
): string | null {
  const topLevelLicense = exercise.license;
  if (!topLevelLicense) {
    return null;
  }

  const author =
    exercise.license_author?.trim() ??
    translation?.license_author?.trim() ??
    image?.license_author?.trim() ??
    video?.license_author?.trim() ??
    null;

  const parts = [
    topLevelLicense.short_name.trim() || null,
    topLevelLicense.full_name.trim() &&
    topLevelLicense.full_name.trim() !== topLevelLicense.short_name.trim()
      ? topLevelLicense.full_name.trim()
      : null,
    author ? `author:${author}` : null,
    topLevelLicense.url.trim() || null,
  ].filter((part): part is string => Boolean(part));

  return parts.length > 0 ? parts.join(" | ") : null;
}

function mapDefaults(trackingMode: TrackingMode): Pick<
  SharedExerciseSeed,
  "defaultSets" | "defaultReps" | "defaultWeightKg" | "defaultDurationSec" | "defaultRestSec"
> {
  if (trackingMode === "duration_only") {
    return {
      defaultSets: 3,
      defaultReps: null,
      defaultWeightKg: null,
      defaultDurationSec: 30,
      defaultRestSec: 45,
    };
  }

  if (trackingMode === "reps_only") {
    return {
      defaultSets: 3,
      defaultReps: 12,
      defaultWeightKg: null,
      defaultDurationSec: null,
      defaultRestSec: 60,
    };
  }

  return {
    defaultSets: 3,
    defaultReps: 10,
    defaultWeightKg: null,
    defaultDurationSec: null,
    defaultRestSec: 90,
  };
}

function mapExercise(exercise: WgerExerciseInfo): { id: string; data: SharedExerciseSeed } | null {
  const translation = selectPreferredTranslation(exercise.translations);
  if (!translation?.name.trim()) {
    return null;
  }

  const corpus = buildSearchCorpus(exercise);
  const isMachine = inferMachine(exercise, corpus);
  const trackingMode = inferTrackingMode(exercise, corpus, isMachine);
  const defaults = mapDefaults(trackingMode);
  const primaryImage = selectPrimaryImage(exercise.images);
  const primaryVideo = selectPrimaryVideo(exercise.videos);
  const instructions = stripHtml(translation.description);

  return {
    id: `wger-${exercise.id}`,
    data: {
      name: translation.name.trim(),
      category: mapCategory(exercise.category),
      trackingMode,
      ...defaults,
      instructions: instructions.length > 0 ? instructions : null,
      isActive: true,
      isMachine,
      hasImage: Boolean(primaryImage?.image),
      hasVideo: Boolean(primaryVideo?.video),
      media: {
        imageUrl: primaryImage?.image ?? null,
        videoUrl: primaryVideo?.video ?? null,
      },
      source: "wger",
      sourceUrl: `${WGER_API_BASE}/exerciseinfo/${exercise.id}/`,
      sourceId: String(exercise.id),
      license: formatLicense(exercise, translation, primaryImage, primaryVideo),
    },
  };
}

function getFirebaseProjectId(serviceAccountJson: string | null): string | undefined {
  if (!serviceAccountJson) {
    return process.env.FIREBASE_PROJECT_ID;
  }

  const parsed = JSON.parse(serviceAccountJson) as JsonObject;
  const projectId = parsed.project_id;
  return typeof projectId === "string" ? projectId : process.env.FIREBASE_PROJECT_ID;
}

function initializeFirebaseAdmin() {
  const existingApp = getApps()[0];
  if (existingApp) {
    return existingApp;
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim() ?? null;
  const projectId = getFirebaseProjectId(serviceAccountJson);

  if (serviceAccountJson) {
    return initializeApp({
      credential: cert(JSON.parse(serviceAccountJson)),
      projectId,
    });
  }

  return initializeApp({
    credential: applicationDefault(),
    projectId,
  });
}

async function writeSyncResults(
  mappedExercises: Array<{ id: string; data: SharedExerciseSeed }>,
  options: SyncOptions,
): Promise<void> {
  const app = initializeFirebaseAdmin();
  const db = getFirestore(app);
  const collection = db.collection("sharedExercises");
  const existingSnapshot = await collection.where("source", "==", "wger").get();
  const existingDocs = new Map(existingSnapshot.docs.map((document) => [document.id, document]));

  let writeBatch = db.batch();
  let pendingOperations = 0;
  let committedOperations = 0;

  const commitBatch = async (): Promise<void> => {
    if (pendingOperations === 0) {
      return;
    }

    await writeBatch.commit();
    committedOperations += pendingOperations;
    writeBatch = db.batch();
    pendingOperations = 0;
  };

  for (const mappedExercise of mappedExercises) {
    if (pendingOperations >= FIRESTORE_BATCH_LIMIT) {
      await commitBatch();
    }

    const existingDoc = existingDocs.get(mappedExercise.id);
    const existingData = existingDoc?.data();

    writeBatch.set(
      collection.doc(mappedExercise.id),
      {
        ...mappedExercise.data,
        createdAt: existingData?.createdAt ?? FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    pendingOperations += 1;
  }

  if (!options.skipDeactivateMissing) {
    const liveIds = new Set(mappedExercises.map((exercise) => exercise.id));

    for (const existingDoc of existingSnapshot.docs) {
      if (liveIds.has(existingDoc.id)) {
        continue;
      }

      if (pendingOperations >= FIRESTORE_BATCH_LIMIT) {
        await commitBatch();
      }

      writeBatch.set(
        existingDoc.ref,
        {
          isActive: false,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      pendingOperations += 1;
    }
  }

  await commitBatch();
  console.log(`Firestore sync complete (${committedOperations} write operations).`);
}

function logDryRunPreview(mappedExercises: Array<{ id: string; data: SharedExerciseSeed }>): void {
  const preview = mappedExercises.slice(0, 5).map((exercise) => ({
    id: exercise.id,
    name: exercise.data.name,
    category: exercise.data.category,
    trackingMode: exercise.data.trackingMode,
    isMachine: exercise.data.isMachine,
    hasImage: exercise.data.hasImage,
    hasVideo: exercise.data.hasVideo,
    license: exercise.data.license,
  }));

  console.log(JSON.stringify(preview, null, 2));
}

async function main(): Promise<void> {
  loadEnvironment();
  const options = parseOptions();

  console.log("Fetching Wger exercise catalog...");
  const fetchedExercises = await fetchAllExercises(options);
  const frenchTranslationCount = fetchedExercises.filter((exercise) => {
    const translation = selectPreferredTranslation(exercise.translations);
    return translation?.language === WGER_FR_LANGUAGE_ID;
  }).length;
  const mappedExercises = fetchedExercises
    .map((exercise) => mapExercise(exercise))
    .filter((exercise): exercise is { id: string; data: SharedExerciseSeed } => Boolean(exercise));

  const stats = {
    fetched: fetchedExercises.length,
    mapped: mappedExercises.length,
    frenchPreferred: frenchTranslationCount,
    machineTagged: mappedExercises.filter((exercise) => exercise.data.isMachine).length,
    withImage: mappedExercises.filter((exercise) => exercise.data.hasImage).length,
    withVideo: mappedExercises.filter((exercise) => exercise.data.hasVideo).length,
    durationOnly: mappedExercises.filter((exercise) => exercise.data.trackingMode === "duration_only").length,
    repsOnly: mappedExercises.filter((exercise) => exercise.data.trackingMode === "reps_only").length,
    weightReps: mappedExercises.filter((exercise) => exercise.data.trackingMode === "weight_reps").length,
  };

  console.log(JSON.stringify(stats, null, 2));

  if (options.dryRun) {
    console.log("Dry run enabled, no Firestore writes will be performed.");
    logDryRunPreview(mappedExercises);
    return;
  }

  await writeSyncResults(mappedExercises, options);
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Shared exercise sync failed: ${message}`);
  process.exitCode = 1;
});
