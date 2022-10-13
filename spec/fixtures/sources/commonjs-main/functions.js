const functions = require("../../../../src/v1");
const functionsv2 = require("../../../../src/v2");

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
