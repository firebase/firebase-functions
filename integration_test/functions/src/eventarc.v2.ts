import { onCustomEventPublished } from "firebase-functions/eventarc";
import { sendEvent } from "./utils";
import { serializeCloudEvent } from "./serializers";

export const eventarcOnCustomEventPublishedTrigger = onCustomEventPublished(
  {
    eventType: "vitest-test",
  },
  async (event) => {
    await sendEvent("onCustomEventPublished", {
      ...serializeCloudEvent(event),
      eventData: JSON.stringify(event.data),
    });
  }
);
