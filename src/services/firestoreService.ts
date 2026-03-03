import {
  addDoc,
  collection,
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
  SessionDoc,
  SessionExerciseDoc,
  SessionStatus,
  SetEntryDoc,
  TrackingMode,
  UserProfileDoc,
} from "../types/firestore.ts";

const userDocRef = (uid: string) => doc(db, "users", uid);
const exercisesCollectionRef = (uid: string) =>
  collection(db, "users", uid, "exercises");
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

  return snapshot.docs
    .map((document) => ({
      id: document.id,
      ...(document.data() as ExerciseDoc),
    }))
    .filter((exercise) => exercise.isActive);
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

  await runTransaction(db, async (transaction) => {
    const sessionSnapshot = await transaction.get(sessionReference);
    if (!sessionSnapshot.exists()) {
      throw new Error(`Session "${sessionId}" introuvable.`);
    }

    const session = sessionSnapshot.data() as SessionDoc;
    const endedAt = Timestamp.now();
    const durationSec =
      session.startedAt instanceof Timestamp
        ? Math.max(
            0,
            Math.round((endedAt.toMillis() - session.startedAt.toMillis()) / 1000),
          )
        : session.durationSec;

    const sessionPatch: PartialWithFieldValue<SessionDoc> = {
      status,
      endedAt,
      durationSec: durationSec ?? null,
      notes: notes ?? session.notes,
      updatedAt: serverTimestamp(),
    };
    transaction.set(sessionReference, sessionPatch, { merge: true });

    const activeSnapshot = await transaction.get(activeReference);
    if (activeSnapshot.exists()) {
      const activeSession = activeSnapshot.data() as ActiveSessionDoc;
      if (activeSession.sessionId === sessionId) {
        transaction.delete(activeReference);
      }
    }
  });
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

export async function endExercise(
  uid: string,
  sessionId: string,
  sessionExerciseId: string,
): Promise<void> {
  const batch = writeBatch(db);

  const exercisePatch: PartialWithFieldValue<SessionExerciseDoc> = {
    endedAt: Timestamp.now(),
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
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const reference = await addDoc(progressPhotosCollectionRef(uid), payload);
  return reference.id;
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
