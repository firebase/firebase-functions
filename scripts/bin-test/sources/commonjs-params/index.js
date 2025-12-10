const { defineInt } = require("firebase-functions/params");
const { onRequest } = require("firebase-functions/v2/https");

const minInstances = defineInt("MIN_INSTANCES", { default: 1 });

exports.v2http = onRequest({ minInstances }, (req, res) => {
    res.send("PASS");
});
