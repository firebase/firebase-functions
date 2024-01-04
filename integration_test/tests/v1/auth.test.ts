import admin from "firebase-admin";
import { timeout } from "../utils";
import { initializeFirebase } from "../firebaseSetup";
import { UserRecord } from "firebase-admin/lib/auth/user-record";

describe("Firebase Auth", () => {
  describe("user onCreate trigger", () => {
    const projectId = process.env.PROJECT_ID;
    const testId = process.env.TEST_RUN_ID;
    let userRecord: UserRecord;
    let loggedContext: admin.firestore.DocumentData | undefined;

    beforeAll(async () => {
      if (!testId || !projectId) {
        throw new Error("Environment configured incorrectly.");
      }

      await initializeFirebase();

      userRecord = await admin.auth().createUser({
        email: `${testId}@fake.com`,
        password: "secret",
        displayName: `${testId}`,
      });

      await timeout(20000);

      const logSnapshot = await admin
        .firestore()
        .collection("authUserOnCreateTests")
        .doc(userRecord.uid)
        .get();

      loggedContext = logSnapshot.data();

      if (!loggedContext) {
        throw new Error("loggedContext is undefined");
      }
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

    it("should have properly defined metadata", () => {
      const parsedMetadata = JSON.parse(loggedContext?.metadata);
      // TODO: better handle date format mismatch and precision
      const expectedCreationTime = new Date(userRecord.metadata.creationTime)
        .toISOString()
        .replace(/\.\d{3}/, "");
      const expectedMetadata = {
        ...userRecord.metadata,
        creationTime: expectedCreationTime,
      };

      expect(expectedMetadata).toEqual(expect.objectContaining(parsedMetadata));
    });
  });

  describe("user onDelete trigger", () => {
    const projectId = process.env.PROJECT_ID;
    const testId = process.env.TEST_RUN_ID;
    let userRecord: UserRecord;
    let logSnapshot;
    let loggedContext: admin.firestore.DocumentData | undefined;

    beforeAll(async () => {
      if (!testId || !projectId) {
        throw new Error("Environment configured incorrectly.");
      }

      await initializeFirebase();

      userRecord = await admin.auth().createUser({
        email: `${testId}@fake.com`,
        password: "secret",
        displayName: `${testId}`,
      });
      await admin.auth().deleteUser(userRecord.uid);

      await timeout(20000);

      logSnapshot = await admin
        .firestore()
        .collection("authUserOnDeleteTests")
        .doc(userRecord.uid)
        .get();
      loggedContext = logSnapshot.data();

      if (!loggedContext) {
        throw new Error("loggedContext is undefined");
      }
    });

    it("should have a project as resource", () => {
      expect(loggedContext?.resource.name).toMatch(`projects/${projectId}`);
    });

    it("should not have a path", () => {
      expect(loggedContext?.path).toBeUndefined();
    });

    it("should have the correct eventType", async () => {
      expect(loggedContext?.eventType).toEqual("google.firebase.auth.user.delete");
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

  describe("user beforeCreate trigger", () => {
    const projectId = process.env.PROJECT_ID;
    const testId = process.env.TEST_RUN_ID;
    let userRecord;
    let loggedContext;

    beforeAll(async () => {
      if (!testId || !projectId) {
        throw new Error("Environment configured incorrectly.");
      }

      await initializeFirebase();
      userRecord = await admin.auth().createUser({
        email: `${testId}@fake.com`,
        password: "secret",
        displayName: `${testId}`,
      });

      await timeout(20000);

      const logSnapshot = await admin
        .firestore()
        .collection("userBeforeCreateTests")
        .doc(userRecord.uid)
        .get();

      loggedContext = logSnapshot.data();
    });

    afterAll(async () => {
      await admin.auth().deleteUser(userRecord.uid);
    });

    it("should have a project as resource", () => {
      expect(loggedContext?.resource.name).toMatch(`projects/${projectId}`);
    });

    it("should not have a path", () => {
      expect(loggedContext?.path).toBeUndefined();
    });

    it("should have the correct eventType", async () => {
      expect(loggedContext?.eventType).toEqual("google.firebase.auth.user.beforeCreate");
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
});
