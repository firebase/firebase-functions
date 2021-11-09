const functions = require("../../../../src/index");

exports.v1callable = functions.https.onCall((_data, _ctx) => {
    return "PASS";
})
