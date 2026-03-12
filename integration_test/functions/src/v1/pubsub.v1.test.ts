import { PubSub } from "@google-cloud/pubsub";
import { beforeAll, describe, expect, it } from "vitest";
import { expectEventContext } from "../assertions";
import { config } from "../config";
import { waitForEvent } from "../utils";

describe("pubsub.v1", () => {
  describe("onMessagePublished", () => {
    let data: any;

    beforeAll(async () => {
      data = await waitForEvent("onMessagePublishedV1", async () => {
        const pubsub = new PubSub({
          projectId: config.projectId,
        });

        const [topic] = await pubsub.topic("vitest_message_v1").get({ autoCreate: true });

        await topic.publishMessage({
          data: Buffer.from("Hello, world!"),
        });
      });
    }, 60_000);

    it("should have EventContext", () => {
      expectEventContext(data);
    });

    it("should be a valid Message", () => {
      expect(data.message).toBeDefined();
      expect(data.message.attributes).toBeDefined();
      // Sent as base64 string so need to decode it.
      expect(Buffer.from(data.message.data, "base64").toString("utf-8")).toBe("Hello, world!");
    });
  });
});
