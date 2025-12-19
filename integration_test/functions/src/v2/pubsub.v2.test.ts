import { describe, it, beforeAll, expect, assertType } from "vitest";
import { PubSub } from "@google-cloud/pubsub";
import { waitForEvent } from "../utils";
import { expectCloudEvent } from "../assertions/identity";
import { config } from "../config";

describe("pubsub.v2", () => {
  describe("onMessagePublished", () => {
    let data: any;

    beforeAll(async () => {
      data = await waitForEvent("onMessagePublished", async () => {
        const pubsub = new PubSub({
          projectId: config.projectId,
        });

        const [topic] = await pubsub.topic("vitest_message").get({ autoCreate: true });

        await topic.publishMessage({
          data: Buffer.from("Hello, world!"),
        });
      });
    }, 60_000);

    it("should be a CloudEvent", () => {
      expectCloudEvent(data);
    });

    it("should be a valid Message", () => {
      expect(data.message).toBeDefined();
      expect(data.message.messageId).toBeDefined();
      assertType<string>(data.message.messageId);
      expect(data.message.messageId.length).toBeGreaterThan(0);
      expect(data.message.publishTime).toBeDefined();
      expect(Date.parse(data.message.publishTime)).toBeGreaterThan(0);
      expect(data.message.data).toBe("Hello, world!");
      expect(data.message.attributes).toBeDefined(); // Empty object
      expect(data.message.orderingKey).toBeDefined();
      assertType<string>(data.message.orderingKey);
    });
  });
});
