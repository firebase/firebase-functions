import admin from "firebase-admin";
import { timeout } from "../utils";
import { initializeFirebase } from "../firebaseSetup";
import { Reference } from "@firebase/database-types";

describe("Firebase Database ref onWrite trigger", () => {
  const projectId = process.env.PROJECT_ID;
  const testId = process.env.TEST_RUN_ID;
  let ref: Reference;
  let loggedContext: admin.firestore.DocumentData | undefined;

  beforeAll(async () => {
    if (!testId || !projectId) {
      throw new Error("Environment configured incorrectly.");
    }

    await initializeFirebase();

    ref = admin.database().ref(`dbTests/${testId}/start`);
    await ref.set({ ".sv": "timestamp" });
    await timeout(20000);
    const logSnapshot = await admin
      .firestore()
      .collection("databaseRefOnWriteTests")
      .doc(testId)
      .get();
    loggedContext = logSnapshot.data();

    if (!loggedContext) {
      throw new Error("loggedContext is undefined");
    }
  });

  afterAll(async () => {
    await ref.parent?.remove();
  });

  it("should not have event.app", () => {
    expect(loggedContext?.app).toBeUndefined();
  });

  it("should give refs access to admin data", async () => {
    await ref.parent?.child("adminOnly").update({ allowed: 1 });

    // Retrieve the updated data to verify the update operation
    const adminDataSnapshot = await ref.parent?.child("adminOnly").once("value");
    const adminData = adminDataSnapshot?.val();

    expect(adminData).toEqual({ allowed: 1 });
  });

  it("should have a correct ref url", () => {
    expect(loggedContext?.url).toMatch(
      new RegExp(`^https://${projectId}(-default-rtdb)*.firebaseio.com/dbTests`)
    );
    expect(loggedContext?.url).toMatch(/\/start$/);
  });

  it("should have refs resources", () =>
    expect(loggedContext?.resource.name).toMatch(
      new RegExp(`^projects/_/instances/${projectId}(-default-rtdb)*/refs/dbTests/${testId}/start$`)
    ));

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
