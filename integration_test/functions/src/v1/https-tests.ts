import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1";
import { REGION } from "../region";
import { sanitizeData } from "../utils";

export const httpsOnCallTests: any = functions
  .runWith({ invoker: "private" })
  .region(REGION)
  .https.onCall(async (data) => {
    await admin
      .firestore()
      .collection("httpsOnCallTests")
      .doc(data?.testId)
      .set(sanitizeData(data));
  });

export const httpsOnRequestTests: any = functions
  .runWith({ invoker: "private" })
  .region(REGION)
  .https.onRequest(async (req: functions.https.Request) => {
    const data = req?.body.data;
    await admin
      .firestore()
      .collection("httpsOnRequestTests")
      .doc(data?.testId)
      .set(sanitizeData(data));
  });
