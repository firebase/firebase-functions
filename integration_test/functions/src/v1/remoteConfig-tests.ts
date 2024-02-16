import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { REGION } from "../region";
import { sanitizeData } from "../utils";

export const remoteConfigOnUpdateTests: any = functions
  .region(REGION)
  .remoteConfig.onUpdate(async (version, context) => {
    const testId = version.description;
    await admin
      .firestore()
      .collection("remoteConfigOnUpdateTests")
      .doc(testId)
      .set(sanitizeData(context));
  });
