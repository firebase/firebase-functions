import admin from "firebase-admin";
import { GeoPoint } from "firebase-admin/firestore";
import { logger } from "firebase-functions";

const adminApp = admin.initializeApp({
  projectId: "cf3-integration-tests-v2-qa",
  databaseURL: "https://cf3-integration-tests-v2-qa-default-rtdb.firebaseio.com",
  
});
export const firestore = adminApp.firestore();
firestore.settings({ ignoreUndefinedProperties: true });
export const database = adminApp.database();
export const auth = adminApp.auth();

export const RUN_ID = String(process.env.RUN_ID);

export async function sendEvent(event: string, data: any): Promise<void> {
  await firestore.collection(RUN_ID).doc(event).set(data);
}

export function waitForEvent<T = unknown>(
  event: string,
  trigger: () => Promise<void>,
  timeoutMs: number = 60_000
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let timer: NodeJS.Timeout | null = null;

    const unsubscribe = firestore
      .collection(RUN_ID)
      .doc(event)
      .onSnapshot((snapshot) => {
        if (snapshot.exists) {
          if (timer) clearTimeout(timer);
          unsubscribe();
          resolve(snapshot.data() as T);
        }
      });

    timer = setTimeout(() => {
      unsubscribe();
      reject(new Error(`Timeout waiting for event "${event}" after ${timeoutMs}ms`));
    }, timeoutMs);

    trigger().then().catch(reject);
  });
}

export function serializeData(data: any): any {
  if (data === null || data === undefined) {
    return null;
  }

  if (typeof data === "function") {
    logger.debug("serializeData function", data);
    const result = serializeData(data());
    logger.debug("serializeData function result", result);
    return result;
  }

  // Handle Date objects
  if (data instanceof Date) {
    return data.toISOString();
  }

  if (data instanceof GeoPoint) {
    return {
      _type: "geopoint",
      latitude: data.latitude,
      longitude: data.longitude,
    };
  }

  // Handle Firestore DocumentReference (check for path, id, and firestore properties)
  if (
    data &&
    typeof data === "object" &&
    "path" in data &&
    "id" in data &&
    "firestore" in data &&
    typeof (data as any).path === "string"
  ) {
    const ref = data as { path: string; id: string };
    // Only serialize if path is non-empty to avoid the error
    if (ref.path) {
      return {
        _type: "reference",
        path: ref.path,
        id: ref.id,
      };
    } else {
      // If path is empty, return a safe representation
      logger.warn("DocumentReference with empty path detected", { id: ref.id });
      return {
        _type: "reference",
        path: "",
        id: ref.id || "",
      };
    }
  }

  // Handle Firestore Timestamp (check for toDate method and seconds property)
  if (
    data &&
    typeof data === "object" &&
    "toDate" in data &&
    typeof (data as any).toDate === "function"
  ) {
    const timestamp = data as { toDate: () => Date; seconds?: number; nanoseconds?: number };
    return {
      _type: "timestamp",
      seconds: timestamp.seconds,
      nanoseconds: timestamp.nanoseconds,
      iso: timestamp.toDate().toISOString(),
    };
  }

  // Handle Firestore GeoPoint (check for latitude and longitude properties)
  if (data && typeof data === "object" && "latitude" in data && "longitude" in data) {
    const geoPoint = data as { latitude: number; longitude: number };
    return {
      _type: "geopoint",
      latitude: geoPoint.latitude,
      longitude: geoPoint.longitude,
    };
  }

  // Handle arrays (must check before plain objects since arrays are objects)
  if (Array.isArray(data)) {
    return data.map(serializeData);
  }

  if (typeof data === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = serializeData(value);
    }
    return result;
  }

  return data;
}
