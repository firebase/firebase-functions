const functions = require("../../../lib/v2");

exports.httpFunction = functions.https.onRequest((req, res) => {
  res.status(200).send("HTTP OK");
});

exports.pubsubMessage = functions.pubsub.onMessagePublished("integration-test-topic", (event) => {
  console.log(
    "pubsubMessage invoked for",
    event.data?.message?.attributes?.source ?? "unknown"
  );
});
