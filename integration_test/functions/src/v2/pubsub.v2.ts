import { onMessagePublished } from "firebase-functions/v2/pubsub";
import { sendEvent } from "../utils";
import { serializeCloudEvent } from "../serializers";

export const pubsubOnMessagePublishedTrigger = onMessagePublished(
  {
    topic: "vitest_message",
  },
  async (event) => {
    await sendEvent("onMessagePublished", {
      ...serializeCloudEvent(event),
      message: {
        messageId: event.data.message.messageId,
        publishTime: event.data.message.publishTime,
        data: Buffer.from(event.data.message.data, "base64").toString("utf-8"),
        attributes: event.data.message.attributes,
        orderingKey: event.data.message.orderingKey,
      },
    });
  }
);
