import { expect } from "chai";
import * as config from "../../../src/common/config";
import * as options from "../../../src/v2/options";
import * as storage from "../../../src/v2/providers/storage";
import { FULL_ENDPOINT, MINIMAL_V2_ENDPOINT, FULL_OPTIONS, FULL_TRIGGER } from "./fixtures";
import { CloudEvent, onInit } from "../../../src/v2/core";

const EVENT_TRIGGER = {
  eventType: "event-type",
  resource: "some-bucket",
};

const ENDPOINT_EVENT_TRIGGER = {
  eventType: "event-type",
  eventFilters: {
    bucket: "some-bucket",
  },
  retry: false,
};

const DEFAULT_BUCKET_EVENT_FILTER = {
  bucket: "default-bucket",
};

const SPECIFIC_BUCKET_EVENT_FILTER = {
  bucket: "my-bucket",
};

describe("v2/storage", () => {
  describe("getOptsAndBucket", () => {
    it("should return the default bucket with empty opts", () => {
      config.resetCache({ storageBucket: "default-bucket" });

      const [opts, bucket] = storage.getOptsAndBucket({});

      config.resetCache();
      expect(opts).to.deep.equal({});
      expect(bucket).to.eq("default-bucket");
    });

    it("should return the default bucket with opts param", () => {
      config.resetCache({ storageBucket: "default-bucket" });

      const [opts, bucket] = storage.getOptsAndBucket({ region: "us-west1" });

      config.resetCache();
      expect(opts).to.deep.equal({ region: "us-west1" });
      expect(bucket).to.eq("default-bucket");
    });

    it("should return the given bucket", () => {
      const [opts, bucket] = storage.getOptsAndBucket("my-bucket");

      expect(opts).to.deep.equal({});
      expect(bucket).to.eq("my-bucket");
    });

    it("should return the given bucket and opts", () => {
      const [opts, bucket] = storage.getOptsAndBucket({
        bucket: "my-bucket",
        region: "us-west1",
      });

      expect(opts).to.deep.equal({ region: "us-west1" });
      expect(bucket).to.eq("my-bucket");
    });
  });

  describe("onOperation", () => {
    beforeEach(() => {
      process.env.GCLOUD_PROJECT = "aProject";
    });

    afterEach(() => {
      options.setGlobalOptions({});
      config.resetCache();
      delete process.env.GCLOUD_PROJECT;
    });

    it("should create a minimal trigger/endpoint with bucket", () => {
      const result = storage.onOperation("event-type", "some-bucket", () => 42);

      expect(result.__trigger).to.deep.equal({
        platform: "gcfv2",
        labels: {},
        eventTrigger: EVENT_TRIGGER,
      });

      expect(result.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        eventTrigger: ENDPOINT_EVENT_TRIGGER,
      });
    });

    it("should create a minimal trigger/endpoint with opts", () => {
      config.resetCache({ storageBucket: "default-bucket" });

      const result = storage.onOperation("event-type", { region: "us-west1" }, () => 42);

      expect(result.__trigger).to.deep.equal({
        platform: "gcfv2",
        labels: {},
        eventTrigger: {
          ...EVENT_TRIGGER,
          resource: "default-bucket",
        },
        regions: ["us-west1"],
      });

      expect(result.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        eventTrigger: {
          ...ENDPOINT_EVENT_TRIGGER,
          eventFilters: DEFAULT_BUCKET_EVENT_FILTER,
        },
        region: ["us-west1"],
      });
    });

    it("should create a minimal trigger with bucket with opts and bucket", () => {
      const result = storage.onOperation("event-type", { bucket: "some-bucket" }, () => 42);

      expect(result.__trigger).to.deep.equal({
        platform: "gcfv2",
        labels: {},
        eventTrigger: EVENT_TRIGGER,
      });

      expect(result.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        eventTrigger: ENDPOINT_EVENT_TRIGGER,
      });
    });

    it("should create a complex trigger/endpoint with appropriate values", () => {
      const result = storage.onOperation(
        "event-type",
        {
          ...FULL_OPTIONS,
          bucket: "some-bucket",
        },
        () => 42
      );

      expect(result.__trigger).to.deep.equal({
        ...FULL_TRIGGER,
        eventTrigger: EVENT_TRIGGER,
      });

      expect(result.__endpoint).to.deep.equal({
        ...FULL_ENDPOINT,
        platform: "gcfv2",
        eventTrigger: ENDPOINT_EVENT_TRIGGER,
      });
    });

    it("should merge options and globalOptions", () => {
      options.setGlobalOptions({
        concurrency: 20,
        region: "europe-west1",
        minInstances: 1,
      });

      const result = storage.onOperation(
        "event-type",
        {
          bucket: "some-bucket",
          region: "us-west1",
          minInstances: 3,
        },
        () => 42
      );

      expect(result.__trigger).to.deep.equal({
        platform: "gcfv2",
        concurrency: 20,
        minInstances: 3,
        regions: ["us-west1"],
        labels: {},
        eventTrigger: EVENT_TRIGGER,
      });

      expect(result.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        concurrency: 20,
        minInstances: 3,
        region: ["us-west1"],
        labels: {},
        eventTrigger: ENDPOINT_EVENT_TRIGGER,
      });
    });
  });

  describe("onObjectArchived", () => {
    const ARCHIVED_TRIGGER = {
      ...EVENT_TRIGGER,
      eventType: storage.archivedEvent,
    };
    const ENDPOINT_ARCHIVED_TRIGGER = {
      ...ENDPOINT_EVENT_TRIGGER,
      eventType: storage.archivedEvent,
    };

    afterEach(() => {
      config.resetCache();
    });

    it("should accept only handler", () => {
      config.resetCache({ storageBucket: "default-bucket" });

      const result = storage.onObjectArchived(() => 42);

      expect(result.__trigger).to.deep.equal({
        platform: "gcfv2",
        labels: {},
        eventTrigger: {
          ...ARCHIVED_TRIGGER,
          resource: "default-bucket",
        },
      });

      expect(result.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        eventTrigger: {
          ...ENDPOINT_ARCHIVED_TRIGGER,
          eventFilters: DEFAULT_BUCKET_EVENT_FILTER,
        },
      });
    });

    it("should accept bucket and handler", () => {
      const result = storage.onObjectArchived("my-bucket", () => 42);

      expect(result.__trigger).to.deep.equal({
        platform: "gcfv2",
        labels: {},
        eventTrigger: {
          ...ARCHIVED_TRIGGER,
          resource: "my-bucket",
        },
      });

      expect(result.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        eventTrigger: {
          ...ENDPOINT_ARCHIVED_TRIGGER,
          eventFilters: SPECIFIC_BUCKET_EVENT_FILTER,
        },
      });
    });

    it("should accept opts and handler", () => {
      const result = storage.onObjectArchived(
        { bucket: "my-bucket", region: "us-west1" },
        () => 42
      );

      expect(result.__trigger).to.deep.equal({
        platform: "gcfv2",
        labels: {},
        eventTrigger: {
          ...ARCHIVED_TRIGGER,
          resource: "my-bucket",
        },
        regions: ["us-west1"],
      });

      expect(result.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        eventTrigger: {
          ...ENDPOINT_ARCHIVED_TRIGGER,
          eventFilters: SPECIFIC_BUCKET_EVENT_FILTER,
        },
        region: ["us-west1"],
      });
    });

    it("should accept opts and handler, default bucket", () => {
      config.resetCache({ storageBucket: "default-bucket" });
      const result = storage.onObjectArchived({ region: "us-west1" }, () => 42);

      expect(result.__trigger).to.deep.equal({
        platform: "gcfv2",
        labels: {},
        eventTrigger: {
          ...ARCHIVED_TRIGGER,
          resource: "default-bucket",
        },
        regions: ["us-west1"],
      });

      expect(result.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        eventTrigger: {
          ...ENDPOINT_ARCHIVED_TRIGGER,
          eventFilters: DEFAULT_BUCKET_EVENT_FILTER,
        },
        region: ["us-west1"],
      });
    });

    it("calls init function", async () => {
      const event: CloudEvent<string> = {
        specversion: "1.0",
        id: "id",
        source: "source",
        type: "type",
        time: "now",
        data: "data",
      };

      let hello;
      onInit(() => (hello = "world"));
      expect(hello).to.be.undefined;
      await storage.onObjectArchived("bucket", () => null)(event);
      expect(hello).to.equal("world");
    });
  });

  describe("onObjectFinalized", () => {
    const FINALIZED_TRIGGER = {
      ...EVENT_TRIGGER,
      eventType: storage.finalizedEvent,
    };
    const ENDPOINT_FINALIZED_TRIGGER = {
      ...ENDPOINT_EVENT_TRIGGER,
      eventType: storage.finalizedEvent,
    };

    afterEach(() => {
      config.resetCache();
    });

    it("should accept only handler", () => {
      config.resetCache({ storageBucket: "default-bucket" });

      const result = storage.onObjectFinalized(() => 42);

      expect(result.__trigger).to.deep.equal({
        platform: "gcfv2",
        labels: {},
        eventTrigger: {
          ...FINALIZED_TRIGGER,
          resource: "default-bucket",
        },
      });

      expect(result.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        eventTrigger: {
          ...ENDPOINT_FINALIZED_TRIGGER,
          eventFilters: DEFAULT_BUCKET_EVENT_FILTER,
        },
      });
    });

    it("should accept bucket and handler", () => {
      const result = storage.onObjectFinalized("my-bucket", () => 42);

      expect(result.__trigger).to.deep.equal({
        platform: "gcfv2",
        labels: {},
        eventTrigger: {
          ...FINALIZED_TRIGGER,
          resource: "my-bucket",
        },
      });

      expect(result.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        eventTrigger: {
          ...ENDPOINT_FINALIZED_TRIGGER,
          eventFilters: SPECIFIC_BUCKET_EVENT_FILTER,
        },
      });
    });

    it("should accept opts and handler", () => {
      const result = storage.onObjectFinalized(
        { bucket: "my-bucket", region: "us-west1" },
        () => 42
      );

      expect(result.__trigger).to.deep.equal({
        platform: "gcfv2",
        labels: {},
        eventTrigger: {
          ...FINALIZED_TRIGGER,
          resource: "my-bucket",
        },
        regions: ["us-west1"],
      });

      expect(result.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        eventTrigger: {
          ...ENDPOINT_FINALIZED_TRIGGER,
          eventFilters: SPECIFIC_BUCKET_EVENT_FILTER,
        },
        region: ["us-west1"],
      });
    });

    it("should accept opts and handler, default bucket", () => {
      config.resetCache({ storageBucket: "default-bucket" });
      const result = storage.onObjectFinalized({ region: "us-west1" }, () => 42);

      expect(result.__trigger).to.deep.equal({
        platform: "gcfv2",
        labels: {},
        eventTrigger: {
          ...FINALIZED_TRIGGER,
          resource: "default-bucket",
        },
        regions: ["us-west1"],
      });

      expect(result.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        eventTrigger: {
          ...ENDPOINT_FINALIZED_TRIGGER,
          eventFilters: DEFAULT_BUCKET_EVENT_FILTER,
        },
        region: ["us-west1"],
      });
    });

    it("calls init function", async () => {
      const event: CloudEvent<string> = {
        specversion: "1.0",
        id: "id",
        source: "source",
        type: "type",
        time: "now",
        data: "data",
      };

      let hello;
      onInit(() => (hello = "world"));
      expect(hello).to.be.undefined;
      await storage.onObjectFinalized("bucket", () => null)(event);
      expect(hello).to.equal("world");
    });
  });

  describe("onObjectDeleted", () => {
    const DELETED_TRIGGER = {
      ...EVENT_TRIGGER,
      eventType: storage.deletedEvent,
    };
    const ENDPOINT_DELETED_TRIGGER = {
      ...ENDPOINT_EVENT_TRIGGER,
      eventType: storage.deletedEvent,
    };

    afterEach(() => {
      config.resetCache();
    });

    it("should accept only handler", () => {
      config.resetCache({ storageBucket: "default-bucket" });

      const result = storage.onObjectDeleted(() => 42);

      expect(result.__trigger).to.deep.equal({
        platform: "gcfv2",
        labels: {},
        eventTrigger: {
          ...DELETED_TRIGGER,
          resource: "default-bucket",
        },
      });

      expect(result.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        eventTrigger: {
          ...ENDPOINT_DELETED_TRIGGER,
          eventFilters: DEFAULT_BUCKET_EVENT_FILTER,
        },
      });
    });

    it("should accept bucket and handler", () => {
      const result = storage.onObjectDeleted("my-bucket", () => 42);

      expect(result.__trigger).to.deep.equal({
        platform: "gcfv2",
        labels: {},
        eventTrigger: {
          ...DELETED_TRIGGER,
          resource: "my-bucket",
        },
      });

      expect(result.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        eventTrigger: {
          ...ENDPOINT_DELETED_TRIGGER,
          eventFilters: SPECIFIC_BUCKET_EVENT_FILTER,
        },
      });
    });

    it("should accept opts and handler", () => {
      const result = storage.onObjectDeleted({ bucket: "my-bucket", region: "us-west1" }, () => 42);

      expect(result.__trigger).to.deep.equal({
        platform: "gcfv2",
        labels: {},
        eventTrigger: {
          ...DELETED_TRIGGER,
          resource: "my-bucket",
        },
        regions: ["us-west1"],
      });

      expect(result.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        eventTrigger: {
          ...ENDPOINT_DELETED_TRIGGER,
          eventFilters: SPECIFIC_BUCKET_EVENT_FILTER,
        },
        region: ["us-west1"],
      });
    });

    it("should accept opts and handler, default bucket", () => {
      config.resetCache({ storageBucket: "default-bucket" });
      const result = storage.onObjectDeleted({ region: "us-west1" }, () => 42);

      expect(result.__trigger).to.deep.equal({
        platform: "gcfv2",
        labels: {},
        eventTrigger: {
          ...DELETED_TRIGGER,
          resource: "default-bucket",
        },
        regions: ["us-west1"],
      });

      expect(result.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        eventTrigger: {
          ...ENDPOINT_DELETED_TRIGGER,
          eventFilters: DEFAULT_BUCKET_EVENT_FILTER,
        },
        region: ["us-west1"],
      });
    });

    it("calls init function", async () => {
      const event: CloudEvent<string> = {
        specversion: "1.0",
        id: "id",
        source: "source",
        type: "type",
        time: "now",
        data: "data",
      };

      let hello;
      onInit(() => (hello = "world"));
      expect(hello).to.be.undefined;
      await storage.onObjectDeleted("bucket", () => null)(event);
      expect(hello).to.equal("world");
    });
  });

  describe("onObjectMetadataUpdated", () => {
    const METADATA_TRIGGER = {
      ...EVENT_TRIGGER,
      eventType: storage.metadataUpdatedEvent,
    };
    const ENDPOINT_METADATA_TRIGGER = {
      ...ENDPOINT_EVENT_TRIGGER,
      eventType: storage.metadataUpdatedEvent,
    };

    afterEach(() => {
      config.resetCache();
    });

    it("should accept only handler", () => {
      config.resetCache({ storageBucket: "default-bucket" });

      const result = storage.onObjectMetadataUpdated(() => 42);

      expect(result.__trigger).to.deep.equal({
        platform: "gcfv2",
        labels: {},
        eventTrigger: {
          ...METADATA_TRIGGER,
          resource: "default-bucket",
        },
      });

      expect(result.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        eventTrigger: {
          ...ENDPOINT_METADATA_TRIGGER,
          eventFilters: DEFAULT_BUCKET_EVENT_FILTER,
        },
      });
    });

    it("should accept bucket and handler", () => {
      const result = storage.onObjectMetadataUpdated("my-bucket", () => 42);

      expect(result.__trigger).to.deep.equal({
        platform: "gcfv2",
        labels: {},
        eventTrigger: {
          ...METADATA_TRIGGER,
          resource: "my-bucket",
        },
      });

      expect(result.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        eventTrigger: {
          ...ENDPOINT_METADATA_TRIGGER,
          eventFilters: SPECIFIC_BUCKET_EVENT_FILTER,
        },
      });
    });

    it("should accept opts and handler", () => {
      const result = storage.onObjectMetadataUpdated(
        { bucket: "my-bucket", region: "us-west1" },
        () => 42
      );

      expect(result.__trigger).to.deep.equal({
        platform: "gcfv2",
        labels: {},
        eventTrigger: {
          ...METADATA_TRIGGER,
          resource: "my-bucket",
        },
        regions: ["us-west1"],
      });

      expect(result.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        eventTrigger: {
          ...ENDPOINT_METADATA_TRIGGER,
          eventFilters: SPECIFIC_BUCKET_EVENT_FILTER,
        },
        region: ["us-west1"],
      });
    });

    it("should accept opts and handler, default bucket", () => {
      config.resetCache({ storageBucket: "default-bucket" });

      const result = storage.onObjectMetadataUpdated({ region: "us-west1" }, () => 42);

      expect(result.__trigger).to.deep.equal({
        platform: "gcfv2",
        labels: {},
        eventTrigger: {
          ...METADATA_TRIGGER,
          resource: "default-bucket",
        },
        regions: ["us-west1"],
      });

      expect(result.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        eventTrigger: {
          ...ENDPOINT_METADATA_TRIGGER,
          eventFilters: DEFAULT_BUCKET_EVENT_FILTER,
        },
        region: ["us-west1"],
      });
    });

    it("calls init function", async () => {
      const event: CloudEvent<string> = {
        specversion: "1.0",
        id: "id",
        source: "source",
        type: "type",
        time: "now",
        data: "data",
      };

      let hello;
      onInit(() => (hello = "world"));
      expect(hello).to.be.undefined;
      await storage.onObjectMetadataUpdated("bucket", () => null)(event);
      expect(hello).to.equal("world");
    });
  });

  describe("v1-compatible getters", () => {
    let capturedEvent: storage.StorageEvent;

    beforeEach(async () => {
      const data: storage.StorageObjectData = {
        bucket: "my-bucket",
        name: "my-object",
        contentType: "image/jpeg",
        size: 1024,
        timeCreated: "2023-01-01T00:00:00.000Z",
        updated: "2023-01-01T00:00:00.000Z",
        generation: 123456789,
        metageneration: 1,
        storageClass: "STANDARD",
        componentCount: 2,
        id: "my-bucket/my-object/123456789",
      } as unknown as storage.StorageObjectData;

      const cloudEvent: CloudEvent<storage.StorageObjectData> = {
        specversion: "1.0",
        id: "event-id-123",
        source: "//storage.googleapis.com/projects/_/buckets/my-bucket/objects/my-object",
        type: storage.finalizedEvent,
        time: "2023-01-01T00:00:00.000Z",
        data,
      };

      const func = storage.onObjectFinalized("my-bucket", (e) => {
        capturedEvent = e;
        return Promise.resolve();
      });

      await func(cloudEvent);
    });

    it("should provide v1-compatible context getter", () => {
      expect(capturedEvent.context).to.deep.equal({
        eventId: "event-id-123",
        timestamp: "2023-01-01T00:00:00.000Z",
        eventType: "google.storage.object.finalize",
        resource: {
          service: "storage.googleapis.com",
          name: "projects/_/buckets/my-bucket/objects/my-object",
        },
        params: {},
      });
    });

    it("should provide v1-compatible object getter", () => {
      expect(capturedEvent.object).to.deep.equal({
        bucket: "my-bucket",
        name: "my-object",
        contentType: "image/jpeg",
        size: "1024",
        timeCreated: "2023-01-01T00:00:00.000Z",
        updated: "2023-01-01T00:00:00.000Z",
        generation: "123456789",
        metageneration: "1",
        storageClass: "STANDARD",
        componentCount: "2",
        id: "my-bucket/my-object/123456789",
        kind: "storage#object",
        selfLink: "https://www.googleapis.com/storage/v1/b/my-bucket/o/my-object",
        mediaLink:
          "https://www.googleapis.com/download/storage/v1/b/my-bucket/o/my-object?generation=123456789&alt=media",
      });
    });

    it("should allow destructuring getters", () => {
      const { context, object } = capturedEvent;
      // Use ! since we're strictly asserting properties we've mapped
      expect(context!.eventId).to.equal("event-id-123");
      expect(object!.bucket).to.equal("my-bucket");
    });
  });
});
