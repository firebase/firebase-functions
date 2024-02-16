import { onConfigUpdated } from "firebase-functions/v2/remoteConfig";
import * as admin from "firebase-admin";
import { REGION } from "../region";

export const remoteConfigOnConfigUpdatedTests = onConfigUpdated(
  {
    region: REGION,
  },
  async (event) => {
    const testId = event.data.description;

    await admin.firestore().collection("remoteConfigOnConfigUpdatedTests").doc(testId).set({
      testId,
      type: event.type,
      id: event.id,
      time: event.time,
    });
  }
);
