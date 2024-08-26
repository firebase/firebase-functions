const functions = require("../../../../src/v1/index");
const functionsv2 = require("../../../../src/v2/index");
const params = require("../../../../src/params");
params.clearParams();

const stringParam = params.defineString("STRING_PARAM");
const intParam = params.defineInt("INT_PARAM");
const boolParam = params.defineBoolean("BOOLEAN_PARAM");

exports.v1http = functions.runWith({
  minInstances: intParam,
  maxInstances: intParam,
  memory: intParam,
  timeoutSeconds: intParam,
  serviceAccount: stringParam,
  omit: boolParam
}).https.onRequest((req, resp) => {
  resp.status(200).send("Hello world!");
});

exports.v2http = functionsv2.https.onRequest({
  minInstances: intParam,
  maxInstances: intParam,
  memory: intParam,
  timeoutSeconds: intParam,
  serviceAccount: stringParam,
  omit: boolParam
}, (req, resp) => {
  resp.status(200).send("Hello world!");
});
