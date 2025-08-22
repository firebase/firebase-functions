import * as functionsv2 from "firebase-functions/v2";

const { fn } = await import('./exports.js');

export const v2http = functionsv2.https.onRequest((req, resp) => {
    fn()
    resp.status(200).send("PASS");
});
