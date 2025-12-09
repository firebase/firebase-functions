import { describe, it, beforeAll, expect } from "vitest";
import { getEventarc } from "firebase-admin/eventarc";
import { RUN_ID, waitForEvent } from "./utils";
import { expectCloudEvent } from "./assertions";

const eventarc = getEventarc();
const channel = eventarc.channel();

describe("eventarc.v2", () => {
  describe("onCustomEventPublished", () => {
    let data: any;

    beforeAll(async () => {
      data = await waitForEvent("onCustomEventPublished", async () => {
        await channel.publish({
          type: "vitest-test",
          source: RUN_ID,
          subject: "Foo",
          data: {
            foo: "bar",
          },
        });
      });
    }, 60_000);

    it("should be a CloudEvent", () => {
      expectCloudEvent(data);
    });

    it("should have the correct event type", () => {
      expect(data.type).toBe("vitest-test");
    });

    it("should have the correct data", () => {
      const eventData = JSON.parse(data.eventData);
      expect(eventData.foo).toBe("bar");
    });
  });
});
