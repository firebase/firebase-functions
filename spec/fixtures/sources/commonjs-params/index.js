const functions = require("../../../../src/v1/index");
const functionsv2 = require("../../../../src/v2/index");
const firestoreTranslateText = require("../../extsdk/translate").firestoreTranslateText;
const backfill = require("../../extsdk/local").backfill;
const params = require("../../../../src/params");

params.defineString("BORING");
const foo = params.defineString("FOO", { input: { text: { validationRegex: "w+" } } });
const bar = params.defineString("BAR", { default: foo, label: "asdf" });
params.defineString("BAZ", { input: { select: { options: [{ value: "a" }, { value: "b" }] } } });

params.defineInt("AN_INT", { default: bar.equals("qux").thenElse(0, 1) });
params.defineInt("ANOTHER_INT", {
  input: {
    select: {
      options: [
        { label: "a", value: -2 },
        { label: "b", value: 2 },
      ],
    },
  },
});

params.defineList("LIST_PARAM", {input: { multiSelect: { options: [{ value: "c" }, { value: "d" }, { value: "e" }]}}})

params.defineSecret("SUPER_SECRET_FLAG");

// N.B: invocation of the precanned internal params should not affect the manifest

exports.v1http = functions.https.onRequest((req, resp) => {
  resp.status(200).send(params.projectID);
});

exports.v1callable = functions.https.onCall(() => {
  return params.databaseURL;
});

exports.v2http = functionsv2.https.onRequest((req, resp) => {
  resp.status(200).send(params.gcloudProject);
});

exports.v2callable = functionsv2.https.onCall(() => {
  return params.databaseURL;
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
