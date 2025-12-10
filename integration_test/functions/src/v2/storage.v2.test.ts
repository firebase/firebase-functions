import { describe, it, beforeAll, expect, afterAll } from "vitest";
import { RUN_ID, waitForEvent } from "../utils";
import { storage } from "../firebase.server";
import { config } from "../config";
import { expectCloudEvent } from "../assertions";
import { expectStorageObjectData } from "../assertions/storage";

const bucket = storage.bucket(config.storageBucket);
const filename = `dummy-file-${RUN_ID}.txt`;

async function createDummyFile() {
  const buffer = Buffer.from("Hello, world!");
  const file = bucket.file(filename);
  await file.save(buffer);
  const [metadata] = await file.getMetadata();
  return metadata;
}

describe("storage.v2", () => {
  let createdFile: Awaited<ReturnType<typeof createDummyFile>>;
  let uploadedData: any;
  let metadataData: any;
  let deletedData: any;

  // Since storage triggers are bucket wide, we perform all events at the top-level
  // in a specific order, then assert the values at the end.
  beforeAll(async () => {
    uploadedData = await waitForEvent("onObjectFinalized", async () => {
      createdFile = await createDummyFile();
    });

    metadataData = await waitForEvent("onObjectMetadataUpdated", async () => {
      await bucket.file(createdFile.name).setMetadata({
        runId: RUN_ID,
      });
    });

    deletedData = await waitForEvent("onObjectDeleted", async () => {
      await bucket.file(createdFile.name).delete();
    });
  }, 60_000);

  afterAll(async () => {
    // Just in case the file wasn't deleted by the trigger if it failed.
    await bucket.file(createdFile.name).delete({
      ignoreNotFound: true,
    });
  });

  describe("onObjectDeleted", () => {
    it("should be a CloudEvent", () => {
      expectCloudEvent(deletedData);
    });

    it("should have the correct data", () => {
      expect(deletedData.bucket).toBe(config.storageBucket);
      expectStorageObjectData(deletedData.object, filename);
    });

    // TODO: Doesn't seem to be sent by Google Cloud?
    it.skip('should contain a timeDeleted timestamp', () => {
      expect(deletedData.object.timeDeleted).toBeDefined();
      expect(Date.parse(deletedData.object.timeDeleted)).toBeGreaterThan(0);
    });
  });

  describe("onObjectMetadataUpdated", () => {
    it("should be a CloudEvent", () => {
      expectCloudEvent(metadataData);
    });

    it("should have the correct data", () => {
      expect(metadataData.bucket).toBe(config.storageBucket);
      expectStorageObjectData(metadataData.object, filename);
    });

    // TODO: Doesn't seem to be sent by Google Cloud?
    it.skip('should have metadata', () => {
      expect(metadataData.metadata).toBeDefined();
      expect(metadataData.metadata.runId).toBe(RUN_ID);
    });
  });

  describe("onObjectFinalized", () => {
    it("should be a CloudEvent", () => {
      expectCloudEvent(uploadedData);
    });

    it("should have the correct data", () => {
      expect(uploadedData.bucket).toBe(config.storageBucket);
      expectStorageObjectData(uploadedData.object, filename);
    });

    // TODO: Doesn't seem to be sent by Google Cloud?
    it.skip('should not have initial metadata', () => {
      expect(uploadedData.object.metadata).toBeDefined();
      expect(uploadedData.object.metadata.runId).not.toBeUndefined();
    });

    // TODO: Doesn't seem to be sent by Google Cloud?
    it.skip('should contain a timeCreated timestamp', () => {
      expect(uploadedData.object.timeCreated).toBeDefined();
      expect(Date.parse(uploadedData.object.timeCreated)).toBeGreaterThan(0);
    });
  });
});
