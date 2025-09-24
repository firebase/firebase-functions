import * as admin from "firebase-admin";
import { retry } from "../utils";
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

describe("Firebase Storage (v1)", () => {
  const testId = process.env.TEST_RUN_ID;
  if (!testId) {
    throw new Error("Environment configured incorrectly.");
  }

  beforeAll(() => {
    initializeFirebase();
  });

  afterAll(async () => {
    await admin.firestore().collection("storageOnFinalizeTests").doc(testId).delete();
    // Note: onDelete tests are disabled due to bug b/372315689
    // await admin.firestore().collection("storageOnDeleteTests").doc(testId).delete();
    await admin.firestore().collection("storageOnMetadataUpdateTests").doc(testId).delete();
  });

  describe("object onFinalize trigger", () => {
    let loggedContext: admin.firestore.DocumentData | undefined;

    beforeAll(async () => {
      const testContent = testId;
      const buffer = Buffer.from(testContent, "utf-8");

      await uploadBufferToFirebase(buffer, testId + ".txt");

      loggedContext = await retry(() =>
        admin
          .firestore()
          .collection("storageOnFinalizeTests")
          .doc(testId)
          .get()
          .then((logSnapshot) => logSnapshot.data())
      );
    });

    afterAll(async () => {
      try {
        const file = admin
          .storage()
          .bucket()
          .file(testId + ".txt");

        const [exists] = await file.exists();
        if (exists) {
          await file.delete();
        }
      } catch (error) {
        console.warn("Failed to clean up storage file:", (error as Error).message);
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

  // Note: onDelete tests are disabled due to bug b/372315689
  // describe("object onDelete trigger", () => {
  //   ...
  // });

  describe("object onMetadataUpdate trigger", () => {
    let loggedContext: admin.firestore.DocumentData | undefined;

    beforeAll(async () => {
      const testContent = testId;
      const buffer = Buffer.from(testContent, "utf-8");

      await uploadBufferToFirebase(buffer, testId + ".txt");

      // Short delay to ensure file is ready
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Update metadata to trigger the function
      const file = admin
        .storage()
        .bucket()
        .file(testId + ".txt");

      await file.setMetadata({
        metadata: {
          updated: "true",
          testId: testId,
        },
      });

      loggedContext = await retry(() =>
        admin
          .firestore()
          .collection("storageOnMetadataUpdateTests")
          .doc(testId)
          .get()
          .then((logSnapshot) => logSnapshot.data())
      );
    });

    afterAll(async () => {
      try {
        const file = admin
          .storage()
          .bucket()
          .file(testId + ".txt");

        const [exists] = await file.exists();
        if (exists) {
          await file.delete();
        }
      } catch (error) {
        console.warn("Failed to clean up storage file:", (error as Error).message);
      }
    });

    it("should not have event.app", () => {
      expect(loggedContext?.app).toBeUndefined();
    });

    it("should have the right eventType", () => {
      expect(loggedContext?.eventType).toEqual("google.storage.object.metadataUpdate");
    });

    it("should have eventId", () => {
      expect(loggedContext?.eventId).toBeDefined();
    });

    it("should have timestamp", () => {
      expect(loggedContext?.timestamp).toBeDefined();
    });
  });
});