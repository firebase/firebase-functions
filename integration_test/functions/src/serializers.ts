import { DocumentData, DocumentReference, DocumentSnapshot, GeoPoint, QuerySnapshot, Timestamp } from "firebase-admin/firestore";
import { CloudEvent } from "firebase-functions";
import { FirestoreEvent, QueryDocumentSnapshot } from "firebase-functions/firestore";

export function serializeCloudEvent(event: CloudEvent<unknown>): any {
  return {
    specversion: event.specversion,
    id: event.id,
    source: event.source,
    subject: event.subject,
    type: event.type,
    time: event.time,
  };
}

export function serializeFirestoreEvent(event: FirestoreEvent<unknown>, data: any): any {
  return {
    ...serializeCloudEvent(event),
    location: event.location,
    project: event.project,
    database: event.database,
    namespace: event.namespace,
    document: event.document,
    params: event.params,
    data,
  };
}

export function serializeQuerySnapshot(snapshot: QuerySnapshot): any {
  return {
    docs: snapshot.docs.map(serializeQueryDocumentSnapshot),
  };
}

export function serializeQueryDocumentSnapshot(snapshot: QueryDocumentSnapshot): any {
  return serializeDocumentSnapshot(snapshot);
}

export function serializeDocumentSnapshot(snapshot: DocumentSnapshot): any {
  return {
    exists: snapshot.exists,
    ref: serializeDocumentReference(snapshot.ref),
    id: snapshot.id,
    createTime: serializeTimestamp(snapshot.createTime),
    updateTime: serializeTimestamp(snapshot.updateTime),
    data: serializeDocumentData(snapshot.data() ?? {}),
  };
}

export function serializeGeoPoint(geoPoint: GeoPoint): any {
  return {
    _type: "geopoint",
    latitude: geoPoint.latitude,
    longitude: geoPoint.longitude,
  };
}

export function serializeTimestamp(timestamp?: Timestamp): any {
  if (!timestamp) {
    return null;
  }

  return {
    _type: "timestamp",
    seconds: timestamp.seconds,
    nanoseconds: timestamp.nanoseconds,
    iso: timestamp.toDate().toISOString(),
  };
}

export function serializeDocumentReference(reference: DocumentReference): any {
  return {
    _type: "reference",
    path: reference.path,
    id: reference.id,
  };
}

function serializeDocumentData(data: DocumentData): any {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value instanceof Timestamp) {
      result[key] = serializeTimestamp(value);
    } else if (value instanceof GeoPoint) {
      result[key] = serializeGeoPoint(value);
    } else if (value instanceof DocumentReference) {
      result[key] = serializeDocumentReference(value);
    } else if (Array.isArray(value)) {
      result[key] = value.map(serializeDocumentData);
    } else if (typeof value === "object" && value !== null) {
      result[key] = serializeDocumentData(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}