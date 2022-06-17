const functions = require("../../../../src/v1");

exports.groupedhttp = functions.https.onRequest((req, resp) => {
    resp.status(200).send("PASS");
});

exports.groupedcallable = functions.https.onCall(() => {
    return "PASS";
});
