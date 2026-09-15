import * as functions from "firebase-functions/v1";

const func = functions.https.onRequest((req, resp) => {
    resp.status(200).send("PASS");
});

export { func as "dummystore-bot" };
