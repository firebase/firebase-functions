import * as admin from "firebase-admin";
import { timeout } from "../utils";
import { initializeFirebase } from "../firebaseSetup";

async function uploadBufferToFirebase(buffer: Buffer, fileName: string) {
  const bucket = admin.storage().bucket();

  const file = bucket.file(fileName);
  await file.save(buffer, {
    metadata: {
      contentType: "text/plain",
    },
  });
}

describe("Firebase Storage object onFinalize trigger", () => {
  const testId = process.env.TEST_RUN_ID;
  let loggedContext: admin.firestore.DocumentData | undefined;

  beforeAll(async () => {
    if (!testId) {
      throw new Error("Environment configured incorrectly.");
    }

    await initializeFirebase();

    const testContent = testId;
    const buffer = Buffer.from(testContent, "utf-8");

    await uploadBufferToFirebase(buffer, testId + ".txt");

    await timeout(20000);
    const logSnapshot = await admin
      .firestore()
      .collection("storageOnFinalizeTests")
      .doc(testId)
      .get();
    loggedContext = logSnapshot.data();
    if (!loggedContext) {
      throw new Error("loggedContext is undefined");
    }
  });

  afterAll(async () => {
    const file = admin
      .storage()
      .bucket()
      .file(testId + ".txt");

    const [exists] = await file.exists();
    if (exists) {
      await file.delete();
    }
  });

  it("should not have event.app", () => {
    expect(loggedContext?.app).toBeUndefined();
  });

  it("should have the right eventType", () => {
    expect(loggedContext?.eventType).toEqual("google.storage.object.finalize");
  });

  it("should have eventId", () => {
    expect(loggedContext?.eventId).toBeDefined();
  });

  it("should have timestamp", () => {
    expect(loggedContext?.timestamp).toBeDefined();
  });
});
