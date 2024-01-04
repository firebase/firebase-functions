import * as admin from "firebase-admin";
import { onMessagePublished } from "firebase-functions/v2/pubsub";
import { REGION } from "../region";

export const pubsubOnMessagePublishedTests = onMessagePublished(
  {
    topic: "custom_message_tests",
    region: REGION,
  },
  async (event) => {
    let testId = event.data.message.json?.testId;
    if (!testId) {
      console.error("TestId not found for onMessagePublished function execution");
      return;
    }
    try {
      await admin
        .firestore()
        .collection("pubsubOnMessagePublishedTests")
        .doc(testId)
        .set({
          event: JSON.stringify(event),
        });
    } catch (error) {
      console.error(`Error in Pub/Sub onMessagePublished function for testId: ${testId}`, error);
    }
  }
);
