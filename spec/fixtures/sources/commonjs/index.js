const functions = require("../../../../src/index");

exports.v1http = functions.https.onRequest((_req, resp) => {
    resp.status(200).send("PASS");
})

exports.v1callable = functions.https.onCall((_data, _ctx) => {
    return "PASS";
})