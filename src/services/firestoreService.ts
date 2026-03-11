import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  writeBatch,
  where,
  type PartialWithFieldValue,
  type WithFieldValue,
} from "firebase/firestore";
import { db } from "../firebase.ts";
import type {
  ActiveSessionDoc,
  BodyMetricDoc,
  EstimationSource,
  ExerciseDoc,
  ExerciseStatsDoc,
  ExerciseTimelinePointDoc,
  PlanDoc,
  PlanItemDoc,
  ProgressPhotoDoc,
  SharedExerciseDoc,
  SharedExerciseMedia,
  SessionDoc,
  SessionExerciseDoc,
  SessionExerciseStatus,
  SessionStatus,
  SetEntryDoc,
  TrackingMode,
  UserProfileDoc,
} from "../types/firestore.ts";

const userDocRef = (uid: string) => doc(db, "users", uid);
const exercisesCollectionRef = (uid: string) =>
  collection(db, "users", uid, "exercises");
const sharedExercisesCollectionRef = () => collection(db, "sharedExercises");
const sharedExerciseDocRef = (sharedExerciseId: string) =>
  doc(db, "sharedExercises", sharedExerciseId);
const plansCollectionRef = (uid: string) =>
  collection(db, "users", uid, "plans");
const planDocRef = (uid: string, planId: string) =>
  doc(db, "users", uid, "plans", planId);
const planItemsCollectionRef = (uid: string, planId: string) =>
  collection(db, "users", uid, "plans", planId, "items");
const sessionsCollectionRef = (uid: string) =>
  collection(db, "users", uid, "sessions");
const sessionDocRef = (uid: string, sessionId: string) =>
  doc(db, "users", uid, "sessions", sessionId);
const sessionExercisesCollectionRef = (uid: string, sessionId: string) =>
  collection(db, "users", uid, "sessions", sessionId, "exercises");
const sessionExerciseDocRef = (
  uid: string,
  sessionId: string,
  sessionExerciseId: string,
) =>
  doc(db, "users", uid, "sessions", sessionId, "exercises", sessionExerciseId);
const setsCollectionRef = (
  uid: string,
  sessionId: string,
  sessionExerciseId: string,
) =>
  collection(
    db,
    "users",
    uid,
    "sessions",
    sessionId,
    "exercises",
    sessionExerciseId,
    "sets",
  );
const setDocRef = (
  uid: string,
  sessionId: string,
  sessionExerciseId: string,
  setId: string,
) =>
  doc(
    db,
    "users",
    uid,
    "sessions",
    sessionId,
    "exercises",
    sessionExerciseId,
    "sets",
    setId,
  );
const activeSessionDocRef = (uid: string) =>
  doc(db, "users", uid, "activeSession", "current");
const bodyMetricsCollectionRef = (uid: string) =>
  collection(db, "users", uid, "bodyMetrics");
const progressPhotosCollectionRef = (uid: string) =>
  collection(db, "users", uid, "progressPhotos");
const progressPhotoDocRef = (uid: string, photoId: string) =>
  doc(db, "users", uid, "progressPhotos", photoId);
const exerciseStatsDocRef = (uid: string, exerciseId: string) =>
  doc(db, "users", uid, "exerciseStats", exerciseId);
const exerciseTimelineCollectionRef = (uid: string, exerciseId: string) =>
  collection(db, "users", uid, "exerciseStats", exerciseId, "timeline");

export interface UpsertUserProfileInput {
  displayName: string;
  email: string;
  defaultRestSec?: number;
}

export interface CreateExerciseInput {
  name: string;
  category: string;
  trackingMode: TrackingMode;
  defaultSets: number;
  defaultReps?: number | null;
  defaultWeightKg?: number | null;
  defaultDurationSec?: number | null;
  defaultRestSec?: number;
  isActive?: boolean;
  sourceSharedExerciseId?: string | null;
  instructions?: string | null;
  isMachine?: boolean;
  hasImage?: boolean;
  hasVideo?: boolean;
  media?: SharedExerciseMedia | null;
  source?: string | null;
  sourceUrl?: string | null;
  sourceId?: string | null;
  license?: string | null;
}

export interface CreatePlanInput {
  name: string;
  gymName: string;
  isActive?: boolean;
  estimatedDurationMin?: number | null;
  estimatedCaloriesKcal?: number | null;
  estimationSource?: EstimationSource | null;
  estimatedAt?: Timestamp | null;
}

export interface CreatePlanItemInput {
  order?: number;
  exerciseId: string;
  targetSets: number;
  targetReps?: number | null;
  targetWeightKg?: number | null;
  targetDurationSec?: number | null;
  restSec: number;
  notes?: string;
}

export interface CreatePlanWithItemsInput extends CreatePlanInput {
  items: CreatePlanItemInput[];
}

export interface AddPlanItemInput {
  order: number;
  exerciseId: string;
  targetSets: number;
  targetReps?: number | null;
  targetWeightKg?: number | null;
  targetDurationSec?: number | null;
  restSec: number;
  notes?: string;
}

export interface StartSessionInput {
  planId?: string | null;
  gymName: string;
  estimatedDurationMin?: number | null;
  estimatedCaloriesKcal?: number | null;
  estimationSource?: EstimationSource | null;
  estimatedAt?: Timestamp | null;
  notes?: string;
}

export interface StartExerciseInput {
  exerciseId: string;
  exerciseNameSnapshot: string;
  order: number;
  trackingMode: TrackingMode;
  targetSets: number;
  targetReps?: number | null;
  targetWeightKg?: number | null;
  targetDurationSec?: number | null;
  restSec: number;
}

export interface LogSetInput {
  setNumber: number;
  reps?: number | null;
  weightKg?: number | null;
  durationSec?: number | null;
  startedAt?: Timestamp;
  endedAt?: Timestamp | null;
  restPlannedSec?: number | null;
  isWarmup?: boolean;
  rpe?: number | null;
}

export interface AddBodyMetricInput {
  measuredAt?: Timestamp;
  weightKg: number;
  bodyFatPct?: number | null;
  musclePct?: number | null;
  muscleMassKg?: number | null;
  note?: string;
}

export interface AddProgressPhotoInput {
  takenAt?: Timestamp;
  storagePath: string;
  thumbnailPath?: string | null;
  weightKgSnapshot?: number | null;
  bodyFatPctSnapshot?: number | null;
  note?: string;
  mediaType?: "image" | "video";
  kind?: "original" | "fade";
  sourcePhotoIds?: string[] | null;
}

export interface UpdateSessionExerciseInput {
  id?: string;
  exerciseId: string;
  exerciseNameSnapshot: string;
  status: SessionExerciseStatus;
  order?: number;
  trackingMode: TrackingMode;
  targetSets: number;
  targetReps?: number | null;
  targetWeightKg?: number | null;
  targetDurationSec?: number | null;
  restSec: number;
  completedSets: number;
  totalReps: number;
  totalVolumeKg: number;
  totalDurationSec: number;
}

export interface UpdateSessionExerciseConfigInput {
  exerciseNameSnapshot: string;
  targetSets: number;
  targetReps?: number | null;
  targetWeightKg?: number | null;
  targetDurationSec?: number | null;
  restSec: number;
}

export interface UpdatePastSessionInput {
  gymName: string;
  status: Exclude<SessionStatus, "active">;
  notes?: string;
  exercises: UpdateSessionExerciseInput[];
}

export interface UpsertExerciseStatsInput {
  bestWeightKg?: number;
  bestVolumeKg?: number;
  bestEstimated1RM?: number;
  lastSessionAt?: Timestamp | null;
  incrementSessionsBy?: number;
}

export interface AddExerciseTimelinePointInput {
  date?: Timestamp;
  bestWeightKg: number;
  volumeKg: number;
  totalReps: number;
  estimated1RM: number;
  sessionId: string;
}

const EMPTY_SHARED_MEDIA: SharedExerciseMedia = {
  imageUrl: null,
  videoUrl: null,
};

function normalizeExerciseDoc(exercise: ExerciseDoc): ExerciseDoc {
  return {
    ...exercise,
    instructions: exercise.instructions ?? null,
    isMachine: exercise.isMachine ?? false,
    hasImage: exercise.hasImage ?? Boolean(exercise.media?.imageUrl),
    hasVideo: exercise.hasVideo ?? Boolean(exercise.media?.videoUrl),
    media: exercise.media ?? EMPTY_SHARED_MEDIA,
    source: exercise.source ?? null,
    sourceUrl: exercise.sourceUrl ?? null,
    sourceId: exercise.sourceId ?? null,
    license: exercise.license ?? null,
  };
}

function normalizeSharedExerciseDoc(exercise: SharedExerciseDoc): SharedExerciseDoc {
  return {
    ...exercise,
    instructions: exercise.instructions ?? null,
    media: exercise.media ?? EMPTY_SHARED_MEDIA,
    hasImage: exercise.hasImage ?? Boolean(exercise.media?.imageUrl),
    hasVideo: exercise.hasVideo ?? Boolean(exercise.media?.videoUrl),
  };
}

function getImportedExerciseMetadata(sharedExercise: SharedExerciseDoc): Pick<
  CreateExerciseInput,
  | "instructions"
  | "isMachine"
  | "hasImage"
  | "hasVideo"
  | "media"
  | "source"
  | "sourceUrl"
  | "sourceId"
  | "license"
> {
  return {
    instructions: sharedExercise.instructions ?? null,
    isMachine: sharedExercise.isMachine,
    hasImage: sharedExercise.hasImage,
    hasVideo: sharedExercise.hasVideo,
    media: sharedExercise.media ?? EMPTY_SHARED_MEDIA,
    source: sharedExercise.source,
    sourceUrl: sharedExercise.sourceUrl ?? null,
    sourceId: sharedExercise.sourceId ?? null,
    license: sharedExercise.license ?? null,
  };
}

async function hydrateLegacyImportedExercise(
  exercise: ExerciseDoc,
): Promise<ExerciseDoc> {
  if (!exercise.sourceSharedExerciseId || exercise.source) {
    return exercise;
  }

  const sharedExerciseSnapshot = await getDoc(
    sharedExerciseDocRef(exercise.sourceSharedExerciseId),
  );
  if (!sharedExerciseSnapshot.exists()) {
    return exercise;
  }

  const sharedExercise = normalizeSharedExerciseDoc(
    sharedExerciseSnapshot.data() as SharedExerciseDoc,
  );

  return {
    ...exercise,
    ...getImportedExerciseMetadata(sharedExercise),
  };
}

export async function upsertUserProfile(
  uid: string,
  input: UpsertUserProfileInput,
): Promise<void> {
  const reference = userDocRef(uid);
  const snapshot = await getDoc(reference);

  if (!snapshot.exists()) {
    const createPayload: WithFieldValue<UserProfileDoc> = {
      displayName: input.displayName,
      email: input.email,
      defaultRestSec: input.defaultRestSec ?? 30,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(reference, createPayload);
    return;
  }

  const updatePayload: PartialWithFieldValue<UserProfileDoc> = {
    displayName: input.displayName,
    email: input.email,
    defaultRestSec: input.defaultRestSec ?? 30,
    updatedAt: serverTimestamp(),
  };
  await setDoc(reference, updatePayload, { merge: true });
}

export async function createExercise(
  uid: string,
  input: CreateExerciseInput,
): Promise<string> {
  const payload: WithFieldValue<ExerciseDoc> = {
    name: input.name,
    category: input.category,
    trackingMode: input.trackingMode,
    defaultSets: input.defaultSets,
    defaultReps: input.defaultReps ?? null,
    defaultWeightKg: input.defaultWeightKg ?? null,
    defaultDurationSec: input.defaultDurationSec ?? null,
    defaultRestSec: input.defaultRestSec ?? 30,
    isActive: input.isActive ?? true,
    sourceSharedExerciseId: input.sourceSharedExerciseId ?? null,
    instructions: input.instructions ?? null,
    isMachine: input.isMachine ?? false,
    hasImage: input.hasImage ?? Boolean(input.media?.imageUrl),
    hasVideo: input.hasVideo ?? Boolean(input.media?.videoUrl),
    media: input.media ?? EMPTY_SHARED_MEDIA,
    source: input.source ?? null,
    sourceUrl: input.sourceUrl ?? null,
    sourceId: input.sourceId ?? null,
    license: input.license ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const reference = await addDoc(exercisesCollectionRef(uid), payload);
  return reference.id;
}

export async function listExercises(
  uid: string,
  maxItems = 200,
): Promise<Array<ExerciseDoc & { id: string }>> {
  const exercisesQuery = query(
    exercisesCollectionRef(uid),
    orderBy("updatedAt", "desc"),
    limit(maxItems),
  );
  const snapshot = await getDocs(exercisesQuery);

  const exercises = await Promise.all(
    snapshot.docs.map(async (document) => {
      const normalizedExercise = normalizeExerciseDoc(document.data() as ExerciseDoc);
      const hydratedExercise = await hydrateLegacyImportedExercise(normalizedExercise);

      return {
      id: document.id,
        ...hydratedExercise,
      };
    }),
  );

  return exercises.filter((exercise) => exercise.isActive);
}

export async function listSharedExercises(
  maxItems = 500,
): Promise<Array<SharedExerciseDoc & { id: string }>> {
  const sharedExercisesQuery = query(
    sharedExercisesCollectionRef(),
    orderBy("name", "asc"),
    limit(maxItems),
  );
  const snapshot = await getDocs(sharedExercisesQuery);

  return snapshot.docs
    .map((document) => ({
      id: document.id,
      ...normalizeSharedExerciseDoc(document.data() as SharedExerciseDoc),
    }))
    .filter((exercise) => exercise.isActive);
}

export async function importSharedExerciseToUser(
  uid: string,
  sharedExerciseId: string,
): Promise<string> {
  const existingExerciseQuery = query(
    exercisesCollectionRef(uid),
    where("sourceSharedExerciseId", "==", sharedExerciseId),
    limit(1),
  );
  const existingExerciseSnapshot = await getDocs(existingExerciseQuery);
  const sharedExerciseSnapshot = await getDoc(sharedExerciseDocRef(sharedExerciseId));

  if (!existingExerciseSnapshot.empty) {
    const existingExerciseDocument = existingExerciseSnapshot.docs[0];
    const existingExercise = existingExerciseDocument.data() as ExerciseDoc;
    const metadataPatch =
      sharedExerciseSnapshot.exists()
        ? getImportedExerciseMetadata(
            normalizeSharedExerciseDoc(sharedExerciseSnapshot.data() as SharedExerciseDoc),
          )
        : {};

    await setDoc(
      existingExerciseDocument.ref,
      {
        ...metadataPatch,
        isActive: existingExercise.isActive ? existingExercise.isActive : true,
        updatedAt: serverTimestamp(),
      } satisfies PartialWithFieldValue<ExerciseDoc>,
      { merge: true },
    );

    return existingExerciseDocument.id;
  }

  if (!sharedExerciseSnapshot.exists()) {
    throw new Error(`Exercice partage "${sharedExerciseId}" introuvable.`);
  }

  const sharedExercise = normalizeSharedExerciseDoc(
    sharedExerciseSnapshot.data() as SharedExerciseDoc,
  );
  if (!sharedExercise.isActive) {
    throw new Error(`Exercice partage "${sharedExerciseId}" inactif.`);
  }

  return createExercise(uid, {
    name: sharedExercise.name,
    category: sharedExercise.category,
    trackingMode: sharedExercise.trackingMode,
    defaultSets: sharedExercise.defaultSets,
    defaultReps: sharedExercise.defaultReps,
    defaultWeightKg: sharedExercise.defaultWeightKg,
    defaultDurationSec: sharedExercise.defaultDurationSec,
    defaultRestSec: sharedExercise.defaultRestSec,
    isActive: true,
    sourceSharedExerciseId: sharedExerciseId,
    ...getImportedExerciseMetadata(sharedExercise),
  });
}

export async function listPlans(
  uid: string,
  maxItems = 100,
): Promise<Array<PlanDoc & { id: string }>> {
  const plansQuery = query(
    plansCollectionRef(uid),
    orderBy("updatedAt", "desc"),
    limit(maxItems),
  );
  const snapshot = await getDocs(plansQuery);

  return snapshot.docs
    .map((document) => ({
      id: document.id,
      ...(document.data() as PlanDoc),
    }))
    .filter((plan) => plan.isActive);
}

export async function listPlanItems(
  uid: string,
  planId: string,
  maxItems = 100,
): Promise<Array<PlanItemDoc & { id: string }>> {
  const itemsQuery = query(
    planItemsCollectionRef(uid, planId),
    orderBy("order", "asc"),
    limit(maxItems),
  );
  const snapshot = await getDocs(itemsQuery);

  return snapshot.docs.map((document) => ({
    id: document.id,
    ...(document.data() as PlanItemDoc),
  }));
}

export async function listSessions(
  uid: string,
  maxItems = 120,
): Promise<Array<SessionDoc & { id: string }>> {
  const sessionsQuery = query(
    sessionsCollectionRef(uid),
    orderBy("startedAt", "desc"),
    limit(maxItems),
  );
  const snapshot = await getDocs(sessionsQuery);

  return snapshot.docs.map((document) => ({
    id: document.id,
    ...(document.data() as SessionDoc),
  }));
}

export async function listSessionExercises(
  uid: string,
  sessionId: string,
  maxItems = 120,
): Promise<Array<SessionExerciseDoc & { id: string }>> {
  const exercisesQuery = query(
    sessionExercisesCollectionRef(uid, sessionId),
    orderBy("order", "asc"),
    limit(maxItems),
  );
  const snapshot = await getDocs(exercisesQuery);

  return snapshot.docs.map((document) => ({
    id: document.id,
    ...(document.data() as SessionExerciseDoc),
  }));
}

export async function listSessionExerciseSets(
  uid: string,
  sessionId: string,
  sessionExerciseId: string,
  maxItems = 200,
): Promise<Array<SetEntryDoc & { id: string }>> {
  const setsQuery = query(
    setsCollectionRef(uid, sessionId, sessionExerciseId),
    orderBy("setNumber", "asc"),
    limit(maxItems),
  );
  const snapshot = await getDocs(setsQuery);

  return snapshot.docs.map((document) => ({
    id: document.id,
    ...(document.data() as SetEntryDoc),
  }));
}

export async function listBodyMetrics(
  uid: string,
  maxItems = 120,
): Promise<Array<BodyMetricDoc & { id: string }>> {
  const metricsQuery = query(
    bodyMetricsCollectionRef(uid),
    orderBy("measuredAt", "desc"),
    limit(maxItems),
  );
  const snapshot = await getDocs(metricsQuery);

  return snapshot.docs.map((document) => ({
    id: document.id,
    ...(document.data() as BodyMetricDoc),
  }));
}

export async function listProgressPhotos(
  uid: string,
  maxItems = 60,
): Promise<Array<ProgressPhotoDoc & { id: string }>> {
  const photosQuery = query(
    progressPhotosCollectionRef(uid),
    orderBy("takenAt", "desc"),
    limit(maxItems),
  );
  const snapshot = await getDocs(photosQuery);

  return snapshot.docs.map((document) => ({
    id: document.id,
    ...(document.data() as ProgressPhotoDoc),
  }));
}

export async function createPlan(
  uid: string,
  input: CreatePlanInput,
): Promise<string> {
  const hasEstimate =
    input.estimatedDurationMin !== undefined ||
    input.estimatedCaloriesKcal !== undefined;

  const payload: WithFieldValue<PlanDoc> = {
    name: input.name,
    gymName: input.gymName,
    isActive: input.isActive ?? true,
    estimatedDurationMin: input.estimatedDurationMin ?? null,
    estimatedCaloriesKcal: input.estimatedCaloriesKcal ?? null,
    estimationSource: input.estimationSource ?? null,
    estimatedAt: input.estimatedAt ?? (hasEstimate ? serverTimestamp() : null),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const reference = await addDoc(plansCollectionRef(uid), payload);
  return reference.id;
}

export async function createPlanWithItems(
  uid: string,
  input: CreatePlanWithItemsInput,
): Promise<string> {
  const planReference = doc(plansCollectionRef(uid));
  const batch = writeBatch(db);
  const hasEstimate =
    input.estimatedDurationMin !== undefined ||
    input.estimatedCaloriesKcal !== undefined;

  const planPayload: WithFieldValue<PlanDoc> = {
    name: input.name,
    gymName: input.gymName,
    isActive: input.isActive ?? true,
    estimatedDurationMin: input.estimatedDurationMin ?? null,
    estimatedCaloriesKcal: input.estimatedCaloriesKcal ?? null,
    estimationSource: input.estimationSource ?? null,
    estimatedAt: input.estimatedAt ?? (hasEstimate ? serverTimestamp() : null),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  batch.set(planReference, planPayload);

  input.items.forEach((item, index) => {
    const planItemReference = doc(planItemsCollectionRef(uid, planReference.id));
    const planItemPayload: WithFieldValue<PlanItemDoc> = {
      order: item.order ?? index + 1,
      exerciseId: item.exerciseId,
      targetSets: Math.max(1, item.targetSets),
      targetReps: item.targetReps ?? null,
      targetWeightKg: item.targetWeightKg ?? null,
      targetDurationSec: item.targetDurationSec ?? null,
      restSec: Math.max(5, item.restSec),
      notes: item.notes ?? "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    batch.set(planItemReference, planItemPayload);
  });

  await batch.commit();
  return planReference.id;
}

export async function updatePlanWithItems(
  uid: string,
  planId: string,
  input: CreatePlanWithItemsInput,
): Promise<void> {
  const planReference = planDocRef(uid, planId);
  const existingItemsSnapshot = await getDocs(planItemsCollectionRef(uid, planId));
  const batch = writeBatch(db);
  const hasEstimate =
    input.estimatedDurationMin !== undefined ||
    input.estimatedCaloriesKcal !== undefined;

  const planPatch: PartialWithFieldValue<PlanDoc> = {
    name: input.name,
    gymName: input.gymName,
    isActive: input.isActive ?? true,
    estimatedDurationMin: input.estimatedDurationMin ?? null,
    estimatedCaloriesKcal: input.estimatedCaloriesKcal ?? null,
    estimationSource: input.estimationSource ?? null,
    estimatedAt: input.estimatedAt ?? (hasEstimate ? serverTimestamp() : null),
    updatedAt: serverTimestamp(),
  };
  batch.set(planReference, planPatch, { merge: true });

  existingItemsSnapshot.docs.forEach((documentSnapshot) => {
    batch.delete(documentSnapshot.ref);
  });

  input.items.forEach((item, index) => {
    const planItemReference = doc(planItemsCollectionRef(uid, planId));
    const planItemPayload: WithFieldValue<PlanItemDoc> = {
      order: item.order ?? index + 1,
      exerciseId: item.exerciseId,
      targetSets: Math.max(1, item.targetSets),
      targetReps: item.targetReps ?? null,
      targetWeightKg: item.targetWeightKg ?? null,
      targetDurationSec: item.targetDurationSec ?? null,
      restSec: Math.max(5, item.restSec),
      notes: item.notes ?? "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    batch.set(planItemReference, planItemPayload);
  });

  await batch.commit();
}

export async function deletePlan(uid: string, planId: string): Promise<void> {
  const planPatch: PartialWithFieldValue<PlanDoc> = {
    isActive: false,
    updatedAt: serverTimestamp(),
  };
  await setDoc(planDocRef(uid, planId), planPatch, { merge: true });
}

export async function deleteSession(uid: string, sessionId: string): Promise<void> {
  const sessionReference = sessionDocRef(uid, sessionId);
  const sessionSnapshot = await getDoc(sessionReference);

  if (!sessionSnapshot.exists()) {
    throw new Error(`Session "${sessionId}" introuvable.`);
  }

  const exercisesSnapshot = await getDocs(sessionExercisesCollectionRef(uid, sessionId));

  for (const exerciseDoc of exercisesSnapshot.docs) {
    const setsSnapshot = await getDocs(setsCollectionRef(uid, sessionId, exerciseDoc.id));

    for (const setDocSnapshot of setsSnapshot.docs) {
      await deleteDoc(setDocSnapshot.ref);
    }

    await deleteDoc(exerciseDoc.ref);
  }

  const activeReference = activeSessionDocRef(uid);
  const activeSnapshot = await getDoc(activeReference);
  if (activeSnapshot.exists()) {
    const activeSession = activeSnapshot.data() as ActiveSessionDoc;
    if (activeSession.sessionId === sessionId) {
      await deleteDoc(activeReference);
    }
  }

  await deleteDoc(sessionReference);
}

export async function updatePastSession(
  uid: string,
  sessionId: string,
  input: UpdatePastSessionInput,
): Promise<void> {
  if (!Array.isArray(input.exercises) || input.exercises.length === 0) {
    throw new Error("Une seance doit contenir au moins un exercice.");
  }

  const sessionReference = sessionDocRef(uid, sessionId);
  const sessionSnapshot = await getDoc(sessionReference);
  if (!sessionSnapshot.exists()) {
    throw new Error(`Session "${sessionId}" introuvable.`);
  }

  const currentSession = sessionSnapshot.data() as SessionDoc;
  const existingExercisesSnapshot = await getDocs(sessionExercisesCollectionRef(uid, sessionId));
  const existingExercises = new Map(
    existingExercisesSnapshot.docs.map((documentSnapshot) => [
      documentSnapshot.id,
      documentSnapshot.data() as SessionExerciseDoc,
    ]),
  );

  const batch = writeBatch(db);
  const inputExerciseIds = new Set(
    input.exercises
      .map((exercise) => exercise.id?.trim() ?? "")
      .filter((exerciseId) => exerciseId.length > 0),
  );

  for (const existingExerciseDoc of existingExercisesSnapshot.docs) {
    if (inputExerciseIds.has(existingExerciseDoc.id)) {
      continue;
    }

    const setsSnapshot = await getDocs(setsCollectionRef(uid, sessionId, existingExerciseDoc.id));
    for (const setDocumentSnapshot of setsSnapshot.docs) {
      batch.delete(setDocumentSnapshot.ref);
    }

    batch.delete(existingExerciseDoc.ref);
  }

  input.exercises.forEach((exercise, index) => {
    const existingExerciseId = exercise.id?.trim() ?? "";
    const existingExercise = existingExercises.get(existingExerciseId);
    const exerciseReference =
      existingExerciseId.length > 0
        ? sessionExerciseDocRef(uid, sessionId, existingExerciseId)
        : doc(sessionExercisesCollectionRef(uid, sessionId));
    const normalizedStatus =
      exercise.status === "active" ? "completed" : exercise.status;
    const targetSets = Math.max(1, Math.round(exercise.targetSets));
    const completedSets = Math.max(0, Math.min(targetSets, Math.round(exercise.completedSets)));
    const reps = Math.max(0, Math.round(exercise.totalReps));
    const duration = Math.max(0, Math.round(exercise.totalDurationSec));
    const weight = exercise.targetWeightKg ?? null;
    const volume = Math.max(
      0,
      Number.isFinite(exercise.totalVolumeKg)
        ? Math.round(exercise.totalVolumeKg)
        : Math.round((weight ?? 0) * reps),
    );
    const endedAt = currentSession.endedAt ?? Timestamp.now();
    const completedAt = normalizedStatus === "completed" ? endedAt ?? Timestamp.now() : null;
    const normalizedExerciseId =
      exercise.exerciseId.trim().length > 0
        ? exercise.exerciseId.trim()
        : `manual-${sessionId}-${index + 1}`;
    const normalizedExerciseName =
      exercise.exerciseNameSnapshot.trim().length > 0
        ? exercise.exerciseNameSnapshot.trim()
        : `Exercice ${index + 1}`;
    const normalizedOrder = exercise.order ?? index + 1;
    const normalizedRestSec = Math.max(0, Math.round(exercise.restSec));
    const normalizedTargetReps =
      typeof exercise.targetReps === "number" ? Math.max(0, Math.round(exercise.targetReps)) : null;
    const normalizedTargetDurationSec =
      typeof exercise.targetDurationSec === "number"
        ? Math.max(0, Math.round(exercise.targetDurationSec))
        : null;

    if (existingExercise) {
      const exercisePatch: PartialWithFieldValue<SessionExerciseDoc> = {
        exerciseId: normalizedExerciseId,
        exerciseNameSnapshot: normalizedExerciseName,
        status: normalizedStatus,
        completedAt,
        order: normalizedOrder,
        trackingMode: exercise.trackingMode,
        targetSets,
        targetReps: normalizedTargetReps,
        targetWeightKg: weight,
        targetDurationSec: normalizedTargetDurationSec,
        restSec: normalizedRestSec,
        startedAt: existingExercise.startedAt ?? currentSession.startedAt,
        endedAt,
        completedSets,
        totalReps: reps,
        totalVolumeKg: volume,
        totalDurationSec: duration,
        updatedAt: serverTimestamp(),
      };

      batch.set(exerciseReference, exercisePatch, { merge: true });
      return;
    }

    const newExercisePayload: WithFieldValue<SessionExerciseDoc> = {
      exerciseId: normalizedExerciseId,
      exerciseNameSnapshot: normalizedExerciseName,
      status: normalizedStatus,
      completedAt,
      order: normalizedOrder,
      trackingMode: exercise.trackingMode,
      targetSets,
      targetReps: normalizedTargetReps,
      targetWeightKg: weight,
      targetDurationSec: normalizedTargetDurationSec,
      restSec: normalizedRestSec,
      startedAt: currentSession.startedAt,
      endedAt,
      completedSets,
      totalReps: reps,
      totalVolumeKg: volume,
      totalDurationSec: duration,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    batch.set(exerciseReference, newExercisePayload);
  });

  const endedAt = currentSession.endedAt ?? Timestamp.now();
  const durationFromDates =
    currentSession.startedAt instanceof Timestamp
      ? Math.max(
          0,
          Math.round((endedAt.toMillis() - currentSession.startedAt.toMillis()) / 1000),
        )
      : null;
  const durationSec =
    currentSession.durationSec !== null && Number.isFinite(currentSession.durationSec)
      ? Math.max(0, Math.round(currentSession.durationSec))
      : durationFromDates;
  const sessionPatch: PartialWithFieldValue<SessionDoc> = {
    gymName: input.gymName.trim().length > 0 ? input.gymName.trim() : currentSession.gymName,
    status: input.status,
    endedAt,
    durationSec,
    notes: input.notes ?? currentSession.notes ?? "",
    updatedAt: serverTimestamp(),
  };

  batch.set(sessionReference, sessionPatch, { merge: true });
  await batch.commit();
}

export async function addPlanItem(
  uid: string,
  planId: string,
  input: AddPlanItemInput,
): Promise<string> {
  const payload: WithFieldValue<PlanItemDoc> = {
    order: input.order,
    exerciseId: input.exerciseId,
    targetSets: input.targetSets,
    targetReps: input.targetReps ?? null,
    targetWeightKg: input.targetWeightKg ?? null,
    targetDurationSec: input.targetDurationSec ?? null,
    restSec: input.restSec,
    notes: input.notes ?? "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const reference = await addDoc(planItemsCollectionRef(uid, planId), payload);
  return reference.id;
}

export async function startSession(
  uid: string,
  input: StartSessionInput,
): Promise<string> {
  const sessionReference = doc(sessionsCollectionRef(uid));
  const batch = writeBatch(db);
  let estimatedDurationMin = input.estimatedDurationMin;
  let estimatedCaloriesKcal = input.estimatedCaloriesKcal;
  let estimationSource = input.estimationSource;
  let estimatedAt = input.estimatedAt;

  if (
    input.planId &&
    estimatedDurationMin === undefined &&
    estimatedCaloriesKcal === undefined &&
    estimationSource === undefined &&
    estimatedAt === undefined
  ) {
    const planSnapshot = await getDoc(planDocRef(uid, input.planId));
    if (planSnapshot.exists()) {
      const planData = planSnapshot.data() as PlanDoc;
      estimatedDurationMin = planData.estimatedDurationMin ?? null;
      estimatedCaloriesKcal = planData.estimatedCaloriesKcal ?? null;
      estimationSource = planData.estimationSource ?? null;
      estimatedAt = planData.estimatedAt ?? null;
    }
  }

  const hasEstimate =
    estimatedDurationMin !== undefined || estimatedCaloriesKcal !== undefined;

  const sessionPayload: WithFieldValue<SessionDoc> = {
    planId: input.planId ?? null,
    gymName: input.gymName,
    status: "active",
    startedAt: serverTimestamp(),
    endedAt: null,
    durationSec: null,
    estimatedDurationMin: estimatedDurationMin ?? null,
    estimatedCaloriesKcal: estimatedCaloriesKcal ?? null,
    estimationSource: estimationSource ?? null,
    estimatedAt: estimatedAt ?? (hasEstimate ? serverTimestamp() : null),
    notes: input.notes ?? "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const activeSessionPayload: WithFieldValue<ActiveSessionDoc> = {
    sessionId: sessionReference.id,
    activeExerciseId: null,
    activeSetNumber: 1,
    restEndsAt: null,
    updatedAt: serverTimestamp(),
  };

  batch.set(sessionReference, sessionPayload);
  batch.set(activeSessionDocRef(uid), activeSessionPayload);
  await batch.commit();

  return sessionReference.id;
}

export async function endSession(
  uid: string,
  sessionId: string,
  status: Exclude<SessionStatus, "active"> = "completed",
  notes?: string,
): Promise<void> {
  const sessionReference = sessionDocRef(uid, sessionId);
  const activeReference = activeSessionDocRef(uid);
  const sessionSnapshot = await getDoc(sessionReference);
  if (!sessionSnapshot.exists()) {
    throw new Error(`Session "${sessionId}" introuvable.`);
  }

  const session = sessionSnapshot.data() as SessionDoc;
  const endedAt = Timestamp.now();
  const durationSec =
    session.startedAt instanceof Timestamp
      ? Math.max(0, Math.round((endedAt.toMillis() - session.startedAt.toMillis()) / 1000))
      : session.durationSec;

  const batch = writeBatch(db);

  const sessionPatch: PartialWithFieldValue<SessionDoc> = {
    status,
    endedAt,
    durationSec: durationSec ?? null,
    notes: notes ?? session.notes ?? "",
    updatedAt: serverTimestamp(),
  };
  batch.set(sessionReference, sessionPatch, { merge: true });

  const activeSnapshot = await getDoc(activeReference);
  if (activeSnapshot.exists()) {
    const activeSession = activeSnapshot.data() as ActiveSessionDoc;
    if (activeSession.sessionId === sessionId) {
      batch.delete(activeReference);
    }
  }

  await batch.commit();
}

export async function startExercise(
  uid: string,
  sessionId: string,
  input: StartExerciseInput,
): Promise<string> {
  const sessionExerciseReference = doc(sessionExercisesCollectionRef(uid, sessionId));
  const batch = writeBatch(db);

  const payload: WithFieldValue<SessionExerciseDoc> = {
    exerciseId: input.exerciseId,
    exerciseNameSnapshot: input.exerciseNameSnapshot,
    status: "active",
    completedAt: null,
    order: input.order,
    trackingMode: input.trackingMode,
    targetSets: input.targetSets,
    targetReps: input.targetReps ?? null,
    targetWeightKg: input.targetWeightKg ?? null,
    targetDurationSec: input.targetDurationSec ?? null,
    restSec: input.restSec,
    startedAt: serverTimestamp(),
    endedAt: null,
    completedSets: 0,
    totalReps: 0,
    totalVolumeKg: 0,
    totalDurationSec: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const activePatch: PartialWithFieldValue<ActiveSessionDoc> = {
    sessionId,
    activeExerciseId: sessionExerciseReference.id,
    activeSetNumber: 1,
    restEndsAt: null,
    updatedAt: serverTimestamp(),
  };

  batch.set(sessionExerciseReference, payload);
  batch.set(activeSessionDocRef(uid), activePatch, { merge: true });
  await batch.commit();

  return sessionExerciseReference.id;
}

export async function addSessionExercise(
  uid: string,
  sessionId: string,
  input: StartExerciseInput,
): Promise<string> {
  const payload: WithFieldValue<SessionExerciseDoc> = {
    exerciseId: input.exerciseId,
    exerciseNameSnapshot: input.exerciseNameSnapshot,
    status: "active",
    completedAt: null,
    order: input.order,
    trackingMode: input.trackingMode,
    targetSets: input.targetSets,
    targetReps: input.targetReps ?? null,
    targetWeightKg: input.targetWeightKg ?? null,
    targetDurationSec: input.targetDurationSec ?? null,
    restSec: input.restSec,
    startedAt: serverTimestamp(),
    endedAt: null,
    completedSets: 0,
    totalReps: 0,
    totalVolumeKg: 0,
    totalDurationSec: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const reference = await addDoc(sessionExercisesCollectionRef(uid, sessionId), payload);
  return reference.id;
}

export async function updateSessionExerciseConfig(
  uid: string,
  sessionId: string,
  sessionExerciseId: string,
  input: UpdateSessionExerciseConfigInput,
): Promise<void> {
  const patch: PartialWithFieldValue<SessionExerciseDoc> = {
    exerciseNameSnapshot: input.exerciseNameSnapshot,
    targetSets: Math.max(1, input.targetSets),
    targetReps: input.targetReps ?? null,
    targetWeightKg: input.targetWeightKg ?? null,
    targetDurationSec: input.targetDurationSec ?? null,
    restSec: Math.max(0, input.restSec),
    updatedAt: serverTimestamp(),
  };

  await setDoc(sessionExerciseDocRef(uid, sessionId, sessionExerciseId), patch, {
    merge: true,
  });
}

export async function endExercise(
  uid: string,
  sessionId: string,
  sessionExerciseId: string,
  status: SessionExerciseStatus = "completed",
): Promise<void> {
  const batch = writeBatch(db);
  const endedAt = Timestamp.now();

  const exercisePatch: PartialWithFieldValue<SessionExerciseDoc> = {
    status,
    endedAt,
    completedAt: status === "completed" ? endedAt : null,
    updatedAt: serverTimestamp(),
  };

  const activePatch: PartialWithFieldValue<ActiveSessionDoc> = {
    activeExerciseId: null,
    restEndsAt: null,
    updatedAt: serverTimestamp(),
  };

  batch.set(sessionExerciseDocRef(uid, sessionId, sessionExerciseId), exercisePatch, {
    merge: true,
  });
  batch.set(activeSessionDocRef(uid), activePatch, { merge: true });
  await batch.commit();
}

export async function logSet(
  uid: string,
  sessionId: string,
  sessionExerciseId: string,
  input: LogSetInput,
): Promise<string> {
  const setReference = doc(setsCollectionRef(uid, sessionId, sessionExerciseId));
  const reps = input.reps ?? null;
  const weightKg = input.weightKg ?? null;
  const durationSec = input.durationSec ?? null;
  const volumeKg = reps !== null && weightKg !== null ? reps * weightKg : 0;
  const startedAt = input.startedAt ?? Timestamp.now();
  const endedAt = input.endedAt ?? Timestamp.now();

  await runTransaction(db, async (transaction) => {
    const setPayload: WithFieldValue<SetEntryDoc> = {
      setNumber: input.setNumber,
      reps,
      weightKg,
      durationSec,
      startedAt,
      endedAt,
      restPlannedSec: input.restPlannedSec ?? null,
      restStartAt: null,
      restEndAt: null,
      isWarmup: input.isWarmup ?? false,
      rpe: input.rpe ?? null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    transaction.set(setReference, setPayload);

    const exercisePatch: PartialWithFieldValue<SessionExerciseDoc> = {
      completedSets: increment(1),
      totalReps: increment(reps ?? 0),
      totalVolumeKg: increment(volumeKg),
      totalDurationSec: increment(durationSec ?? 0),
      updatedAt: serverTimestamp(),
    };
    transaction.set(
      sessionExerciseDocRef(uid, sessionId, sessionExerciseId),
      exercisePatch,
      {
        merge: true,
      },
    );

    const activePatch: PartialWithFieldValue<ActiveSessionDoc> = {
      activeSetNumber: input.setNumber + 1,
      updatedAt: serverTimestamp(),
    };
    transaction.set(activeSessionDocRef(uid), activePatch, { merge: true });
  });

  return setReference.id;
}

export async function startRestAfterSet(
  uid: string,
  sessionId: string,
  sessionExerciseId: string,
  setId: string,
  restSec: number,
): Promise<Timestamp> {
  const restStartAt = Timestamp.now();
  const restEndAt = Timestamp.fromMillis(restStartAt.toMillis() + restSec * 1000);
  const batch = writeBatch(db);

  const setPatch: PartialWithFieldValue<SetEntryDoc> = {
    restPlannedSec: restSec,
    restStartAt,
    restEndAt,
    updatedAt: serverTimestamp(),
  };
  batch.set(setDocRef(uid, sessionId, sessionExerciseId, setId), setPatch, {
    merge: true,
  });

  const activePatch: PartialWithFieldValue<ActiveSessionDoc> = {
    restEndsAt: restEndAt,
    updatedAt: serverTimestamp(),
  };
  batch.set(activeSessionDocRef(uid), activePatch, { merge: true });

  await batch.commit();
  return restEndAt;
}

export async function clearRestTimer(uid: string): Promise<void> {
  const patch: PartialWithFieldValue<ActiveSessionDoc> = {
    restEndsAt: null,
    updatedAt: serverTimestamp(),
  };
  await setDoc(activeSessionDocRef(uid), patch, { merge: true });
}

export async function getActiveSession(
  uid: string,
): Promise<(ActiveSessionDoc & { id: string }) | null> {
  const snapshot = await getDoc(activeSessionDocRef(uid));
  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...(snapshot.data() as ActiveSessionDoc),
  };
}

export async function addBodyMetric(
  uid: string,
  input: AddBodyMetricInput,
): Promise<string> {
  const payload: WithFieldValue<BodyMetricDoc> = {
    measuredAt: input.measuredAt ?? Timestamp.now(),
    weightKg: input.weightKg,
    bodyFatPct: input.bodyFatPct ?? null,
    musclePct: input.musclePct ?? null,
    muscleMassKg: input.muscleMassKg ?? null,
    note: input.note ?? "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const reference = await addDoc(bodyMetricsCollectionRef(uid), payload);
  return reference.id;
}

export async function addProgressPhoto(
  uid: string,
  input: AddProgressPhotoInput,
): Promise<string> {
  const payload: WithFieldValue<ProgressPhotoDoc> = {
    takenAt: input.takenAt ?? Timestamp.now(),
    storagePath: input.storagePath,
    thumbnailPath: input.thumbnailPath ?? null,
    weightKgSnapshot: input.weightKgSnapshot ?? null,
    bodyFatPctSnapshot: input.bodyFatPctSnapshot ?? null,
    note: input.note ?? "",
    mediaType: input.mediaType ?? "image",
    kind: input.kind ?? "original",
    sourcePhotoIds:
      Array.isArray(input.sourcePhotoIds) && input.sourcePhotoIds.length > 0
        ? input.sourcePhotoIds
        : null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const reference = await addDoc(progressPhotosCollectionRef(uid), payload);
  return reference.id;
}

export async function deleteProgressPhoto(uid: string, photoId: string): Promise<void> {
  await deleteDoc(progressPhotoDocRef(uid, photoId));
}

export async function upsertExerciseStats(
  uid: string,
  exerciseId: string,
  input: UpsertExerciseStatsInput,
): Promise<void> {
  const reference = exerciseStatsDocRef(uid, exerciseId);
  const sessionsIncrement = Math.max(0, input.incrementSessionsBy ?? 0);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(reference);
    const current = snapshot.exists()
      ? (snapshot.data() as ExerciseStatsDoc)
      : null;

    const payload: WithFieldValue<ExerciseStatsDoc> = {
      bestWeightKg: Math.max(current?.bestWeightKg ?? 0, input.bestWeightKg ?? 0),
      bestVolumeKg: Math.max(current?.bestVolumeKg ?? 0, input.bestVolumeKg ?? 0),
      bestEstimated1RM: Math.max(
        current?.bestEstimated1RM ?? 0,
        input.bestEstimated1RM ?? 0,
      ),
      lastSessionAt: input.lastSessionAt ?? current?.lastSessionAt ?? null,
      totalSessions: (current?.totalSessions ?? 0) + sessionsIncrement,
      updatedAt: serverTimestamp(),
    };

    transaction.set(reference, payload);
  });
}

export async function addExerciseTimelinePoint(
  uid: string,
  exerciseId: string,
  input: AddExerciseTimelinePointInput,
): Promise<string> {
  const payload: WithFieldValue<ExerciseTimelinePointDoc> = {
    date: input.date ?? Timestamp.now(),
    bestWeightKg: input.bestWeightKg,
    volumeKg: input.volumeKg,
    totalReps: input.totalReps,
    estimated1RM: input.estimated1RM,
    sessionId: input.sessionId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const reference = await addDoc(exerciseTimelineCollectionRef(uid, exerciseId), payload);
  return reference.id;
}

export async function listExerciseTimeline(
  uid: string,
  exerciseId: string,
  maxPoints = 90,
): Promise<Array<ExerciseTimelinePointDoc & { id: string }>> {
  const timelineQuery = query(
    exerciseTimelineCollectionRef(uid, exerciseId),
    orderBy("date", "asc"),
    limit(maxPoints),
  );
  const snapshot = await getDocs(timelineQuery);

  return snapshot.docs.map((document) => ({
    id: document.id,
    ...(document.data() as ExerciseTimelinePointDoc),
  }));
}
