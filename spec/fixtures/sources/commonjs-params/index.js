const functions = require("../../../../src/index");
const functionsv2 = require("../../../../src/v2/index");
const params = require("../../../../src/v2/params");

params.defineString("BORING");
params.defineString("FOO", {textInput: {validationRegex:"\w+"}})
params.defineString("BAR", {default: "{{ params.FOO }}", label: "asdf"});
params.defineString("BAZ", {selectInput: {select: [{value: "a"}, {value: "b"}]}})

params.defineInt("AN_INT", {default: 22})
params.defineInt("ANOTHER_INT", {selectInput: {select: [{label: "a", value: -2}, {"label": "b", value: 2}]}})

params.defineSecretParam("SUPER_SECRET_FLAG")

exports.v1http = functions.https.onRequest((req, resp) => {
    resp.status(200).send("PASS");
});

exports.v1callable = functions.https.onCall(() => {
    return "PASS";
});

exports.v2http = functionsv2.https.onRequest((req, resp) => {
    resp.status(200).send("PASS");
});

exports.v2callable = functionsv2.https.onCall(() => {
    return "PASS";
});
