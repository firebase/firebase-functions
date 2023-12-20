import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { REGION } from "../region";
import { sanitizeData } from "../utils";

export const httpsOnCallTests: any = functions
  .runWith({ invoker: "private" })
  .region(REGION)
  .https.onCall(async (data) => {
    try {
      await admin
        .firestore()
        .collection("httpsOnCallTests")
        .doc(data?.testId)
        .set(sanitizeData(data));
    } catch (error) {
      console.error(`Error in Https onCall function for testId: ${data?.testId}`, error);
    }
  });

export const httpsOnRequestTests: any = functions
  .runWith({ invoker: "private" })
  .region(REGION)
  .https.onRequest(async (req: functions.https.Request) => {
    const data = req?.body.data;
    try {
      await admin
        .firestore()
        .collection("httpsOnRequestTests")
        .doc(data?.testId)
        .set(sanitizeData(data));
    } catch (error) {
      console.error(`Error in Https onRequest function for testId: ${data?.testId}`, error);
    }
  });
