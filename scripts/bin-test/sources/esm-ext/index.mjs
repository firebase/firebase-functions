import * as functions from "firebase-functions";
import * as functionsv2 from "firebase-functions/v2";

export const v1http = functions.https.onRequest((req, resp) => {
  resp.status(200).send("PASS");
});

export const v1callable = functions.https.onCall(() => {
  return "PASS";
});

export const v2http = functionsv2.https.onRequest((req, resp) => {
  resp.status(200).send("PASS");
});

export const v2callable = functionsv2.https.onCall(() => {
  return "PASS";
});
