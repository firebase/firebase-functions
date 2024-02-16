import admin from "firebase-admin";
import { timeout } from "../utils";
import { initializeFirebase } from "../firebaseSetup";

describe("Cloud Firestore (v2)", () => {
  const projectId = process.env.PROJECT_ID;
  const testId = process.env.TEST_RUN_ID;

  if (!testId || !projectId) {
    throw new Error("Environment configured incorrectly.");
  }

  beforeAll(async () => {
    await initializeFirebase();
  });

  afterAll(async () => {
    await admin.firestore().collection("firestoreOnDocumentCreatedTests").doc(testId).delete();
    await admin.firestore().collection("firestoreOnDocumentDeletedTests").doc(testId).delete();
    await admin.firestore().collection("firestoreOnDocumentUpdatedTests").doc(testId).delete();
    await admin.firestore().collection("firestoreOnDocumentWrittenTests").doc(testId).delete();
  });

  describe("Document created trigger", () => {
    let loggedContext: admin.firestore.DocumentData | undefined;
    let dataSnapshot: admin.firestore.DocumentSnapshot<admin.firestore.DocumentData>;
    let docRef: admin.firestore.DocumentReference<admin.firestore.DocumentData>;

    beforeAll(async () => {
      docRef = admin.firestore().collection("tests").doc(testId);
      await docRef.set({ test: testId });
      dataSnapshot = await docRef.get();

      await timeout(20000);

      const logSnapshot = await admin
        .firestore()
        .collection("firestoreOnDocumentCreatedTests")
        .doc(testId)
        .get();
      loggedContext = logSnapshot.data();

      if (!loggedContext) {
        throw new Error("loggedContext is undefined");
      }
    });

    it("should not have event.app", () => {
      expect(loggedContext?.app).toBeUndefined();
    });

    it("should give refs access to admin data", async () => {
      const result = await docRef.set({ allowed: 1 }, { merge: true });
      expect(result).toBeTruthy();
    });

    it("should have well-formed resource", () => {
      expect(loggedContext?.source).toMatch(
        `//firestore.googleapis.com/projects/${projectId}/databases/(default)`
      );
    });

    it("should have the correct type", () => {
      expect(loggedContext?.type).toEqual("google.cloud.firestore.document.v1.created");
    });

    it("should have an id", () => {
      expect(loggedContext?.id).toBeDefined();
    });

    it("should have a time", () => {
      expect(loggedContext?.time).toBeDefined();
    });

    it("should have the correct data", () => {
      expect(dataSnapshot.data()).toEqual({ test: testId });
    });
  });

  describe("Document deleted trigger", () => {
    let loggedContext: admin.firestore.DocumentData | undefined;
    let dataSnapshot: admin.firestore.DocumentSnapshot<admin.firestore.DocumentData>;
    let docRef: admin.firestore.DocumentReference<admin.firestore.DocumentData>;

    beforeAll(async () => {
      docRef = admin.firestore().collection("tests").doc(testId);
      await docRef.set({ test: testId });
      dataSnapshot = await docRef.get();

      await docRef.delete();

      await timeout(20000);

      // Refresh snapshot
      dataSnapshot = await docRef.get();

      const logSnapshot = await admin
        .firestore()
        .collection("firestoreOnDocumentDeletedTests")
        .doc(testId)
        .get();
      loggedContext = logSnapshot.data();

      if (!loggedContext) {
        throw new Error("loggedContext is undefined");
      }
    });

    it("should not have event.app", () => {
      expect(loggedContext?.app).toBeUndefined();
    });

    it("should have well-formed source", () => {
      expect(loggedContext?.source).toMatch(
        `//firestore.googleapis.com/projects/${projectId}/databases/(default)`
      );
    });

    it("should have the correct type", () => {
      expect(loggedContext?.type).toEqual("google.cloud.firestore.document.v1.deleted");
    });

    it("should have an id", () => {
      expect(loggedContext?.id).toBeDefined();
    });

    it("should have a time", () => {
      expect(loggedContext?.time).toBeDefined();
    });

    it("should not have the data", () => {
      expect(dataSnapshot.data()).toBeUndefined();
    });
  });

  describe("Document updated trigger", () => {
    let loggedContext: admin.firestore.DocumentData | undefined;
    let dataSnapshot: admin.firestore.DocumentSnapshot<admin.firestore.DocumentData>;
    let docRef: admin.firestore.DocumentReference<admin.firestore.DocumentData>;

    beforeAll(async () => {
      docRef = admin.firestore().collection("tests").doc(testId);
      await docRef.set({});
      dataSnapshot = await docRef.get();

      await docRef.update({ test: testId });

      await timeout(20000);

      // Refresh snapshot
      dataSnapshot = await docRef.get();

      const logSnapshot = await admin
        .firestore()
        .collection("firestoreOnDocumentUpdatedTests")
        .doc(testId)
        .get();
      loggedContext = logSnapshot.data();

      if (!loggedContext) {
        throw new Error("loggedContext is undefined");
      }
    });

    it("should not have event.app", () => {
      expect(loggedContext?.app).toBeUndefined();
    });

    it("should have well-formed resource", () => {
      expect(loggedContext?.source).toMatch(
        `//firestore.googleapis.com/projects/${projectId}/databases/(default)`
      );
    });

    it("should have the correct type", () => {
      expect(loggedContext?.type).toEqual("google.cloud.firestore.document.v1.updated");
    });

    it("should have an id", () => {
      expect(loggedContext?.id).toBeDefined();
    });

    it("should have a time", () => {
      expect(loggedContext?.time).toBeDefined();
    });

    it("should have the correct data", () => {
      expect(dataSnapshot.data()).toStrictEqual({ test: testId });
    });
  });

  describe("Document written trigger", () => {
    let loggedContext: admin.firestore.DocumentData | undefined;
    let dataSnapshot: admin.firestore.DocumentSnapshot<admin.firestore.DocumentData>;
    let docRef: admin.firestore.DocumentReference<admin.firestore.DocumentData>;

    beforeAll(async () => {
      docRef = admin.firestore().collection("tests").doc(testId);
      await docRef.set({ test: testId });
      dataSnapshot = await docRef.get();

      await timeout(20000);

      const logSnapshot = await admin
        .firestore()
        .collection("firestoreOnDocumentWrittenTests")
        .doc(testId)
        .get();
      loggedContext = logSnapshot.data();

      if (!loggedContext) {
        throw new Error("loggedContext is undefined");
      }
    });

    it("should not have event.app", () => {
      expect(loggedContext?.app).toBeUndefined();
    });

    it("should give refs access to admin data", async () => {
      const result = await docRef.set({ allowed: 1 }, { merge: true });
      expect(result).toBeTruthy();
    });

    it("should have well-formed resource", () => {
      expect(loggedContext?.source).toMatch(
        `//firestore.googleapis.com/projects/${projectId}/databases/(default)`
      );
    });

    it("should have the correct type", () => {
      expect(loggedContext?.type).toEqual("google.cloud.firestore.document.v1.written");
    });

    it("should have an id", () => {
      expect(loggedContext?.id).toBeDefined();
    });

    it("should have a time", () => {
      expect(loggedContext?.time).toBeDefined();
    });

    it("should have the correct data", () => {
      expect(dataSnapshot.data()).toEqual({ test: testId });
    });
  });
});
