import admin from "firebase-admin";
import { timeout } from "../utils";
import { initializeApp } from "firebase/app";
import { initializeFirebase } from "../firebaseSetup";
import { getAuth, createUserWithEmailAndPassword, UserCredential } from "firebase/auth";

describe("Firebase Identity (v2)", () => {
  const userIds: string[] = [];
  const projectId = process.env.PROJECT_ID;
  const testId = process.env.TEST_RUN_ID;
  const config = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.DATABASE_URL,
    projectId,
    storageBucket: process.env.STORAGE_BUCKET,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID,
  };
  const app = initializeApp(config);

  if (!testId || !projectId) {
    throw new Error("Environment configured incorrectly.");
  }

  beforeAll(async () => {
    await initializeFirebase();
  });

  afterAll(async () => {
    for (const userId in userIds) {
      await admin.firestore().collection("userProfiles").doc(userId).delete();
      await admin.firestore().collection("authUserOnCreateTests").doc(userId).delete();
      await admin.firestore().collection("authUserOnDeleteTests").doc(userId).delete();
      await admin.firestore().collection("authBeforeCreateTests").doc(userId).delete();
      await admin.firestore().collection("authBeforeSignInTests").doc(userId).delete();
    }
  });
  describe("beforeUserCreated trigger", () => {
    let userRecord: UserCredential;
    let loggedContext: admin.firestore.DocumentData | undefined;

    beforeAll(async () => {
      userRecord = await createUserWithEmailAndPassword(
        getAuth(app),
        `${testId}@fake-create.com`,
        "secret"
      );

      userIds.push(userRecord.user.uid);

      await timeout(20000);

      const logSnapshot = await admin
        .firestore()
        .collection("identityBeforeUserCreatedTests")
        .doc(userRecord.user.uid)
        .get();

      loggedContext = logSnapshot.data();

      if (!loggedContext) {
        throw new Error("loggedContext is undefined");
      }
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

      await timeout(20000);

      const logSnapshot = await admin
        .firestore()
        .collection("identityBeforeUserSignedInTests")
        .doc(userRecord.user.uid)
        .get();

      loggedContext = logSnapshot.data();

      if (!loggedContext) {
        throw new Error("loggedContext is undefined");
      }
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
