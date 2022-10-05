const functions = require("firebase-functions");
const functionsv2 = require("firebase-functions/v2");

exports.v1http = functions.https.onRequest((req, resp) => {
  resp.status(200).send("PASS");
});

exports.v1httpPreserve = functions
  .runWith({ preserveExternalChanges: true })
  .https.onRequest((req, resp) => {
    resp.status(200).send("PASS");
  });

functionsv2.setGlobalOptions({ preserveExternalChanges: true });

exports.v2http = functionsv2.https.onRequest((req, resp) => {
  resp.status(200).send("PASS");
});
