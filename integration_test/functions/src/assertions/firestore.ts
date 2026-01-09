import { expect, assertType } from "vitest";
import { RUN_ID } from "../utils";

export * from "./index";

export function expectFirestoreAuthEvent(data: any, collection: string, document: string) {
  expect(data.authId).toBeDefined();
  assertType<string>(data.authId);
  expect(data.authId.length).toBeGreaterThan(0);
  expect(data.authType).toBeDefined();
  assertType<string>(data.authType);
  expect(data.authType.length).toBeGreaterThan(0);
  expectFirestoreEvent(data, collection, document);
}

export function expectFirestoreEvent(data: any, collection: string, document: string) {
  expect(data.location).toBeDefined();
  assertType<string>(data.location);
  expect(data.location.length).toBeGreaterThan(0);
  expect(data.project).toBeDefined();
  assertType<string>(data.project);
  expect(data.project.length).toBeGreaterThan(0);
  expect(data.database).toBeDefined();
  assertType<string>(data.database);
  expect(data.database.length).toBeGreaterThan(0);
  expect(data.namespace).toBeDefined();
  assertType<string>(data.namespace);
  expect(data.namespace.length).toBeGreaterThan(0);
  expect(data.document).toBeDefined();
  assertType<string>(data.document);
  expect(data.document.length).toBeGreaterThan(0);
  expect(data.document).toBe(`integration_test/${RUN_ID}/${collection}/${document}`);
  expect(data.params).toBeDefined();
  expect(data.params.runId).toBe(RUN_ID);
  expect(data.params.documentId).toBe(document);
}

export function expectQueryDocumentSnapshot(snapshot: any, collection: string, document: string) {
  expect(snapshot.exists).toBe(true);
  expect(snapshot.id).toBe(document);
  expectDocumentReference(snapshot.ref, collection, document);
  expectTimestamp(snapshot.createTime);
  expectTimestamp(snapshot.updateTime);
}

export function expectDocumentReference(reference: any, collection: string, document: string) {
  expect(reference._type).toBe("reference");
  expect(reference.id).toBe(document);
  expect(reference.path).toBe(`integration_test/${RUN_ID}/${collection}/${document}`);
}

export function expectTimestamp(timestamp: any) {
  expect(timestamp._type).toBe("timestamp");
  expect(Date.parse(timestamp.iso)).toBeGreaterThan(0);
  expect(Number(timestamp.seconds)).toBeGreaterThan(0);
  expect(Number(timestamp.nanoseconds)).toBeGreaterThan(0);
}

export function expectGeoPoint(geoPoint: any) {
  expect(geoPoint._type).toBe("geopoint");
  expect(Number(geoPoint.latitude)).toBeGreaterThan(0);
  expect(Number(geoPoint.longitude)).toBeGreaterThan(0);
}
