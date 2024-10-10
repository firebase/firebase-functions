import * as admin from "firebase-admin";
import { retry, timeout } from "../utils";
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

describe("Firebase Storage", () => {
  const testId = process.env.TEST_RUN_ID;
  if (!testId) {
    throw new Error("Environment configured incorrectly.");
  }

  beforeAll(async () => {
    await initializeFirebase();
  });

  afterAll(async () => {
    await admin.firestore().collection("storageOnFinalizeTests").doc(testId).delete();
    await admin.firestore().collection("storageOnDeleteTests").doc(testId).delete();
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

  // TODO: (b/372315689) Re-enable function once bug is fixed
  describe.skip("object onDelete trigger", () => {
    let loggedContext: admin.firestore.DocumentData | undefined;

    beforeAll(async () => {
      const testContent = testId;
      const buffer = Buffer.from(testContent, "utf-8");

      await uploadBufferToFirebase(buffer, testId + ".txt");

      await timeout(5000); // Short delay before delete

      const file = admin
        .storage()
        .bucket()
        .file(testId + ".txt");
      await file.delete();

      const loggedContext = await retry(() =>
        admin
          .firestore()
          .collection("storageOnDeleteTests")
          .doc(testId)
          .get()
          .then((logSnapshot) => logSnapshot.data())
      );
    });

    it("should not have event.app", () => {
      expect(loggedContext?.app).toBeUndefined();
    });

    it("should have the right eventType", () => {
      expect(loggedContext?.eventType).toEqual("google.storage.object.delete");
    });

    it("should have eventId", () => {
      expect(loggedContext?.eventId).toBeDefined();
    });

    it("should have timestamp", () => {
      expect(loggedContext?.timestamp).toBeDefined();
    });
  });

  describe("object onMetadataUpdate trigger", () => {
    let loggedContext: admin.firestore.DocumentData | undefined;

    beforeAll(async () => {
      const testContent = testId;
      const buffer = Buffer.from(testContent, "utf-8");

      await uploadBufferToFirebase(buffer, testId + ".txt");

      // Trigger metadata update
      const file = admin
        .storage()
        .bucket()
        .file(testId + ".txt");
      await file.setMetadata({ contentType: "application/json" });

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
