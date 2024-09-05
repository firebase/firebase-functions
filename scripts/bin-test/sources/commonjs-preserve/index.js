const functions = require("firebase-functions/v1");
const functionsv2 = require("firebase-functions/v2");
const firestoreTranslateText = require("@firebase-extensions/firebase-firestore-translate-text-sdk").firestoreTranslateText;
const backfill = require("@firebase-extensions/local-backfill-sdk").backfill;

exports.v1http = functions.https.onRequest((req, resp) => {
  resp.status(200).send("PASS");
});

exports.v1httpPreserve = functions
  .runWith({ preserveExternalChanges: true })
  .https.onRequest((req, resp) => {
    resp.status(200).send("PASS");
  });

functionsv2.setGlobalOptions({ preserveExternalChanges: true });

exports.v2http = functionsv2.https.onRequest((req, resp) => {
  resp.status(200).send("PASS");
});

// A Firebase extension by ref
const extRef1 = firestoreTranslateText("extRef1", {
  "COLLECTION_PATH": "collection1",
  "INPUT_FIELD_NAME": "input1",
  "LANGUAGES": "de,es",
  "OUTPUT_FIELD_NAME": "translated",
  "_EVENT_ARC_REGION": "us-central1",
  "_FUNCTION_LOCATION": "us-central1",
});
exports.extRef1 = extRef1;

// A Firebase function defined by extension event
const ttOnStart = extRef1.onStart((event) => {
  console.log("onStart got event: " + JSON.stringify(event, null, 2));
});
exports.ttOnStart = ttOnStart;

// A Firebase extension by localPath
exports.extLocal2 = backfill("extLocal2", {
  DO_BACKFILL: "False",
  LOCATION: "us-central1",
});