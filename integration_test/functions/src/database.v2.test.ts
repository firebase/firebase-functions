import { describe, it, beforeAll, expect } from "vitest";
import { database, RUN_ID, waitForEvent } from "./utils";
import {
  expectCloudEvent,
  expectDatabaseEvent,
  expectDataSnapshot,
} from "./assertions/database";

describe("database.v2", () => {
  describe("onValueCreated", () => {
    let data: any;
    let refPath: string;

    beforeAll(async () => {
      data = await waitForEvent("onValueCreated", async () => {
        const testData = {
          foo: "bar",
          number: 42,
          nested: {
            key: "value",
          },
        };
        refPath = `integration_test/${RUN_ID}/onValueCreated/${Date.now()}`;
        await database.ref(refPath).set(testData);
      });
    }, 60_000);

    it("should be a CloudEvent", () => {
      expectCloudEvent(data);
    });

    it("should be a DatabaseEvent", () => {
      expectDatabaseEvent(data, "onValueCreated", refPath);
    });

    it("should have a DataSnapshot", () => {
      expectDataSnapshot(data.eventData, refPath);
    });

    it("should have the correct data", () => {
      const value = data.eventData.json;
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
      data = await waitForEvent("onValueUpdated", async () => {
        const initialData = {
          foo: "bar",
          number: 42,
          nested: {
            key: "value",
          },
        };
        refPath = `integration_test/${RUN_ID}/onValueUpdated/${Date.now()}`;
        await database.ref(refPath).set(initialData);
        await new Promise((resolve) => setTimeout(resolve, 3000));
        await database.ref(refPath).update({
          foo: "baz",
          number: 100,
        });
      });
    }, 60_000);

    it("should be a CloudEvent", () => {
      expectCloudEvent(data);
    });

    it("should be a DatabaseEvent", () => {
      expectDatabaseEvent(data, "onValueUpdated", refPath);
    });

    it("should be a Change event with snapshots", () => {
      const before = data.eventData.before;
      const after = data.eventData.after;
      expectDataSnapshot(before, refPath);
      expectDataSnapshot(after, refPath);
    });

    it("before event should have the correct data", () => {
      const value = data.eventData.before.json;
      expect(value.foo).toBe("bar");
      expect(value.number).toBe(42);
      expect(value.nested).toBeDefined();
      expect(value.nested.key).toBe("value");
    });

    it("after event should have the correct data", () => {
      const value = data.eventData.after.json;
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
      data = await waitForEvent("onValueDeleted", async () => {
        const testData = {
          foo: "bar",
          number: 42,
          nested: {
            key: "value",
          },
        };
        refPath = `integration_test/${RUN_ID}/onValueDeleted/${Date.now()}`;
        await database.ref(refPath).set(testData);
        await new Promise((resolve) => setTimeout(resolve, 3000));
        await database.ref(refPath).remove();
      });
    }, 60_000);

    it("should be a CloudEvent", () => {
      expectCloudEvent(data);
    });

    it("should be a DatabaseEvent", () => {
      expectDatabaseEvent(data, "onValueDeleted", refPath);
    });

    it("should have a DataSnapshot", () => {
      expectDataSnapshot(data.eventData, refPath);
    });

    it("should have the correct data", () => {
      const value = data.eventData.json;
      expect(value.foo).toBe("bar");
      expect(value.number).toBe(42);
      expect(value.nested).toBeDefined();
      expect(value.nested.key).toBe("value");
    });
  });
});

