import * as functions from "firebase-functions";
import * as functionsv2 from "firebase-functions/v2";
import { firestoreTranslateText } from "@firebase-extensions/firebase-firestore-translate-text-sdk";
import { backfill } from "@firebase-extensions/local-backfill-sdk";

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

// A Firebase extension by ref
export const extRef1 = firestoreTranslateText("extRef1", {
  "COLLECTION_PATH": "collection1",
  "INPUT_FIELD_NAME": "input1",
  "LANGUAGES": "de,es",
  "OUTPUT_FIELD_NAME": "translated",
  "_EVENT_ARC_REGION": "us-central1",
  "_FUNCTION_LOCATION": "us-central1",
});

// A Firebase function defined by extension event
export const ttOnStart = extRef1.onStart((event) => {
  console.log("onStart got event: " + JSON.stringify(event, null, 2));
});

// A Firebase extension by localPath
export const extLocal2 = backfill("extLocal2", {
  DO_BACKFILL: "False",
  LOCATION: "us-central1",
});