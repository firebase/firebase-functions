import { describe, it, beforeAll, expect, afterAll } from "vitest";
import { RUN_ID, waitForEvent } from "./utils";
import { storage } from "./firebase.server";
import { config } from "./config";
import { expectStorageObjectData } from "./assertions/storage";
import { expectEventContext, expectCloudEvent } from "./assertions";

const bucket = storage.bucket(config.storageBucket);
const filename = `dummy-file-${RUN_ID}.txt`;

async function createDummyFile() {
  const buffer = Buffer.from("Hello, world!");
  const file = bucket.file(filename);
  await file.save(buffer);
  const [metadata] = await file.getMetadata();
  return metadata;
}

describe("storage", () => {
  let createdFile: Awaited<ReturnType<typeof createDummyFile>>;
  let v1UploadedData: any;
  let v2UploadedData: any;
  let v1MetadataData: any;
  let v2MetadataData: any;
  let v1DeletedData: any;
  let v2DeletedData: any;

  // Since storage triggers are bucket wide, we perform all events at the top-level
  // in a specific order, then assert the values at the end.
  beforeAll(async () => {
    // Create file - triggers both v1 and v2 onObjectFinalized
    let createFilePromise: Promise<void> | null = null;
    const getCreateFileTrigger = () => {
      if (!createFilePromise) {
        createFilePromise = (async () => {
          createdFile = await createDummyFile();
        })();
      }
      return createFilePromise;
    };

    [v1UploadedData, v2UploadedData] = await Promise.all([
      waitForEvent("onObjectFinalizedV1", getCreateFileTrigger),
      waitForEvent("onObjectFinalized", getCreateFileTrigger),
    ]);

    // Update metadata - triggers both v1 and v2 onObjectMetadataUpdated
    let updateMetadataPromise: Promise<void> | null = null;
    const getUpdateMetadataTrigger = () => {
      if (!updateMetadataPromise) {
        updateMetadataPromise = (async () => {
          await bucket.file(createdFile.name).setMetadata({
            runId: RUN_ID,
          });
        })();
      }
      return updateMetadataPromise;
    };

    [v1MetadataData, v2MetadataData] = await Promise.all([
      waitForEvent("onObjectMetadataUpdatedV1", getUpdateMetadataTrigger),
      waitForEvent("onObjectMetadataUpdated", getUpdateMetadataTrigger),
    ]);

    // Delete file - triggers both v1 and v2 onObjectDeleted
    let deleteFilePromise: Promise<void> | null = null;
    const getDeleteFileTrigger = () => {
      if (!deleteFilePromise) {
        deleteFilePromise = (async () => {
          await bucket.file(createdFile.name).delete();
        })();
      }
      return deleteFilePromise;
    };

    [v1DeletedData, v2DeletedData] = await Promise.all([
      waitForEvent("onObjectDeletedV1", getDeleteFileTrigger),
      waitForEvent("onObjectDeleted", getDeleteFileTrigger),
    ]);
  }, 60_000);

  afterAll(async () => {
    // Just in case the file wasn't deleted by the trigger if it failed.
    await bucket.file(createdFile.name).delete({
      ignoreNotFound: true,
    });
  });

  describe("onObjectDeleted", () => {
    describe("v1", () => {
      it("should have event context", () => {
        expectEventContext(v1DeletedData);
      });

      it("should have the correct data", () => {
        expect(v1DeletedData.object.bucket).toBe(config.storageBucket);
        // Use the actual filename from the object data
        const actualFilename = v1DeletedData.object.name || filename;
        expectStorageObjectData(v1DeletedData.object, actualFilename);
      });

      // TODO: Doesn't seem to be sent by Google Cloud?
      it.skip("should contain a timeDeleted timestamp", () => {
        expect(v1DeletedData.object.timeDeleted).toBeDefined();
        expect(Date.parse(v1DeletedData.object.timeDeleted)).toBeGreaterThan(0);
      });
    });

    describe("v2", () => {
      it("should be a CloudEvent", () => {
        expectCloudEvent(v2DeletedData);
      });

      it("should have the correct data", () => {
        expect(v2DeletedData.bucket).toBe(config.storageBucket);
        expectStorageObjectData(v2DeletedData.object, filename);
      });

      // TODO: Doesn't seem to be sent by Google Cloud?
      it.skip("should contain a timeDeleted timestamp", () => {
        expect(v2DeletedData.object.timeDeleted).toBeDefined();
        expect(Date.parse(v2DeletedData.object.timeDeleted)).toBeGreaterThan(0);
      });
    });
  });

  describe("onObjectMetadataUpdated", () => {
    describe("v1", () => {
      it("should have event context", () => {
        // Note: onObjectMetadataUpdated may not always have event context in v1
        if (v1MetadataData.eventId !== undefined) {
          expect(v1MetadataData.eventId).toBeDefined();
          expect(v1MetadataData.eventType).toBeDefined();
          expect(v1MetadataData.timestamp).toBeDefined();
          expect(v1MetadataData.resource).toBeDefined();
        }
      });

      it("should have the correct data", () => {
        expect(v1MetadataData.object.bucket).toBe(config.storageBucket);
        // Use the actual filename from the object data
        const actualFilename = v1MetadataData.object.name || filename;
        expectStorageObjectData(v1MetadataData.object, actualFilename);
      });

      // TODO: Doesn't seem to be sent by Google Cloud?
      it.skip("should have metadata", () => {
        expect(v1MetadataData.object.metadata).toBeDefined();
        expect(v1MetadataData.object.metadata.runId).toBe(RUN_ID);
      });
    });

    describe("v2", () => {
      it("should be a CloudEvent", () => {
        expectCloudEvent(v2MetadataData);
      });

      it("should have the correct data", () => {
        expect(v2MetadataData.bucket).toBe(config.storageBucket);
        expectStorageObjectData(v2MetadataData.object, filename);
      });

      // TODO: Doesn't seem to be sent by Google Cloud?
      it.skip("should have metadata", () => {
        expect(v2MetadataData.metadata).toBeDefined();
        expect(v2MetadataData.metadata.runId).toBe(RUN_ID);
      });
    });
  });

  describe("onObjectFinalized", () => {
    describe("v1", () => {
      it("should have event context", () => {
        expect(v1UploadedData.eventId).toBeDefined();
        expect(v1UploadedData.eventType).toBeDefined();
        expect(v1UploadedData.timestamp).toBeDefined();
        expect(v1UploadedData.resource).toBeDefined();
      });

      it("should have the correct data", () => {
        expect(v1UploadedData.object.bucket).toBe(config.storageBucket);
        // Use the actual filename from the object data
        const actualFilename = v1UploadedData.object.name || filename;
        expectStorageObjectData(v1UploadedData.object, actualFilename);
      });

      // TODO: Doesn't seem to be sent by Google Cloud?
      it.skip("should not have initial metadata", () => {
        expect(v1UploadedData.object.metadata).toBeDefined();
        expect(v1UploadedData.object.metadata.runId).not.toBeUndefined();
      });

      // TODO: Doesn't seem to be sent by Google Cloud?
      it.skip("should contain a timeCreated timestamp", () => {
        expect(v1UploadedData.object.timeCreated).toBeDefined();
        expect(Date.parse(v1UploadedData.object.timeCreated)).toBeGreaterThan(0);
      });
    });

    describe("v2", () => {
      it("should be a CloudEvent", () => {
        expectCloudEvent(v2UploadedData);
      });

      it("should have the correct data", () => {
        expect(v2UploadedData.bucket).toBe(config.storageBucket);
        expectStorageObjectData(v2UploadedData.object, filename);
      });

      // TODO: Doesn't seem to be sent by Google Cloud?
      it.skip("should not have initial metadata", () => {
        expect(v2UploadedData.object.metadata).toBeDefined();
        expect(v2UploadedData.object.metadata.runId).not.toBeUndefined();
      });

      // TODO: Doesn't seem to be sent by Google Cloud?
      it.skip("should contain a timeCreated timestamp", () => {
        expect(v2UploadedData.object.timeCreated).toBeDefined();
        expect(Date.parse(v2UploadedData.object.timeCreated)).toBeGreaterThan(0);
      });
    });
  });
});
