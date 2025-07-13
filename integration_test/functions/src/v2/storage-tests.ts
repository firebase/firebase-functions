import {
  onObjectArchived,
  onObjectDeleted,
  onObjectFinalized,
  onObjectMetadataUpdated,
} from "firebase-functions/v2/storage";
import { expectEq, TestSuite } from "../testing";

const BUCKET_NAME = "gs://v2-storage-test-bucket";

export const storagetestsFinalized = onObjectFinalized({ bucket: BUCKET_NAME }, (event) => {
  return new TestSuite("storage onObjectFinalized")
    .it("should have object name", () => {
      expectEq(typeof event.data.name, "string");
    })
    .it("should have bucket", () => {
      expectEq(event.data.bucket, BUCKET_NAME.replace("gs://", ""));
    })
    .it("should have size", () => {
      expectEq(typeof event.data.size, "string");
    })
    .it("should have content type", () => {
      expectEq(typeof event.data.contentType, "string");
    })
    .run(event.subject?.split("/").pop() || "unknown", event.data);
});

export const storagetestsDeleted = onObjectDeleted({ bucket: BUCKET_NAME }, (event) => {
  return new TestSuite("storage onObjectDeleted")
    .it("should have object name", () => {
      expectEq(typeof event.data.name, "string");
    })
    .it("should have bucket", () => {
      expectEq(event.data.bucket, BUCKET_NAME.replace("gs://", ""));
    })
    .run(event.subject?.split("/").pop() || "unknown", event.data);
});

export const storagetestsArchived = onObjectArchived({ bucket: BUCKET_NAME }, (event) => {
  return new TestSuite("storage onObjectArchived")
    .it("should have object name", () => {
      expectEq(typeof event.data.name, "string");
    })
    .it("should have bucket", () => {
      expectEq(event.data.bucket, BUCKET_NAME.replace("gs://", ""));
    })
    .run(event.subject?.split("/").pop() || "unknown", event.data);
});

export const storagetestsMetadataUpdated = onObjectMetadataUpdated(
  { bucket: BUCKET_NAME },
  (event) => {
    return new TestSuite("storage onObjectMetadataUpdated")
      .it("should have object name", () => {
        expectEq(typeof event.data.name, "string");
      })
      .it("should have bucket", () => {
        expectEq(event.data.bucket, BUCKET_NAME.replace("gs://", ""));
      })
      .it("should have metadata", () => {
        expectEq(typeof event.data.metadata, "object");
      })
      .run(event.subject?.split("/").pop() || "unknown", event.data);
  }
);
