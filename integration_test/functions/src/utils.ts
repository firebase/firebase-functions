import admin from "firebase-admin";
import { GeoPoint } from "firebase-admin/firestore";

const adminApp = admin.initializeApp({ projectId: "cf3-integration-tests-v2-qa" });
export const firestore = adminApp.firestore();

export const RUN_ID = String(process.env.RUN_ID);

export function serializeData(data: unknown): unknown {
  if (data === null || data === undefined) {
    return null;
  }

  if (typeof data === "function") {
    return serializeData(data());
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
    return data.map((item) => serializeData(item));
  }

  // Handle objects with toJSON method (like Firestore types)
  if (
    data &&
    typeof data === "object" &&
    "toJSON" in data &&
    typeof (data as any).toJSON === "function"
  ) {
    return serializeData((data as any).toJSON());
  }

  // Handle plain objects
  const entries = Object.entries(data);
  const result: Record<string, unknown> = {};
  for (const [key, value] of entries) {
    result[key] = serializeData(value);
  }
  return result;
}
