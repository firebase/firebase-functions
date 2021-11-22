const functions = require("../../../../src/index");

exports.v1http = functions.https.onRequest((req, resp) => {
    resp.status(200).send("PASS");
})

exports.g1 = require("./g1");
