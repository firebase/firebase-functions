import { describe, it, beforeAll, expect } from "vitest";
import { RUN_ID, waitForEvent } from "../utils";
import { database } from "../firebase.server";
import { expectDataSnapshot } from "../assertions/database";

describe("database.v1", () => {
  describe("onValueCreated", () => {
    let data: any;
    let refPath: string;

    beforeAll(async () => {
      data = await waitForEvent("onValueCreatedV1", async () => {
        const testData = {
          foo: "bar",
          number: 42,
          nested: {
            key: "value",
          },
        };
        refPath = `integration_test/${RUN_ID}/onValueCreatedV1/${Date.now()}`;
        await database.ref(refPath).set(testData);
      });
    }, 60_000);

    it("should have a DataSnapshot", () => {
      expectDataSnapshot(data, refPath);
    });

    it("should have the correct data", () => {
      const value = data.json;
      expect(value.foo).toBe("bar");
      expect(value.number).toBe(42);
      expect(value.nested).toBeDefined();
      expect(value.nested.key).toBe("value");
    });
  });

  describe("onValueUpdated", () => {
    let data: any;
    let refPath: string;

    beforeAll(async () => {
      data = await waitForEvent("onValueUpdatedV1", async () => {
        const initialData = {
          foo: "bar",
          number: 42,
          nested: {
            key: "value",
          },
        };
        refPath = `integration_test/${RUN_ID}/onValueUpdatedV1/${Date.now()}`;
        await database.ref(refPath).set(initialData);
        await new Promise((resolve) => setTimeout(resolve, 3000));
        await database.ref(refPath).update({
          foo: "baz",
          number: 100,
        });
      });
    }, 60_000);

    it("should be a Change event with snapshots", () => {
      const before = data.before;
      const after = data.after;
      expectDataSnapshot(before, refPath);
      expectDataSnapshot(after, refPath);
    });

    it("before event should have the correct data", () => {
      const value = data.before.json;
      expect(value.foo).toBe("bar");
      expect(value.number).toBe(42);
      expect(value.nested).toBeDefined();
      expect(value.nested.key).toBe("value");
    });

    it("after event should have the correct data", () => {
      const value = data.after.json;
      expect(value.foo).toBe("baz");
      expect(value.number).toBe(100);
      expect(value.nested).toBeDefined();
      expect(value.nested.key).toBe("value");
    });
  });

  describe("onValueDeleted", () => {
    let data: any;
    let refPath: string;

    beforeAll(async () => {
      data = await waitForEvent("onValueDeletedV1", async () => {
        const testData = {
          foo: "bar",
          number: 42,
          nested: {
            key: "value",
          },
        };
        refPath = `integration_test/${RUN_ID}/onValueDeletedV1/${Date.now()}`;
        await database.ref(refPath).set(testData);
        await new Promise((resolve) => setTimeout(resolve, 3000));
        await database.ref(refPath).remove();
      });
    }, 60_000);

    it("should have a DataSnapshot", () => {
      expectDataSnapshot(data, refPath);
    });

    it("should have the correct data", () => {
      const value = data.json;
      expect(value.foo).toBe("bar");
      expect(value.number).toBe(42);
      expect(value.nested).toBeDefined();
      expect(value.nested.key).toBe("value");
    });
  });
});

