import * as admin from "firebase-admin";
import { onCustomEventPublished } from "firebase-functions/v2/eventarc";
import { REGION } from "../region";

export const eventarcOnCustomEventPublishedTests = onCustomEventPublished(
  {
    eventType: "custom_event_tests",
    region: REGION,
  },
  async (event) => {
    const testId = event.data.payload.testId;

    try {
      await admin
        .firestore()
        .collection("eventarcOnCustomEventPublishedTests")
        .doc(testId)
        .set({
          event: JSON.stringify(event),
        });
    } catch (error) {
      console.error(`Error creating test record for testId: ${testId}`, error);
    }
  }
);
