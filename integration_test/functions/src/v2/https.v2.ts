import { onCall, onRequest } from "firebase-functions/v2/https";
import { sendEvent } from "../utils";

export const httpsOnCallTrigger = onCall(
  {
    invoker: "public",
  },
  async (request, response) => {
    await sendEvent("httpsOnCall", {
      acceptsStreaming: request.acceptsStreaming,
      data: request.data,
    });

    if (request.acceptsStreaming) {
      await response?.sendChunk("onCallStreamed");
    }

    return "onCall";
  }
);

export const httpsOnRequestTrigger = onRequest(
  {
    invoker: "public",
  },
  async (req, res) => {
    await sendEvent("httpsOnRequest", req.body);
    res.status(201).send("onRequest");
    return;
  }
);

export const test = {
  httpsOnCallTrigger,
  httpsOnRequestTrigger,
};
