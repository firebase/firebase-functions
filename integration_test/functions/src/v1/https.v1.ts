import * as functions from "firebase-functions/v1";
import { sendEvent } from "../utils";

export const httpsV1OnCallTrigger = functions
  .runWith({ invoker: "public" })
  .https.onCall(async (data) => {
    await sendEvent("httpsOnCallV1", {
      data: data,
    });

    return "onCallV1";
  });

export const httpsV1OnRequestTrigger = functions
  .runWith({ invoker: "public" })
  .https.onRequest(async (req, res) => {
    await sendEvent("httpsOnRequestV1", req.body);
    res.status(201).send("onRequestV1");
    return;
  });

export const test = {
  httpsV1OnCallTrigger,
  httpsV1OnRequestTrigger,
};
