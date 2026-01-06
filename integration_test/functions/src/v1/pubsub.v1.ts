import * as functions from "firebase-functions/v1";
import { sendEvent } from "../utils";

export const test = {
  pubsubV1OnMessagePublishedTrigger: functions.pubsub
    .topic("vitest_message_v1")
    .onPublish(async (message, event) => {
      await sendEvent("onMessagePublishedV1", {
        ...event,
        message: message.toJSON(),
      });
    }),
};
