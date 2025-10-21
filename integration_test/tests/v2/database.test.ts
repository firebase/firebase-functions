import * as admin from "firebase-admin";
import { retry } from "../utils";
import { initializeFirebase } from "../firebaseSetup";
import { Reference } from "@firebase/database-types";
import { logger } from "../../src/utils/logger";

describe("Firebase Database (v2)", () => {
  const projectId = process.env.PROJECT_ID;
  const testId = process.env.TEST_RUN_ID;

  if (!testId || !projectId) {
    throw new Error("Environment configured incorrectly.");
  }

  beforeAll(() => {
    initializeFirebase();
  });

  afterAll(async () => {
    console.log("🧹 Cleaning up test data...");
    const collectionsToClean = [
      "databaseCreatedTests",
      "databaseDeletedTests",
      "databaseUpdatedTests",
      "databaseWrittenTests",
    ];

    for (const collection of collectionsToClean) {
      try {
        await admin.firestore().collection(collection).doc(testId).delete();
        console.log(`🗑️ Deleted test document: ${collection}/${testId}`);
      } catch (error) {
        console.log(`ℹ️ No test document to delete: ${collection}/${testId}`);
      }
    }
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
        logger.error("Teardown error", err);
      }
    }
  }

  async function getLoggedContext(collectionName: string, testId: string) {
    return retry(() =>
      admin
        .firestore()
        .collection(collectionName)
        .doc(testId)
        .get()
        .then((logSnapshot) => logSnapshot.data())
    );
  }

  describe("created trigger", () => {
    let ref: Reference;
    let loggedContext: admin.firestore.DocumentData | undefined;

    beforeAll(async () => {
      ref = await setupRef(`databaseCreatedTests/${testId}/start`);
      loggedContext = await getLoggedContext("databaseCreatedTests", testId);
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
      loggedContext = await getLoggedContext("databaseDeletedTests", testId);
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
      loggedContext = await getLoggedContext("databaseUpdatedTests", testId);
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

    it("should have updated data", () => {
      const parsedData = JSON.parse(loggedContext?.data ?? "{}");
      expect(parsedData).toEqual({ updated: true });
    });
  });

  describe("written trigger", () => {
    let ref: Reference;
    let loggedContext: admin.firestore.DocumentData | undefined;

    beforeAll(async () => {
      ref = await setupRef(`databaseWrittenTests/${testId}/start`);
      loggedContext = await getLoggedContext("databaseWrittenTests", testId);
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
