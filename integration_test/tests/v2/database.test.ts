import admin from "firebase-admin";
import { timeout } from "../utils";
import { initializeFirebase } from "../firebaseSetup";
import { Reference } from "@firebase/database-types";

describe("Firebase Database (v2)", () => {
  const projectId = process.env.PROJECT_ID;
  const testId = process.env.TEST_RUN_ID;

  if (!testId || !projectId) {
    throw new Error("Environment configured incorrectly.");
  }

  beforeAll(async () => {
    await initializeFirebase();
  });

  afterAll(async () => {
    await admin.firestore().collection("databaseCreatedTests").doc(testId).delete();
    await admin.firestore().collection("databaseDeletedTests").doc(testId).delete();
    await admin.firestore().collection("databaseUpdatesTests").doc(testId).delete();
    await admin.firestore().collection("databaseWrittenTests").doc(testId).delete();
  });

  async function setupRef(refPath: string) {
    const ref = admin.database().ref(refPath);
    await ref.set({ ".sv": "timestamp" });
    return ref;
  }

  async function teardownRef(ref: Reference) {
    if (ref) {
      try {
        await ref.remove();
      } catch (err) {
        console.log("Teardown error", err);
      }
    }
  }

  function getLoggedContext(collectionName: string, testId: string) {
    return admin
      .firestore()
      .collection(collectionName)
      .doc(testId)
      .get()
      .then((logSnapshot) => logSnapshot.data());
  }

  describe("created trigger", () => {
    let ref: Reference;
    let loggedContext: admin.firestore.DocumentData | undefined;

    beforeAll(async () => {
      ref = await setupRef(`databaseCreatedTests/${testId}/start`);
      await timeout(20000);
      loggedContext = await getLoggedContext("databaseCreatedTests", testId);
      if (!loggedContext) {
        throw new Error("loggedContext is undefined");
      }
    });

    afterAll(async () => {
      await teardownRef(ref);
    });

    it("should give refs access to admin data", async () => {
      await ref.parent?.child("adminOnly").update({ allowed: 1 });

      const adminDataSnapshot = await ref.parent?.child("adminOnly").once("value");
      const adminData = adminDataSnapshot?.val();

      expect(adminData).toEqual({ allowed: 1 });
    });

    it("should have a correct ref url", () => {
      expect(loggedContext?.url).toMatch(`databaseCreatedTests/${testId}/start`);
    });

    it("should have the right event type", () => {
      expect(loggedContext?.type).toEqual("google.firebase.database.ref.v1.created");
    });

    it("should have event id", () => {
      expect(loggedContext?.id).toBeDefined();
    });

    it("should have a time", () => {
      expect(loggedContext?.time).toBeDefined();
    });
  });

  describe("deleted trigger", () => {
    let ref: Reference;
    let loggedContext: admin.firestore.DocumentData | undefined;

    beforeAll(async () => {
      ref = await setupRef(`databaseDeletedTests/${testId}/start`);
      await teardownRef(ref);
      await timeout(20000);
      loggedContext = await getLoggedContext("databaseDeletedTests", testId);
      if (!loggedContext) {
        throw new Error("loggedContext is undefined");
      }
    });

    it("should have a correct ref url", () => {
      expect(loggedContext?.url).toMatch(`databaseDeletedTests/${testId}/start`);
    });

    it("should have the right event type", () => {
      expect(loggedContext?.type).toEqual("google.firebase.database.ref.v1.deleted");
    });

    it("should have event id", () => {
      expect(loggedContext?.id).toBeDefined();
    });

    it("should have a time", () => {
      expect(loggedContext?.time).toBeDefined();
    });
  });

  describe("updated trigger", () => {
    let ref: Reference;
    let loggedContext: admin.firestore.DocumentData | undefined;

    beforeAll(async () => {
      ref = await setupRef(`databaseUpdatedTests/${testId}/start`);
      await ref.update({ updated: true });
      await timeout(20000);
      loggedContext = await getLoggedContext("databaseUpdatedTests", testId);
      if (!loggedContext) {
        throw new Error("loggedContext is undefined");
      }
    });

    afterAll(async () => {
      await teardownRef(ref);
    });

    it("should give refs access to admin data", async () => {
      await ref.parent?.child("adminOnly").update({ allowed: 1 });

      const adminDataSnapshot = await ref.parent?.child("adminOnly").once("value");
      const adminData = adminDataSnapshot?.val();

      expect(adminData).toEqual({ allowed: 1 });
    });

    it("should have a correct ref url", () => {
      expect(loggedContext?.url).toMatch(`databaseUpdatedTests/${testId}/start`);
    });

    it("should have the right event type", () => {
      expect(loggedContext?.type).toEqual("google.firebase.database.ref.v1.updated");
    });

    it("should have event id", () => {
      expect(loggedContext?.id).toBeDefined();
    });

    it("should have a time", () => {
      expect(loggedContext?.time).toBeDefined();
    });

    it("should have updated data", async () => {
      const parsedData = JSON.parse(loggedContext?.data ?? {});
      expect(parsedData).toEqual({ updated: true });
    });
  });

  describe("written trigger", () => {
    let ref: Reference;
    let loggedContext: admin.firestore.DocumentData | undefined;

    beforeAll(async () => {
      ref = await setupRef(`databaseWrittenTests/${testId}/start`);
      await timeout(20000);
      loggedContext = await getLoggedContext("databaseWrittenTests", testId);
      if (!loggedContext) {
        throw new Error("loggedContext is undefined");
      }
    });

    afterAll(async () => {
      await teardownRef(ref);
    });

    it("should give refs access to admin data", async () => {
      await ref.parent?.child("adminOnly").update({ allowed: 1 });

      const adminDataSnapshot = await ref.parent?.child("adminOnly").once("value");
      const adminData = adminDataSnapshot?.val();

      expect(adminData).toEqual({ allowed: 1 });
    });

    it("should have a correct ref url", () => {
      expect(loggedContext?.url).toMatch(`databaseWrittenTests/${testId}/start`);
    });

    it("should have the right event type", () => {
      expect(loggedContext?.type).toEqual("google.firebase.database.ref.v1.written");
    });

    it("should have event id", () => {
      expect(loggedContext?.id).toBeDefined();
    });

    it("should have a time", () => {
      expect(loggedContext?.time).toBeDefined();
    });
  });
});
