import * as admin from "firebase-admin";
import { onCustomEventPublished } from "firebase-functions/v2/eventarc";

export const eventarcOnCustomEventPublishedTests = onCustomEventPublished(
  "achieved-leaderboard",
  async (event) => {
    const testId = event.data.testId;

    await admin
      .firestore()
      .collection("eventarcOnCustomEventPublishedTests")
      .doc(testId)
      .set({
        id: event.id,
        type: event.type,
        time: event.time,
        source: event.source,
        data: JSON.stringify(event.data),
      });
  }
);
