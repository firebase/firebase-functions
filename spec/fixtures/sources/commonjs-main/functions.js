const functions = require("../../../../src/v1");
const functionsv2 = require("../../../../src/v2");
const firestoreTranslateText = require("../../extsdk/translate").firestoreTranslateText;
const backfill = require("../../extsdk/local").backfill;

exports.v1http = functions.https.onRequest((req, resp) => {
    resp.status(200).send("PASS");
});

exports.v1callable = functions.https.onCall(() => {
    return "PASS";
});

exports.v2http = functionsv2.https.onRequest((req, resp) => {
    resp.status(200).send("PASS");
});

exports.v2callable = functionsv2.https.onCall(() => {
    return "PASS";
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
const extLocal2 = backfill("extLocal2", {
    DO_BACKFILL: "False",
    LOCATION: "us-central1",
});
exports.extLocal2 = extLocal2;