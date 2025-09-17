import * as admin from "firebase-admin";
import { initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  getAuth,
  UserCredential,
} from "firebase/auth";
import { initializeFirebase } from "../firebaseSetup";
import { retry } from "../utils";

describe("Firebase Auth (v1)", () => {
  const userIds: string[] = [];
  const projectId = process.env.PROJECT_ID || "functions-integration-tests";
  const testId = process.env.TEST_RUN_ID;
  const deployedFunctions = process.env.DEPLOYED_FUNCTIONS?.split(",") || [];

  if (!testId) {
    throw new Error("Environment configured incorrectly.");
  }

  // Try to load config from test-config.json or environment variables
  let config;
  try {
    // Try to load from test-config.json first
    config = require("../../test-config.json");
    config.projectId = config.projectId || projectId;
  } catch {
    // Fall back to environment variables
    const apiKey = process.env.FIREBASE_API_KEY;
    if (!apiKey) {
      console.warn(
        "Skipping Auth tests: No test-config.json found and FIREBASE_API_KEY not configured"
      );
      test.skip("Auth tests require Firebase client SDK configuration", () => {});
      return;
    }
    config = {
      apiKey,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
      databaseURL: process.env.DATABASE_URL,
      projectId,
      storageBucket: process.env.STORAGE_BUCKET,
      appId: process.env.FIREBASE_APP_ID || "test-app-id",
      measurementId: process.env.FIREBASE_MEASUREMENT_ID,
    };
  }

  const app = initializeApp(config);

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

  describe("user onCreate trigger", () => {
    let userRecord: admin.auth.UserRecord;
    let loggedContext: admin.firestore.DocumentData | undefined;

    beforeAll(async () => {
      userRecord = await admin.auth().createUser({
        email: `${testId}@fake-create.com`,
        password: "secret",
        displayName: `${testId}`,
      });

      loggedContext = await retry(() =>
        admin
          .firestore()
          .collection("authUserOnCreateTests")
          .doc(userRecord.uid)
          .get()
          .then((logSnapshot) => logSnapshot.data())
      );

      userIds.push(userRecord.uid);
    });

    afterAll(async () => {
      await admin.auth().deleteUser(userRecord.uid);
    });

    it("should perform expected actions", async () => {
      const userProfile = await admin
        .firestore()
        .collection("userProfiles")
        .doc(userRecord.uid)
        .get();
      expect(userProfile.exists).toBeTruthy();
    });

    it("should have a project as resource", () => {
      expect(loggedContext?.resource.name).toMatch(`projects/${projectId}`);
    });

    it("should not have a path", () => {
      expect(loggedContext?.path).toBeUndefined();
    });

    it("should have the correct eventType", () => {
      expect(loggedContext?.eventType).toEqual("google.firebase.auth.user.create");
    });

    it("should have an eventId", () => {
      expect(loggedContext?.eventId).toBeDefined();
    });

    it("should have a timestamp", () => {
      expect(loggedContext?.timestamp).toBeDefined();
    });

    it("should not have auth", () => {
      expect(loggedContext?.auth).toBeUndefined();
    });

    it("should not have an action", () => {
      expect(loggedContext?.action).toBeUndefined();
    });
  });

  describe("user onDelete trigger", () => {
    let userRecord: admin.auth.UserRecord;
    let loggedContext: admin.firestore.DocumentData | undefined;

    beforeAll(async () => {
      userRecord = await admin.auth().createUser({
        email: `${testId}@fake-delete.com`,
        password: "secret",
        displayName: testId,
      });
      userIds.push(userRecord.uid);

      await admin.auth().deleteUser(userRecord.uid);

      loggedContext = await retry(() =>
        admin
          .firestore()
          .collection("authUserOnDeleteTests")
          .doc(userRecord.uid)
          .get()
          .then((logSnapshot) => logSnapshot.data())
      );
    });

    it("should have the correct eventType", () => {
      expect(loggedContext?.eventType).toEqual("google.firebase.auth.user.delete");
    });

    it("should have an eventId", () => {
      expect(loggedContext?.eventId).toBeDefined();
    });

    it("should have a timestamp", () => {
      expect(loggedContext?.timestamp).toBeDefined();
    });
  });

  describe("blocking beforeCreate function", () => {
    let userCredential: UserCredential;
    let loggedContext: admin.firestore.DocumentData | undefined;

    beforeAll(async () => {
      if (!deployedFunctions.includes("beforeCreate")) {
        console.log("⏭️  Skipping beforeCreate tests - function not deployed in this suite");
        return;
      }

      const auth = getAuth(app);
      userCredential = await createUserWithEmailAndPassword(
        auth,
        `${testId}@beforecreate.com`,
        "secret123"
      );
      userIds.push(userCredential.user.uid);

      loggedContext = await retry(() =>
        admin
          .firestore()
          .collection("authBeforeCreateTests")
          .doc(userCredential.user.uid)
          .get()
          .then((logSnapshot) => logSnapshot.data())
      );
    });

    afterAll(async () => {
      await admin.auth().deleteUser(userCredential.user.uid);
    });

    it("should have the correct eventType", () => {
      if (!deployedFunctions.includes("beforeCreate")) {
        pending("beforeCreate function not deployed in this suite");
        return;
      }
      expect(loggedContext?.eventType).toEqual("providers/cloud.auth/eventTypes/user.beforeCreate");
    });

    it("should have an eventId", () => {
      if (!deployedFunctions.includes("beforeCreate")) {
        pending("beforeCreate function not deployed in this suite");
        return;
      }
      expect(loggedContext?.eventId).toBeDefined();
    });

    it("should have a timestamp", () => {
      if (!deployedFunctions.includes("beforeCreate")) {
        pending("beforeCreate function not deployed in this suite");
        return;
      }
      expect(loggedContext?.timestamp).toBeDefined();
    });
  });

  describe("blocking beforeSignIn function", () => {
    let userRecord: admin.auth.UserRecord;
    let userCredential: UserCredential;
    let loggedContext: admin.firestore.DocumentData | undefined;

    beforeAll(async () => {
      if (!deployedFunctions.includes("beforeSignIn")) {
        console.log("⏭️  Skipping beforeSignIn tests - function not deployed in this suite");
        return;
      }

      userRecord = await admin.auth().createUser({
        email: `${testId}@beforesignin.com`,
        password: "secret456",
        displayName: testId,
      });
      userIds.push(userRecord.uid);

      const auth = getAuth(app);
      // Fix: Use signInWithEmailAndPassword instead of createUserWithEmailAndPassword
      userCredential = await signInWithEmailAndPassword(
        auth,
        `${testId}@beforesignin.com`,
        "secret456"
      );

      loggedContext = await retry(() =>
        admin
          .firestore()
          .collection("authBeforeSignInTests")
          .doc(userRecord.uid)
          .get()
          .then((logSnapshot) => logSnapshot.data())
      );
    });

    afterAll(async () => {
      await admin.auth().deleteUser(userRecord.uid);
    });

    it("should have the correct eventType", () => {
      if (!deployedFunctions.includes("beforeSignIn")) {
        pending("beforeSignIn function not deployed in this suite");
        return;
      }
      expect(loggedContext?.eventType).toEqual("providers/cloud.auth/eventTypes/user.beforeSignIn");
    });

    it("should have an eventId", () => {
      if (!deployedFunctions.includes("beforeSignIn")) {
        pending("beforeSignIn function not deployed in this suite");
        return;
      }
      expect(loggedContext?.eventId).toBeDefined();
    });

    it("should have a timestamp", () => {
      if (!deployedFunctions.includes("beforeSignIn")) {
        pending("beforeSignIn function not deployed in this suite");
        return;
      }
      expect(loggedContext?.timestamp).toBeDefined();
    });
  });
});
