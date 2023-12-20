import admin from "firebase-admin";
import { timeout } from "../utils";
import { initializeFirebase } from "../firebaseSetup";

describe("Firestore document onCreate trigger", () => {
  const projectId = process.env.PROJECT_ID;
  const testId = process.env.TEST_RUN_ID;
  let loggedContext: admin.firestore.DocumentData | undefined;
  let dataSnapshot: admin.firestore.DocumentSnapshot<admin.firestore.DocumentData>;
  let docRef: admin.firestore.DocumentReference<admin.firestore.DocumentData>;

  beforeAll(async () => {
    if (!testId || !projectId) {
      throw new Error("Environment configured incorrectly.");
    }

    await initializeFirebase();

    docRef = admin.firestore().collection("tests").doc(testId);
    await docRef.set({ test: testId });
    dataSnapshot = await docRef.get();

    await timeout(20000);

    const logSnapshot = await admin
      .firestore()
      .collection("firestoreDocumentOnCreateTests")
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
