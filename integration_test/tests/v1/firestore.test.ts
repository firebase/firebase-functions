import * as admin from "firebase-admin";
import { initializeFirebase } from "../firebaseSetup";
import { retry } from "../utils";

describe("Cloud Firestore (v1)", () => {
  const projectId = process.env.PROJECT_ID;
  const testId = process.env.TEST_RUN_ID;

  if (!testId || !projectId) {
    throw new Error("Environment configured incorrectly.");
  }

  beforeAll(() => {
    initializeFirebase();
  });

  afterAll(async () => {
    await admin.firestore().collection("firestoreDocumentOnCreateTests").doc(testId).delete();
    await admin.firestore().collection("firestoreDocumentOnDeleteTests").doc(testId).delete();
    await admin.firestore().collection("firestoreDocumentOnUpdateTests").doc(testId).delete();
    await admin.firestore().collection("firestoreDocumentOnWriteTests").doc(testId).delete();
  });

  describe("Document onCreate trigger", () => {
    let loggedContext: admin.firestore.DocumentData | undefined;
    let dataSnapshot: admin.firestore.DocumentSnapshot<admin.firestore.DocumentData>;
    let docRef: admin.firestore.DocumentReference<admin.firestore.DocumentData>;

    beforeAll(async () => {
      docRef = admin.firestore().collection("tests").doc(testId);
      await docRef.set({ test: testId });
      dataSnapshot = await docRef.get();

      loggedContext = await retry(() =>
        admin
          .firestore()
          .collection("firestoreDocumentOnCreateTests")
          .doc(testId)
          .get()
          .then((logSnapshot) => logSnapshot.data())
      );
    });

    afterAll(async () => {
      await admin.firestore().collection("tests").doc(testId).delete();
    });

    it("should not have event.app", () => {
      expect(loggedContext?.app).toBeUndefined();
    });

    it("should give refs access to admin data", async () => {
      const result = await docRef.set({ allowed: 1 }, { merge: true });
      expect(result).toBeTruthy();
    });

    it("should have well-formed resource", () => {
      expect(loggedContext?.resource.name).toMatch(
        `projects/${projectId}/databases/(default)/documents/tests/${testId}`
      );
    });

    it("should have the correct eventType", () => {
      expect(loggedContext?.eventType).toEqual("google.firestore.document.create");
    });

    it("should have an eventId", () => {
      expect(loggedContext?.eventId).toBeDefined();
    });

    it("should have a timestamp", () => {
      expect(loggedContext?.timestamp).toBeDefined();
    });

    it("should have the correct data", () => {
      expect(dataSnapshot.data()).toEqual({ test: testId });
    });
  });

  describe("Document onDelete trigger", () => {
    let loggedContext: admin.firestore.DocumentData | undefined;
    let dataSnapshot: admin.firestore.DocumentSnapshot<admin.firestore.DocumentData>;
    let docRef: admin.firestore.DocumentReference<admin.firestore.DocumentData>;

    beforeAll(async () => {
      docRef = admin.firestore().collection("tests").doc(testId);
      await docRef.set({ test: testId });
      dataSnapshot = await docRef.get();

      await docRef.delete();

      // Refresh snapshot
      dataSnapshot = await docRef.get();

      loggedContext = await retry(() =>
        admin
          .firestore()
          .collection("firestoreDocumentOnDeleteTests")
          .doc(testId)
          .get()
          .then((logSnapshot) => logSnapshot.data())
      );
    });

    afterAll(async () => {
      await admin.firestore().collection("tests").doc(testId).delete();
    });

    it("should not have event.app", () => {
      expect(loggedContext?.app).toBeUndefined();
    });

    it("should have well-formed resource", () => {
      expect(loggedContext?.resource.name).toMatch(
        `projects/${projectId}/databases/(default)/documents/tests/${testId}`
      );
    });

    it("should have the correct eventType", () => {
      expect(loggedContext?.eventType).toEqual("google.firestore.document.delete");
    });

    it("should have an eventId", () => {
      expect(loggedContext?.eventId).toBeDefined();
    });

    it("should have a timestamp", () => {
      expect(loggedContext?.timestamp).toBeDefined();
    });

    it("should not have the data", () => {
      expect(dataSnapshot.data()).toBeUndefined();
    });
  });

  describe("Document onUpdate trigger", () => {
    let loggedContext: admin.firestore.DocumentData | undefined;
    let dataSnapshot: admin.firestore.DocumentSnapshot<admin.firestore.DocumentData>;
    let docRef: admin.firestore.DocumentReference<admin.firestore.DocumentData>;

    beforeAll(async () => {
      docRef = admin.firestore().collection("tests").doc(testId);
      await docRef.set({});
      dataSnapshot = await docRef.get();

      await docRef.update({ test: testId });

      // Refresh snapshot
      dataSnapshot = await docRef.get();

      loggedContext = await retry(() =>
        admin
          .firestore()
          .collection("firestoreDocumentOnUpdateTests")
          .doc(testId)
          .get()
          .then((logSnapshot) => logSnapshot.data())
      );
    });

    afterAll(async () => {
      await admin.firestore().collection("tests").doc(testId).delete();
    });

    it("should not have event.app", () => {
      expect(loggedContext?.app).toBeUndefined();
    });

    it("should have well-formed resource", () => {
      expect(loggedContext?.resource.name).toMatch(
        `projects/${projectId}/databases/(default)/documents/tests/${testId}`
      );
    });

    it("should have the correct eventType", () => {
      expect(loggedContext?.eventType).toEqual("google.firestore.document.update");
    });

    it("should have an eventId", () => {
      expect(loggedContext?.eventId).toBeDefined();
    });

    it("should have a timestamp", () => {
      expect(loggedContext?.timestamp).toBeDefined();
    });

    it("should not have the data", () => {
      expect(dataSnapshot.data()).toStrictEqual({ test: testId });
    });
  });

  describe("Document onWrite trigger", () => {
    let loggedContext: admin.firestore.DocumentData | undefined;
    let dataSnapshot: admin.firestore.DocumentSnapshot<admin.firestore.DocumentData>;
    let docRef: admin.firestore.DocumentReference<admin.firestore.DocumentData>;

    beforeAll(async () => {
      docRef = admin.firestore().collection("tests").doc(testId);
      await docRef.set({ test: testId });
      dataSnapshot = await docRef.get();

      loggedContext = await retry(() =>
        admin
          .firestore()
          .collection("firestoreDocumentOnWriteTests")
          .doc(testId)
          .get()
          .then((logSnapshot) => logSnapshot.data())
      );
    });

    afterAll(async () => {
      await admin.firestore().collection("tests").doc(testId).delete();
    });

    it("should not have event.app", () => {
      expect(loggedContext?.app).toBeUndefined();
    });

    it("should give refs access to admin data", async () => {
      const result = await docRef.set({ allowed: 1 }, { merge: true });
      expect(result).toBeTruthy();
    });

    it("should have well-formed resource", () => {
      expect(loggedContext?.resource.name).toMatch(
        `projects/${projectId}/databases/(default)/documents/tests/${testId}`
      );
    });

    it("should have the correct eventType", () => {
      expect(loggedContext?.eventType).toEqual("google.firestore.document.write");
    });

    it("should have an eventId", () => {
      expect(loggedContext?.eventId).toBeDefined();
    });

    it("should have a timestamp", () => {
      expect(loggedContext?.timestamp).toBeDefined();
    });

    it("should have the correct data", () => {
      expect(dataSnapshot.data()).toEqual({ test: testId });
    });
  });
});
