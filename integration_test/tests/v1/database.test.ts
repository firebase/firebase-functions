import admin from "firebase-admin";
import { timeout } from "../utils";
import { initializeFirebase } from "../firebaseSetup";
import { Reference } from "@firebase/database-types";

describe("Firebase Database (v1)", () => {
  const projectId = process.env.PROJECT_ID;
  const testId = process.env.TEST_RUN_ID;

  if (!testId || !projectId) {
    throw new Error("Environment configured incorrectly.");
  }

  beforeAll(async () => {
    await initializeFirebase();
  });

  afterAll(async () => {
    await admin.firestore().collection("databaseRefOnCreateTests").doc(testId).delete();
    await admin.firestore().collection("databaseRefOnDeleteTests").doc(testId).delete();
    await admin.firestore().collection("databaseRefOnUpdateTests").doc(testId).delete();
    await admin.firestore().collection("databaseRefOnWriteTests").doc(testId).delete();
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

  describe("ref onCreate trigger", () => {
    let ref: Reference;
    let loggedContext: admin.firestore.DocumentData | undefined;

    beforeAll(async () => {
      ref = await setupRef(`dbTests/${testId}/start`);
      await timeout(20000);
      loggedContext = await getLoggedContext("databaseRefOnCreateTests", testId);
      if (!loggedContext) {
        throw new Error("loggedContext is undefined");
      }
    });

    afterAll(async () => {
      await teardownRef(ref);
    });

    it("should not have event.app", () => {
      expect(loggedContext?.app).toBeUndefined();
    });

    it("should give refs access to admin data", async () => {
      await ref.parent?.child("adminOnly").update({ allowed: 1 });

      const adminDataSnapshot = await ref.parent?.child("adminOnly").once("value");
      const adminData = adminDataSnapshot?.val();

      expect(adminData).toEqual({ allowed: 1 });
    });

    it("should have a correct ref url", () => {
      expect(loggedContext?.url).toMatch(
        new RegExp(`^https://${projectId}(-default-rtdb)*.firebaseio.com/dbTests/${testId}/start$`)
      );
    });

    it("should have refs resources", () => {
      expect(loggedContext?.resource.name).toMatch(
        new RegExp(
          `^projects/_/instances/${projectId}(-default-rtdb)*/refs/dbTests/${testId}/start`
        )
      );
    });

    it("should not include path", () => {
      expect(loggedContext?.path).toBeUndefined();
    });

    it("should have the right eventType", () => {
      expect(loggedContext?.eventType).toEqual("google.firebase.database.ref.create");
    });

    it("should have eventId", () => {
      expect(loggedContext?.eventId).toBeDefined();
    });

    it("should have timestamp", () => {
      expect(loggedContext?.timestamp).toBeDefined();
    });

    it("should not have action", () => {
      expect(loggedContext?.action).toBeUndefined();
    });

    it("should have admin authType", () => {
      expect(loggedContext?.authType).toEqual("ADMIN");
    });
  });

  describe("ref onDelete trigger", () => {
    let ref: Reference;
    let loggedContext: admin.firestore.DocumentData | undefined;

    beforeAll(async () => {
      ref = await setupRef(`dbTests/${testId}/start`);
      await ref.remove();
      await timeout(20000);
      loggedContext = await getLoggedContext("databaseRefOnDeleteTests", testId);
      if (!loggedContext) {
        throw new Error("loggedContext is undefined");
      }
    });

    it("should not have event.app", () => {
      expect(loggedContext?.app).toBeUndefined();
    });

    it("should have a correct ref url", () => {
      expect(loggedContext?.url).toMatch(
        new RegExp(`^https://${projectId}(-default-rtdb)*.firebaseio.com/dbTests/${testId}/start$`)
      );
    });

    it("should have refs resources", () => {
      expect(loggedContext?.resource.name).toMatch(
        new RegExp(
          `^projects/_/instances/${projectId}(-default-rtdb)*/refs/dbTests/${testId}/start$`
        )
      );
    });

    it("should not include path", () => {
      expect(loggedContext?.path).toBeUndefined();
    });

    it("should have the right eventType", () => {
      expect(loggedContext?.eventType).toEqual("google.firebase.database.ref.delete");
    });

    it("should have eventId", () => {
      expect(loggedContext?.eventId).toBeDefined();
    });

    it("should have timestamp", () => {
      expect(loggedContext?.timestamp).toBeDefined();
    });

    it("should not have action", () => {
      expect(loggedContext?.action).toBeUndefined();
    });

    it("should have admin authType", () => {
      expect(loggedContext?.authType).toEqual("ADMIN");
    });
  });

  describe("ref onUpdate trigger", () => {
    let ref: Reference;
    let loggedContext: admin.firestore.DocumentData | undefined;

    beforeAll(async () => {
      ref = await setupRef(`dbTests/${testId}/start`);
      await ref.update({ updated: true });
      await timeout(20000);
      loggedContext = await getLoggedContext("databaseRefOnUpdateTests", testId);
      if (!loggedContext) {
        throw new Error("loggedContext is undefined");
      }
    });

    afterAll(async () => {
      await teardownRef(ref);
    });

    it("should not have event.app", () => {
      expect(loggedContext?.app).toBeUndefined();
    });

    it("should give refs access to admin data", async () => {
      await ref.parent?.child("adminOnly").update({ allowed: 1 });

      const adminDataSnapshot = await ref.parent?.child("adminOnly").once("value");
      const adminData = adminDataSnapshot?.val();

      expect(adminData).toEqual({ allowed: 1 });
    });

    it("should have a correct ref url", () => {
      expect(loggedContext?.url).toMatch(
        new RegExp(`^https://${projectId}(-default-rtdb)*.firebaseio.com/dbTests/${testId}/start$`)
      );
    });

    it("should have refs resources", () => {
      expect(loggedContext?.resource.name).toMatch(
        new RegExp(
          `^projects/_/instances/${projectId}(-default-rtdb)*/refs/dbTests/${testId}/start$`
        )
      );
    });

    it("should not include path", () => {
      expect(loggedContext?.path).toBeUndefined();
    });

    it("should have the right eventType", () => {
      expect(loggedContext?.eventType).toEqual("google.firebase.database.ref.update");
    });

    it("should have eventId", () => {
      expect(loggedContext?.eventId).toBeDefined();
    });

    it("should have timestamp", () => {
      expect(loggedContext?.timestamp).toBeDefined();
    });

    it("should not have action", () => {
      expect(loggedContext?.action).toBeUndefined();
    });

    it("should have admin authType", () => {
      expect(loggedContext?.authType).toEqual("ADMIN");
    });

    it("should log onUpdate event with updated data", async () => {
      const parsedData = JSON.parse(loggedContext?.data ?? {});
      expect(parsedData).toEqual({ updated: true });
    });
  });

  describe("ref onWrite trigger", () => {
    let ref: Reference;
    let loggedContext: admin.firestore.DocumentData | undefined;

    beforeAll(async () => {
      ref = await setupRef(`dbTests/${testId}/start`);

      await timeout(20000);

      loggedContext = await getLoggedContext("databaseRefOnWriteTests", testId);

      if (!loggedContext) {
        throw new Error("loggedContext is undefined");
      }
    });

    afterAll(async () => {
      await teardownRef(ref);
    });

    it("should not have event.app", () => {
      expect(loggedContext?.app).toBeUndefined();
    });

    it("should give refs access to admin data", async () => {
      await ref.parent?.child("adminOnly").update({ allowed: 1 });

      const adminDataSnapshot = await ref.parent?.child("adminOnly").once("value");
      const adminData = adminDataSnapshot?.val();

      expect(adminData).toEqual({ allowed: 1 });
    });

    it("should have a correct ref url", () => {
      expect(loggedContext?.url).toMatch(
        new RegExp(`^https://${projectId}(-default-rtdb)*.firebaseio.com/dbTests/${testId}/start$`)
      );
    });

    it("should have refs resources", () => {
      expect(loggedContext?.resource.name).toMatch(
        new RegExp(
          `^projects/_/instances/${projectId}(-default-rtdb)*/refs/dbTests/${testId}/start$`
        )
      );
    });

    it("should not include path", () => {
      expect(loggedContext?.path).toBeUndefined();
    });

    it("should have the right eventType", () => {
      expect(loggedContext?.eventType).toEqual("google.firebase.database.ref.write");
    });

    it("should have eventId", () => {
      expect(loggedContext?.eventId).toBeDefined();
    });

    it("should have timestamp", () => {
      expect(loggedContext?.timestamp).toBeDefined();
    });

    it("should not have action", () => {
      expect(loggedContext?.action).toBeUndefined();
    });

    it("should have admin authType", () => {
      expect(loggedContext?.authType).toEqual("ADMIN");
    });
  });
});
