import { defineInt } from "firebase-functions/params";
import { onRequest } from "firebase-functions/v2/https";

const minInstances = defineInt("MIN_INSTANCES", { default: 1 });

export const v2http = onRequest({ minInstances }, (req, res) => {
    res.send("PASS");
});
