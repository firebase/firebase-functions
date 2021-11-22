const functions = require("../../../../src/index");

exports.v1callable = functions.https.onCall(() => {
    return "PASS";
})
