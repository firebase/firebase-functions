import * as admin from "firebase-admin";
import { retry } from "../utils";
import { initializeApp } from "firebase/app";
import { initializeFirebase } from "../firebaseSetup";
import { getAuth, createUserWithEmailAndPassword, UserCredential } from "firebase/auth";
import { getFirebaseClientConfig } from "../firebaseClientConfig";

interface IdentityEventContext {
  eventId: string;
  eventType: string;
  timestamp: string;
  resource: {
    name: string;
  };
}

describe("Firebase Identity (v2)", () => {
  const userIds: string[] = [];
  const projectId = process.env.PROJECT_ID || "functions-integration-tests-v2";
  const testId = process.env.TEST_RUN_ID;
  // Use hardcoded Firebase client config (safe to expose publicly)
  const config = getFirebaseClientConfig(projectId);
  const app = initializeApp(config);

  if (!testId || !projectId) {
    throw new Error("Environment configured incorrectly.");
  }

  beforeAll(() => {
    initializeFirebase();
  });

  afterAll(async () => {
    for (const userId of userIds) {
      await admin.firestore().collection("userProfiles").doc(userId).delete();
      await admin.firestore().collection("authUserOnCreateTests").doc(userId).delete();
      await admin.firestore().collection("authUserOnDeleteTests").doc(userId).delete();
      await admin.firestore().collection("authBeforeCreateTests").doc(userId).delete();
      await admin.firestore().collection("authBeforeSignInTests").doc(userId).delete();
    }
  });
  describe("beforeUserCreated trigger", () => {
    let userRecord: UserCredential;
    let loggedContext: IdentityEventContext | undefined;

    beforeAll(async () => {
      userRecord = await createUserWithEmailAndPassword(
        getAuth(app),
        `${testId}@fake-create.com`,
        "secret"
      );

      userIds.push(userRecord.user.uid);

      loggedContext = await retry(() =>
        admin
          .firestore()
          .collection("identityBeforeUserCreatedTests")
          .doc(userRecord.user.uid)
          .get()
          .then((logSnapshot) => logSnapshot.data() as IdentityEventContext | undefined)
      );
    });

    afterAll(async () => {
      await admin.auth().deleteUser(userRecord.user.uid);
    });

    it("should have a project as resource", () => {
      expect(loggedContext?.resource.name).toMatch(`projects/${projectId}`);
    });

    it("should have the correct eventType", () => {
      expect(loggedContext?.eventType).toEqual(
        "providers/cloud.auth/eventTypes/user.beforeCreate:password"
      );
    });

    it("should have an eventId", () => {
      expect(loggedContext?.eventId).toBeDefined();
    });

    it("should have a timestamp", () => {
      expect(loggedContext?.timestamp).toBeDefined();
    });
  });

  describe("identityBeforeUserSignedInTests trigger", () => {
    let userRecord: UserCredential;
    let loggedContext: admin.firestore.DocumentData | undefined;

    beforeAll(async () => {
      userRecord = await createUserWithEmailAndPassword(
        getAuth(app),
        `${testId}@fake-before-signin.com`,
        "secret"
      );

      userIds.push(userRecord.user.uid);

      loggedContext = await retry(() =>
        admin
          .firestore()
          .collection("identityBeforeUserSignedInTests")
          .doc(userRecord.user.uid)
          .get()
          .then((logSnapshot) => logSnapshot.data())
      );
    });

    afterAll(async () => {
      await admin.auth().deleteUser(userRecord.user.uid);
    });

    it("should have a project as resource", () => {
      expect(loggedContext?.resource.name).toMatch(`projects/${projectId}`);
    });

    it("should have the correct eventType", () => {
      expect(loggedContext?.eventType).toEqual(
        "providers/cloud.auth/eventTypes/user.beforeSignIn:password"
      );
    });

    it("should have an eventId", () => {
      expect(loggedContext?.eventId).toBeDefined();
    });

    it("should have a timestamp", () => {
      expect(loggedContext?.timestamp).toBeDefined();
    });
  });
});
