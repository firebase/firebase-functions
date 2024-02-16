import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { onMessagePublished } from "firebase-functions/v2/pubsub";
import { REGION } from "../region";
import { sanitizeData } from "../utils";

export const pubsubOnMessagePublishedTests = onMessagePublished(
  {
    topic: "custom_message_tests",
    region: REGION,
  },
  async (event) => {
    let testId = event.data.message.json?.testId;
    if (!testId) {
      functions.logger.error("TestId not found for onMessagePublished function execution");
      return;
    }

    await admin
      .firestore()
      .collection("pubsubOnMessagePublishedTests")
      .doc(testId)
      .set(
        sanitizeData({
          id: event.id,
          source: event.source,
          subject: event.subject,
          time: event.time,
          type: event.type,
          message: JSON.stringify(event.data.message),
        })
      );
  }
);
