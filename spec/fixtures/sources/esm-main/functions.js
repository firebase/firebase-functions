import * as functions from "../../../../lib/index.js";

export const v1http = functions.https.onRequest((req, resp) => {
    resp.status(200).send("PASS");
})

export const v1callable = functions.https.onCall(() => {
    return "PASS";
})
