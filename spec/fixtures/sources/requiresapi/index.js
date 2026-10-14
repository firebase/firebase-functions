const { requiresAPI } = require("../../../../src/v2");
const functions = require("../../../../src/v1");

requiresAPI("some-api.googleapis.com", "Needed for some reason");

exports.v1http = functions.https.onRequest((req, resp) => {
    resp.status(200).send("PASS");
});
