const functions = require("../../../../src/index");

exports.scheduled = functions.pubsub.schedule('every 5 minutes').onRun(() => {
    return "PASS";
});
