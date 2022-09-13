const functions = require("../../../../src/v1/index");
const functionsv2 = require("../../../../src/v2/index");
const params = require("../../../../src/params");

params.defineString("BORING");
const foo = params.defineString("FOO", { input: { text: { validationRegex: "w+" } } });
const bar = params.defineString("BAR", { default: foo , label: "asdf" });
params.defineString("BAZ", { input: { select: { options: [{ value: "a" }, { value: "b" }] } } });

params.defineInt("AN_INT", { default: bar.equals("qux").then(0, 1) });
params.defineInt("ANOTHER_INT", {
  input: {
    select: {
      options: [
        { label: "a", value: -2 },
        { label: "b", value: 2 },
      ],
    },
  },
});

params.defineSecret("SUPER_SECRET_FLAG");

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
