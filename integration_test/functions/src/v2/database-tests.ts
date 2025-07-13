import * as admin from "firebase-admin";
import {
  onValueWritten,
  onValueCreated,
  onValueDeleted,
  onValueUpdated,
} from "firebase-functions/v2/database";
import { expectEq, TestSuite } from "../testing";

export const databasetestsWritten = onValueWritten("/v2tests/{testId}/db/written", (event) => {
  return new TestSuite("database onValueWritten")
    .it("should have path", () => {
      expectEq(event.params.testId, event.data.after.ref.parent?.parent?.key);
    })
    .it("should have data", () => {
      expectEq(event.data.after.val(), "world");
    })
    .it("should have before data", () => {
      expectEq(event.data.before.val(), null);
    })
    .run(event.params.testId, event.data);
});

export const databasetestsCreated = onValueCreated("/v2tests/{testId}/db/created", (event) => {
  return new TestSuite("database onValueCreated")
    .it("should have path", () => {
      expectEq(event.params.testId, event.data.ref.parent?.parent?.key);
    })
    .it("should have data", () => {
      expectEq(event.data.val(), "created");
    })
    .run(event.params.testId, event.data);
});

export const databasetestsDeleted = onValueDeleted(
  "/v2tests/{testId}/db/deleted",
  async (event) => {
    // First write a value to be deleted
    const db = admin.database();
    await db.ref(`/v2tests/${event.params.testId}/db/toDelete`).set("willBeDeleted");

    return new TestSuite("database onValueDeleted")
      .it("should have path", () => {
        expectEq(event.params.testId, event.data.ref.parent?.parent?.key);
      })
      .it("should have previous data", () => {
        expectEq(event.data.val(), "willBeDeleted");
      })
      .run(event.params.testId, event.data);
  }
);

export const databasetestsUpdated = onValueUpdated("/v2tests/{testId}/db/updated", (event) => {
  return new TestSuite("database onValueUpdated")
    .it("should have path", () => {
      expectEq(event.params.testId, event.data.after.ref.parent?.parent?.key);
    })
    .it("should have new data", () => {
      expectEq(event.data.after.val(), "updated");
    })
    .it("should have old data", () => {
      expectEq(event.data.before.val(), "original");
    })
    .run(event.params.testId, event.data);
});
