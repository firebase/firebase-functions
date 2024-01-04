import { onConfigUpdated } from "firebase-functions/v2/remoteConfig";
import * as admin from "firebase-admin";
import { REGION } from "../region";

export const remoteConfigOnConfigUpdatedTests = onConfigUpdated(
  {
    region: REGION,
  },
  async (event) => {
    const testId = event.data.description;
    try {
      await admin
        .firestore()
        .collection("remoteConfigOnConfigUpdatedTests")
        .doc(testId)
        .set({
          event: JSON.stringify(event),
        });
    } catch (error) {
      console.error(`Error in RemoteConfig onConfigUpdated function for testId: ${testId}`, error);
    }
  }
);
