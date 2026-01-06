import { onCustomEventPublished } from "firebase-functions/eventarc";
import { serializeCloudEvent } from "../serializers";
import { sendEvent } from "../utils";

export const test = {
  eventarcOnCustomEventPublishedTrigger: onCustomEventPublished(
    {
      eventType: "vitest-test",
    },
    async (event) => {
      await sendEvent("onCustomEventPublished", {
        ...serializeCloudEvent(event),
        eventData: JSON.stringify(event.data),
      });
    }
  ),
};
