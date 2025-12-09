import { expect, assertType } from "vitest";

export * from "./index";

export function expectAuthBlockingEvent(data: any, userId: string) {
  // expect(data.auth).toBeDefined(); // TOOD: Not provided?
  expect(data.authType).toBeDefined();
  assertType<string>(data.authType);
  expect(data.eventId).toBeDefined();
  assertType<string>(data.eventId);
  expect(data.eventType).toBeDefined();
  assertType<string>(data.eventType);
  expect(data.timestamp).toBeDefined();
  assertType<string>(data.timestamp);
  expect(Date.parse(data.timestamp)).toBeGreaterThan(0);

  expect(data.locale).toBeDefined();
  expect(data.ipAddress).toBeDefined();
  assertType<string>(data.ipAddress);
  expect(data.ipAddress.length).toBeGreaterThan(0);
  expect(data.userAgent).toBeDefined();
  assertType<string>(data.userAgent);
  expect(data.userAgent.length).toBeGreaterThan(0);

  expect(data.additionalUserInfo).toBeDefined();
  expect(data.additionalUserInfo.isNewUser).toBe(true);
  expect(data.additionalUserInfo.providerId).toBe("password");

  // TODO: data.credential is null

  expect(data.data).toBeDefined();
  expect(data.data.uid).toBe(userId);
}
