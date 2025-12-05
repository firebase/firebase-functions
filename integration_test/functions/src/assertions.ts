import { expect, assertType } from "vitest";
import { RUN_ID } from "./utils";

export function expectCloudEvent(data: any) {
  expect(data.specversion).toBe("1.0");
  expect(data.id).toBeDefined();
  assertType<string>(data.id);
  expect(data.id.length).toBeGreaterThan(0);
  expect(data.source).toBeDefined();
  assertType<string>(data.source);
  expect(data.source.length).toBeGreaterThan(0);
  expect(data.subject).toBeDefined();
  assertType<string>(data.subject);
  expect(data.subject.length).toBeGreaterThan(0);
  expect(data.type).toBeDefined();
  assertType<string>(data.type);
  expect(data.type.length).toBeGreaterThan(0);
  expect(data.time).toBeDefined();
  assertType<string>(data.time);
  expect(data.time.length).toBeGreaterThan(0);
  // iso string to unix - will be NaN if not a valid date
  expect(Date.parse(data.time)).toBeGreaterThan(0);
}

export function expectFirestoreEvent(data: any, documentId: string) {
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
  expect(data.document).toBe(`integration_test/${RUN_ID}/${documentId}`);
  expect(data.params).toBeDefined();
  expect(data.params.runId).toBe(RUN_ID);
  expect(data.params.documentId).toBe(documentId);
}
