import { expect, assertType } from "vitest";

export function expectCloudEvent(data: any) {
  expect(data.specversion).toBe("1.0");
  expect(data.id).toBeDefined();
  assertType<string>(data.id);
  expect(data.id.length).toBeGreaterThan(0);
  expect(data.source).toBeDefined();
  assertType<string>(data.source);
  expect(data.source.length).toBeGreaterThan(0);

  // Subject is optional (e.g. pubsub)
  if ("subject" in data) {
    expect(data.subject).toBeDefined();
    assertType<string>(data.subject);
    expect(data.subject.length).toBeGreaterThan(0);
  }

  expect(data.type).toBeDefined();
  assertType<string>(data.type);
  expect(data.type.length).toBeGreaterThan(0);
  expect(data.time).toBeDefined();
  assertType<string>(data.time);
  expect(data.time.length).toBeGreaterThan(0);
  // iso string to unix - will be NaN if not a valid date
  expect(Date.parse(data.time)).toBeGreaterThan(0);
}