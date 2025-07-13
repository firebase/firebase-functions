import { beforeUserCreated, beforeUserSignedIn } from "firebase-functions/v2/identity";
import { expectEq, TestSuite } from "../testing";

export const identitytestsBeforeCreate = beforeUserCreated((event) => {
  const testId = event.data.uid || "unknown";

  new TestSuite("identity beforeUserCreated")
    .it("should have user data", () => {
      expectEq(typeof event.data.uid, "string");
      expectEq(typeof event.data.email, "string");
    })
    .it("should have event id", () => {
      expectEq(typeof event.eventId, "string");
    })
    .it("should have timestamp", () => {
      expectEq(typeof event.timestamp, "string");
    })
    .it("should have ip address", () => {
      expectEq(typeof event.ipAddress, "string");
    })
    .it("should have user agent", () => {
      expectEq(typeof event.userAgent, "string");
    })
    .run(testId, event);

  // Can modify user data
  return {
    displayName: event.data.displayName || "Test User",
    disabled: false,
  };
});

export const identitytestsBeforeSignIn = beforeUserSignedIn((event) => {
  const testId = event.data.uid || "unknown";

  new TestSuite("identity beforeUserSignedIn")
    .it("should have user data", () => {
      expectEq(typeof event.data.uid, "string");
    })
    .it("should have event id", () => {
      expectEq(typeof event.eventId, "string");
    })
    .it("should have timestamp", () => {
      expectEq(typeof event.timestamp, "string");
    })
    .it("should have ip address", () => {
      expectEq(typeof event.ipAddress, "string");
    })
    .it("should have user agent", () => {
      expectEq(typeof event.userAgent, "string");
    })
    .it("should have additional user info if available", () => {
      if (event.additionalUserInfo) {
        expectEq(typeof event.additionalUserInfo.providerId, "string");
      }
    })
    .run(testId, event);

  // Can block sign in by throwing
  if (event.data.email?.includes("blocked")) {
    throw new Error("Sign in blocked for test");
  }
});
