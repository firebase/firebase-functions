import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { expectAuthBlockingEvent } from "../assertions/identity";
import { auth as authClient } from "../firebase.client";
import { auth } from "../firebase.server";
import { waitForEvent } from "../utils";

describe("identity.v2", () => {
  describe("beforeUserCreated", () => {
    let data: any;
    let userId: string;
    let email: string;

    beforeAll(async () => {
      data = await waitForEvent("beforeUserCreated", async () => {
        email = `test-${Date.now()}@example.com`;
        const password = "testPassword123!";
        userId = await createUserWithEmailAndPassword(authClient, email, password).then(
          (credential) => credential.user.uid
        );
      });
    }, 60_000);

    afterAll(async () => {
      // Clean up: delete the test user
      if (userId) {
        try {
          await auth.deleteUser(userId);
        } catch (error) {
          console.warn("Error deleting user:", error.message);
          // Ignore errors if user was already deleted
        }
      }

      await signOut(authClient);
    });

    it("should be an AuthBlockingEvent", () => {
      expectAuthBlockingEvent(data, userId);
    });

    it("should have the correct event type", () => {
      expect(data.eventType).toBe("providers/cloud.auth/eventTypes/user.beforeCreate:password");
    });
  });

  describe("beforeUserSignedIn", () => {
    let data: any;
    let userId: string;
    let email: string;
    let password: string;

    beforeAll(async () => {
      // First create a user (required before sign-in)
      email = `signin-${Date.now()}@example.com`;
      password = "testPassword123!";
      userId = await createUserWithEmailAndPassword(authClient, email, password).then(
        (credential) => credential.user.uid
      );

      data = await waitForEvent("beforeUserSignedIn", async () => {
        await signInWithEmailAndPassword(authClient, email, password);
      });
    }, 60_000);

    afterAll(async () => {
      // Clean up: delete the test user
      if (userId) {
        try {
          await auth.deleteUser(userId);
        } catch (error) {
          console.warn("Error deleting user:", error.message);
          // Ignore errors if user was already deleted
        }
      }

      await signOut(authClient);
    });

    it("should be an AuthBlockingEvent", () => {
      expectAuthBlockingEvent(data, userId);
    });

    it("should have the correct event type", () => {
      expect(data.eventType).toBe("providers/cloud.auth/eventTypes/user.beforeSignIn:password");
    });
  });
});
