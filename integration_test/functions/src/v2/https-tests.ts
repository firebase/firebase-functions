import { onCall, onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { REGION } from "../region";

export const httpsOnCallV2Tests = onCall(
  {
    invoker: "private",
    region: REGION,
  },
  async (req) => {
    const data = req?.data;
    await admin.firestore().collection("httpsOnCallV2Tests").doc(data?.testId).set(data);
  }
);

export const httpsOnRequestV2Tests = onRequest(
  {
    invoker: "private",
    region: REGION,
  },
  async (req) => {
    const data = req?.body.data;

    await admin.firestore().collection("httpsOnRequestV2Tests").doc(data?.testId).set(data);
  }
);
