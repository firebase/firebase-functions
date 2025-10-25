import * as functions from "firebase-functions";
import { defineJSONSecret } from "firebase-functions/params";

const config = defineJSONSecret("MY_CONFIG");
const isolated = defineJSONSecret("ISOLATED_SECRET");

functions.setGlobalOptions({
  secrets: [config],
});

exports.good = functions.runWith({ secrets: [isolated] }).https.onCall(async () => {
  // Accesses both the global secret and the local secret.
  console.log(config.value().projectId);
  console.log(isolated.value());
});

exports.bad = functions.https.onCall(() => {
  // Uses the global secret, but forgets to bind it locally.
  console.log(config.value().apiKey);
});
