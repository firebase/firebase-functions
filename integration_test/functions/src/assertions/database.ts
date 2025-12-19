import { assertType, expect } from "vitest";
import { RUN_ID } from "../utils";

export * from "./index";

export function expectDatabaseEvent(data: any, eventName: string, refPath: string) {
  expect(data.location).toBeDefined();
  assertType<string>(data.location);
  expect(data.location.length).toBeGreaterThan(0);
  expect(data.firebaseDatabaseHost).toBeDefined();
  assertType<string>(data.firebaseDatabaseHost);
  expect(data.firebaseDatabaseHost.length).toBeGreaterThan(0);
  expect(data.instance).toBeDefined();
  assertType<string>(data.instance);
  expect(data.instance.length).toBeGreaterThan(0);
  expect(data.ref).toBeDefined();
  assertType<string>(data.ref);
  expect(data.ref).toBe(refPath);
  expect(data.params).toBeDefined();
  expect(data.params.runId).toBe(RUN_ID);
}

export function expectDataSnapshot(snapshot: any) {
  expect(snapshot.ref).toBeDefined();
  expect(snapshot.ref.__type).toBe("reference");
  expect(snapshot.ref.key).toBeDefined();
  expect(snapshot.key).toBeDefined();
  expect(snapshot.exists).toBe(true);
  expect(snapshot.hasChildren).toBeDefined();
  expect(typeof snapshot.hasChildren).toBe("boolean");
  expect(snapshot.hasChild).toBeDefined();
  expect(typeof snapshot.hasChild).toBe("boolean");
  expect(snapshot.numChildren).toBeDefined();
  expect(typeof snapshot.numChildren).toBe("number");
  expect(snapshot.json).toBeDefined();
  expect(typeof snapshot.json).toBe("object");
}
