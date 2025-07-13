import * as admin from "firebase-admin";
import {
  onDocumentWritten,
  onDocumentCreated,
  onDocumentDeleted,
  onDocumentUpdated,
} from "firebase-functions/v2/firestore";
import { expectEq, TestSuite } from "../testing";

export const firestoretestsWritten = onDocumentWritten(
  "v2tests/{testId}/firestore/{docId}",
  (event) => {
    return new TestSuite("firestore onDocumentWritten")
      .it("should have params", () => {
        expectEq(typeof event.params.testId, "string");
        expectEq(typeof event.params.docId, "string");
      })
      .it("should have data after", () => {
        expectEq(event.data?.after.data()?.value, "written");
      })
      .it("should have null data before for new docs", () => {
        expectEq(event.data?.before.data(), undefined);
      })
      .run(event.params.testId, event.data);
  }
);

export const firestoretestsCreated = onDocumentCreated(
  "v2tests/{testId}/firestore-created/{docId}",
  (event) => {
    return new TestSuite("firestore onDocumentCreated")
      .it("should have params", () => {
        expectEq(typeof event.params.testId, "string");
        expectEq(typeof event.params.docId, "string");
      })
      .it("should have data", () => {
        expectEq(event.data?.data()?.value, "created");
      })
      .run(event.params.testId, event.data);
  }
);

export const firestoretestsDeleted = onDocumentDeleted(
  "v2tests/{testId}/firestore-deleted/{docId}",
  async (event) => {
    const db = admin.firestore();
    // Create a document to be deleted
    await db
      .collection(`v2tests/${event.params.testId}/firestore-to-delete`)
      .doc("deleteMe")
      .set({ value: "toBeDeleted" });

    return new TestSuite("firestore onDocumentDeleted")
      .it("should have params", () => {
        expectEq(typeof event.params.testId, "string");
        expectEq(typeof event.params.docId, "string");
      })
      .it("should have previous data", () => {
        expectEq(event.data?.data()?.value, "toBeDeleted");
      })
      .run(event.params.testId, event.data);
  }
);

export const firestoretestsUpdated = onDocumentUpdated(
  "v2tests/{testId}/firestore-updated/{docId}",
  (event) => {
    return new TestSuite("firestore onDocumentUpdated")
      .it("should have params", () => {
        expectEq(typeof event.params.testId, "string");
        expectEq(typeof event.params.docId, "string");
      })
      .it("should have data after", () => {
        expectEq(event.data?.after.data()?.value, "updated");
      })
      .it("should have data before", () => {
        expectEq(event.data?.before.data()?.value, "original");
      })
      .run(event.params.testId, event.data);
  }
);
