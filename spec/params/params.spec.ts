import { expect } from "chai";
import * as params from "../../src/params";

describe("Params spec extraction", () => {
  it("converts Expressions in the param default to strings", () => {
    const bar = params.defineInt("BAR");
    expect(
      params.defineString("FOO", { default: bar.notEquals(22).thenElse("asdf", "jkl;") }).toSpec()
        .default
    ).to.equal(`{{ params.BAR != 22 ? "asdf" : "jkl;" }}`);
  });

  it("converts RegExps in string validation parameters to strings", () => {
    const foo = params.defineString("FOO", { input: { text: { validationRegex: /\d{5}/ } } });
    expect(foo.toSpec().input).to.deep.equal({ text: { validationRegex: "\\d{5}" } });
  });
});

describe("Params value extraction", () => {
  beforeEach(() => {
    process.env.A_STRING = "asdf";
    process.env.SAME_STRING = "asdf";
    process.env.DIFF_STRING = "jkl;";
    process.env.AN_INT = "-11";
    process.env.SAME_INT = "-11";
    process.env.DIFF_INT = "22";
    process.env.PI = "3.14159";
    process.env.TRUE = "true";
    process.env.FALSE = "false";
    process.env.LIST = JSON.stringify(["a", "b", "c"]);
    process.env.BAD_LIST = JSON.stringify(["a", 22, "c"]);
    process.env.ESCAPED_LIST = JSON.stringify(["f\to\no"]);
    process.env.A_SECRET_STRING = "123456supersecret";
    process.env.STRIPE_CONFIG = JSON.stringify({
      apiKey: "sk_test_123",
      webhookSecret: "whsec_456",
      clientId: "ca_789",
    });
    process.env.INVALID_JSON_SECRET = "not valid json{";
  });

  afterEach(() => {
    params.clearParams();
    delete process.env.A_STRING;
    delete process.env.SAME_STRING;
    delete process.env.DIFF_STRING;
    delete process.env.AN_INT;
    delete process.env.SAME_INT;
    delete process.env.DIFF_INT;
    delete process.env.TRUE;
    delete process.env.PI;
    delete process.env.TRUE;
    delete process.env.FALSE;
    delete process.env.LIST;
    delete process.env.BAD_LIST;
    delete process.env.ESCAPED_LIST;
    delete process.env.A_SECRET_STRING;
    delete process.env.STRIPE_CONFIG;
    delete process.env.INVALID_JSON_SECRET;
  });

  it("extracts identity params from the environment", () => {
    const strParam = params.defineString("A_STRING");
    expect(strParam.value()).to.equal("asdf");

    const intParam = params.defineInt("AN_INT");
    expect(intParam.value()).to.equal(-11);

    const boolParam = params.defineBoolean("TRUE");
    expect(boolParam.value()).to.be.true;

    const floatParam = params.defineFloat("PI");
    expect(floatParam.value()).to.equal(3.14159);

    const falseParam = params.defineBoolean("FALSE");
    expect(falseParam.value()).to.be.false;

    const listParam = params.defineList("LIST");
    expect(listParam.value()).to.deep.equal(["a", "b", "c"]);

    const listParamWithEscapes = params.defineList("ESCAPED_LIST");
    expect(listParamWithEscapes.value()).to.deep.equal(["f\to\no"]);
    const secretParam = params.defineSecret("A_SECRET_STRING");
    expect(secretParam.value()).to.equal("123456supersecret");

    const jsonSecretParam = params.defineJsonSecret("STRIPE_CONFIG");
    const secretValue = jsonSecretParam.value();
    expect(secretValue).to.deep.equal({
      apiKey: "sk_test_123",
      webhookSecret: "whsec_456",
      clientId: "ca_789",
    });
  });

  it("extracts the special case internal params from env.FIREBASE_CONFIG", () => {
    process.env.FIREBASE_CONFIG = JSON.stringify({
      projectId: "foo",
      storageBucket: "foo.appspot.com",
      databaseURL: "https://foo.firebaseio.com",
    });
    expect(params.databaseURL.value()).to.equal("https://foo.firebaseio.com");
    expect(params.gcloudProject.value()).to.equal("foo");
    expect(params.projectID.value()).to.equal("foo");
    expect(params.storageBucket.value()).to.equal("foo.appspot.com");

    process.env.FIREBASE_CONFIG = JSON.stringify({ projectId: "foo" });
    expect(params.databaseURL.value()).to.equal("");
    expect(params.gcloudProject.value()).to.equal("foo");
    expect(params.projectID.value()).to.equal("foo");
    expect(params.storageBucket.value()).to.equal("");

    process.env.FIREBASE_CONFIG = JSON.stringify({});
    expect(params.databaseURL.value()).to.equal("");
    expect(params.gcloudProject.value()).to.equal("");
    expect(params.projectID.value()).to.equal("");
    expect(params.storageBucket.value()).to.equal("");

    delete process.env.FIREBASE_CONFIG;
  });

  it("falls back on the javascript zero values in case of type mismatch", () => {
    const stringToInt = params.defineInt("A_STRING");
    expect(stringToInt.value()).to.equal(0);

    const stringToBool = params.defineBoolean("A_STRING");
    expect(stringToBool.value()).to.equal(false);

    const listToInt = params.defineInt("LIST");
    expect(listToInt.value()).to.equal(0);
  });

  it("falls back on the javascript zero values in case a list param's is unparsable as string[]", () => {
    const notAllStrings = params.defineList("BAD_LIST");
    expect(notAllStrings.value()).to.deep.equal([]);

    const intToList = params.defineList("AN_INT");
    expect(intToList.value()).to.deep.equal([]);
  });

  it("returns a boolean value for Comparison expressions", () => {
    const str = params.defineString("A_STRING");
    const sameStr = params.defineString("SAME_STRING");
    const diffStr = params.defineString("DIFF_STRING");
    expect(str.equals(sameStr).value()).to.be.true;
    expect(str.equals("asdf").value()).to.be.true;
    expect(str.equals(diffStr).value()).to.be.false;
    expect(str.equals("jkl;").value()).to.be.false;
    expect(str.notEquals(diffStr).value()).to.be.true;
    expect(str.notEquals("jkl;").value()).to.be.true;
    expect(str.lessThan(diffStr).value()).to.be.true;
    expect(str.lessThan("jkl;").value()).to.be.true;
    expect(str.lessThanorEqualTo(diffStr).value()).to.be.true;
    expect(str.lessThanorEqualTo("jkl;").value()).to.be.true;
    expect(str.greaterThan(diffStr).value()).to.be.false;
    expect(str.greaterThan("jkl;").value()).to.be.false;
    expect(str.greaterThanOrEqualTo(diffStr).value()).to.be.false;
    expect(str.greaterThanOrEqualTo("jkl;").value()).to.be.false;

    const int = params.defineInt("AN_INT");
    const sameInt = params.defineInt("SAME_INT");
    const diffInt = params.defineInt("DIFF_INT");
    expect(int.equals(sameInt).value()).to.be.true;
    expect(int.equals(-11).value()).to.be.true;
    expect(int.equals(diffInt).value()).to.be.false;
    expect(int.equals(22).value()).to.be.false;
    expect(int.notEquals(diffInt).value()).to.be.true;
    expect(int.notEquals(22).value()).to.be.true;
    expect(int.greaterThan(diffInt).value()).to.be.false;
    expect(int.greaterThan(22).value()).to.be.false;
    expect(int.greaterThanOrEqualTo(diffInt).value()).to.be.false;
    expect(int.greaterThanOrEqualTo(22).value()).to.be.false;
    expect(int.lessThan(diffInt).value()).to.be.true;
    expect(int.lessThan(22).value()).to.be.true;
    expect(int.lessThanorEqualTo(diffInt).value()).to.be.true;
    expect(int.lessThanorEqualTo(22).value()).to.be.true;
  });

  it("can use all the comparison operators when explicitly requested", () => {
    const jkl = params.defineString("DIFF_STRING");
    expect(jkl.cmp(">", "asdf").value()).to.be.true;
    expect(jkl.cmp(">", "jkl;").value()).to.be.false;
    expect(jkl.cmp(">", "qwerty").value()).to.be.false;
    expect(jkl.cmp(">=", "asdf").value()).to.be.true;
    expect(jkl.cmp(">=", "jkl;").value()).to.be.true;
    expect(jkl.cmp(">=", "qwerty").value()).to.be.false;
    expect(jkl.cmp("<", "asdf").value()).to.be.false;
    expect(jkl.cmp("<", "jkl;").value()).to.be.false;
    expect(jkl.cmp("<", "qwerty").value()).to.be.true;
    expect(jkl.cmp("<=", "asdf").value()).to.be.false;
    expect(jkl.cmp("<=", "jkl;").value()).to.be.true;
    expect(jkl.cmp("<=", "qwerty").value()).to.be.true;

    const twentytwo = params.defineInt("DIFF_INT");
    expect(twentytwo.cmp(">", 11).value()).to.be.true;
    expect(twentytwo.cmp(">", 22).value()).to.be.false;
    expect(twentytwo.cmp(">", 33).value()).to.be.false;
    expect(twentytwo.cmp(">=", 11).value()).to.be.true;
    expect(twentytwo.cmp(">=", 22).value()).to.be.true;
    expect(twentytwo.cmp(">=", 33).value()).to.be.false;
    expect(twentytwo.cmp("<", 11).value()).to.be.false;
    expect(twentytwo.cmp("<", 22).value()).to.be.false;
    expect(twentytwo.cmp("<", 33).value()).to.be.true;
    expect(twentytwo.cmp("<=", 11).value()).to.be.false;
    expect(twentytwo.cmp("<=", 22).value()).to.be.true;
    expect(twentytwo.cmp("<=", 33).value()).to.be.true;

    const trueParam = params.defineBoolean("TRUE");
    expect(trueParam.cmp(">", true).value()).to.be.false;
    expect(trueParam.cmp(">", false).value()).to.be.true;
    expect(trueParam.cmp(">=", true).value()).to.be.true;
    expect(trueParam.cmp(">=", false).value()).to.be.true;
    expect(trueParam.cmp("<", true).value()).to.be.false;
    expect(trueParam.cmp("<", false).value()).to.be.false;
    expect(trueParam.cmp("<=", true).value()).to.be.true;
    expect(trueParam.cmp("<=", false).value()).to.be.false;
  });

  it("can test list params for equality but not < or >", () => {
    const p1 = params.defineList("LIST");
    const p2 = params.defineList("ESCAPED_LIST");

    expect(p1.equals(p1).value()).to.be.true;
    expect(p1.notEquals(p1).value()).to.be.false;
    expect(p1.equals(p2).value()).to.be.false;
    expect(p1.notEquals(p2).value()).to.be.true;

    expect(() => p1.greaterThan(p1).value()).to.throw;
  });

  it("can select the output of a ternary expression based on the comparison", () => {
    const trueExpr = params.defineString("A_STRING").equals(params.defineString("SAME_STRING"));
    expect(trueExpr.thenElse(1, 0).value()).to.equal(1);
    const falseExpr = params.defineInt("AN_INT").equals(params.defineInt("DIFF_INT"));
    expect(falseExpr.thenElse(1, 0).value()).to.equal(0);

    const twentytwo = params.defineInt("DIFF_INT");
    expect(trueExpr.thenElse(twentytwo, 0).value()).to.equal(22);
    expect(falseExpr.thenElse(1, twentytwo).value()).to.equal(22);
  });
});

describe("defineJsonSecret", () => {
  beforeEach(() => {
    process.env.VALID_JSON = JSON.stringify({ key: "value", nested: { foo: "bar" } });
    process.env.INVALID_JSON = "not valid json{";
    process.env.EMPTY_OBJECT = JSON.stringify({});
    process.env.ARRAY_JSON = JSON.stringify([1, 2, 3]);
  });

  afterEach(() => {
    params.clearParams();
    delete process.env.VALID_JSON;
    delete process.env.INVALID_JSON;
    delete process.env.EMPTY_OBJECT;
    delete process.env.ARRAY_JSON;
    delete process.env.FUNCTIONS_CONTROL_API;
  });

  it("parses valid JSON secrets correctly", () => {
    const jsonSecret = params.defineJsonSecret("VALID_JSON");
    const value = jsonSecret.value();
    expect(value).to.deep.equal({ key: "value", nested: { foo: "bar" } });
  });

  it("throws an error when JSON is invalid", () => {
    const jsonSecret = params.defineJsonSecret("INVALID_JSON");
    expect(() => jsonSecret.value()).to.throw(
      '"INVALID_JSON" could not be parsed as JSON. Please verify its value in Secret Manager.'
    );
  });

  it("throws an error when secret is not found", () => {
    const jsonSecret = params.defineJsonSecret("NON_EXISTENT");
    expect(() => jsonSecret.value()).to.throw(
      'No value found for secret parameter "NON_EXISTENT". A function can only access a secret if you include the secret in the function\'s dependency array.'
    );
  });

  it("handles empty object JSON", () => {
    const jsonSecret = params.defineJsonSecret("EMPTY_OBJECT");
    const value = jsonSecret.value();
    expect(value).to.deep.equal({});
  });

  it("handles array JSON", () => {
    const jsonSecret = params.defineJsonSecret("ARRAY_JSON");
    const value = jsonSecret.value();
    expect(value).to.deep.equal([1, 2, 3]);
  });

  it("throws an error when accessed during deployment", () => {
    process.env.FUNCTIONS_CONTROL_API = "true";
    const jsonSecret = params.defineJsonSecret("VALID_JSON");
    expect(() => jsonSecret.value()).to.throw(
      'Cannot access the value of secret "VALID_JSON" during function deployment. Secret values are only available at runtime.'
    );
  });

  it("supports destructuring of JSON objects", () => {
    process.env.STRIPE_CONFIG = JSON.stringify({
      apiKey: "sk_test_123",
      webhookSecret: "whsec_456",
      clientId: "ca_789",
    });

    const stripeConfig = params.defineJsonSecret("STRIPE_CONFIG");
    const { apiKey, webhookSecret, clientId } = stripeConfig.value();

    expect(apiKey).to.equal("sk_test_123");
    expect(webhookSecret).to.equal("whsec_456");
    expect(clientId).to.equal("ca_789");

    delete process.env.STRIPE_CONFIG;
  });

  it("registers the param in declaredParams", () => {
    const initialLength = params.declaredParams.length;
    const jsonSecret = params.defineJsonSecret("TEST_SECRET");
    expect(params.declaredParams.length).to.equal(initialLength + 1);
    expect(params.declaredParams[params.declaredParams.length - 1]).to.equal(jsonSecret);
  });

  it("has correct type and format annotation in toSpec", () => {
    const jsonSecret = params.defineJsonSecret("TEST_SECRET");
    const spec = jsonSecret.toSpec();
    expect(spec.type).to.equal("secret");
    expect(spec.name).to.equal("TEST_SECRET");
    expect(spec.format).to.equal("json");
  });
});

describe("Params as CEL", () => {
  it("internal expressions behave like strings", () => {
    const str = params.defineString("A_STRING");

    expect(params.projectID.toCEL()).to.equal(`{{ params.PROJECT_ID }}`);
    expect(params.projectID.equals("foo").toCEL()).to.equal(`{{ params.PROJECT_ID == "foo" }}`);
    expect(params.projectID.equals(str).toCEL()).to.equal(
      `{{ params.PROJECT_ID == params.A_STRING }}`
    );
    expect(params.gcloudProject.toCEL()).to.equal(`{{ params.GCLOUD_PROJECT }}`);
    expect(params.gcloudProject.equals("foo").toCEL()).to.equal(
      `{{ params.GCLOUD_PROJECT == "foo" }}`
    );
    expect(params.gcloudProject.equals(str).toCEL()).to.equal(
      `{{ params.GCLOUD_PROJECT == params.A_STRING }}`
    );
    expect(params.databaseURL.toCEL()).to.equal(`{{ params.DATABASE_URL }}`);
    expect(params.databaseURL.equals("foo").toCEL()).to.equal(`{{ params.DATABASE_URL == "foo" }}`);
    expect(params.databaseURL.equals(str).toCEL()).to.equal(
      `{{ params.DATABASE_URL == params.A_STRING }}`
    );
    expect(params.storageBucket.toCEL()).to.equal(`{{ params.STORAGE_BUCKET }}`);
    expect(params.storageBucket.equals("foo").toCEL()).to.equal(
      `{{ params.STORAGE_BUCKET == "foo" }}`
    );
    expect(params.storageBucket.equals(str).toCEL()).to.equal(
      `{{ params.STORAGE_BUCKET == params.A_STRING }}`
    );
  });

  it("identity expressions", () => {
    expect(params.defineString("FOO").toCEL()).to.equal("{{ params.FOO }}");
    expect(params.defineInt("FOO").toCEL()).to.equal("{{ params.FOO }}");
    expect(params.defineBoolean("FOO").toCEL()).to.equal("{{ params.FOO }}");
  });

  it("comparison expressions", () => {
    expect(params.defineString("FOO").equals(params.defineString("BAR")).toCEL()).to.equal(
      "{{ params.FOO == params.BAR }}"
    );
    expect(params.defineString("FOO").cmp("==", params.defineString("BAR")).toCEL()).to.equal(
      "{{ params.FOO == params.BAR }}"
    );
    expect(params.defineString("FOO").cmp("!=", params.defineString("BAR")).toCEL()).to.equal(
      "{{ params.FOO != params.BAR }}"
    );
    expect(params.defineString("FOO").cmp(">", params.defineString("BAR")).toCEL()).to.equal(
      "{{ params.FOO > params.BAR }}"
    );
    expect(params.defineString("FOO").cmp(">=", params.defineString("BAR")).toCEL()).to.equal(
      "{{ params.FOO >= params.BAR }}"
    );
    expect(params.defineString("FOO").cmp("<", params.defineString("BAR")).toCEL()).to.equal(
      "{{ params.FOO < params.BAR }}"
    );
    expect(params.defineString("FOO").cmp("<=", params.defineString("BAR")).toCEL()).to.equal(
      "{{ params.FOO <= params.BAR }}"
    );

    expect(params.defineString("FOO").equals("BAR").toCEL()).to.equal('{{ params.FOO == "BAR" }}');
    expect(params.defineString("FOO").cmp("==", "BAR").toCEL()).to.equal(
      '{{ params.FOO == "BAR" }}'
    );
    expect(params.defineString("FOO").cmp("!=", "BAR").toCEL()).to.equal(
      '{{ params.FOO != "BAR" }}'
    );
    expect(params.defineString("FOO").cmp(">", "BAR").toCEL()).to.equal('{{ params.FOO > "BAR" }}');
    expect(params.defineString("FOO").cmp(">=", "BAR").toCEL()).to.equal(
      '{{ params.FOO >= "BAR" }}'
    );
    expect(params.defineString("FOO").cmp("<", "BAR").toCEL()).to.equal('{{ params.FOO < "BAR" }}');
    expect(params.defineString("FOO").cmp("<=", "BAR").toCEL()).to.equal(
      '{{ params.FOO <= "BAR" }}'
    );

    expect(params.defineInt("FOO").equals(-11).toCEL()).to.equal("{{ params.FOO == -11 }}");
    expect(params.defineInt("FOO").cmp("==", -11).toCEL()).to.equal("{{ params.FOO == -11 }}");
    expect(params.defineInt("FOO").cmp("!=", -11).toCEL()).to.equal("{{ params.FOO != -11 }}");
    expect(params.defineInt("FOO").cmp(">", -11).toCEL()).to.equal("{{ params.FOO > -11 }}");
    expect(params.defineInt("FOO").cmp(">=", -11).toCEL()).to.equal("{{ params.FOO >= -11 }}");
    expect(params.defineInt("FOO").cmp("<", -11).toCEL()).to.equal("{{ params.FOO < -11 }}");
    expect(params.defineInt("FOO").cmp("<=", -11).toCEL()).to.equal("{{ params.FOO <= -11 }}");
  });

  it("ternary expressions", () => {
    const booleanExpr = params.defineBoolean("BOOL");
    const cmpExpr = params.defineInt("A").cmp("!=", params.defineInt("B"));

    expect(booleanExpr.thenElse("asdf", "jkl;").toCEL()).to.equal(
      '{{ params.BOOL ? "asdf" : "jkl;" }}'
    );
    expect(booleanExpr.thenElse(-11, 22).toCEL()).to.equal("{{ params.BOOL ? -11 : 22 }}");
    expect(booleanExpr.thenElse(false, true).toCEL()).to.equal("{{ params.BOOL ? false : true }}");
    expect(
      booleanExpr.thenElse(params.defineString("FOO"), params.defineString("BAR")).toCEL()
    ).to.equal("{{ params.BOOL ? params.FOO : params.BAR }}");
    expect(cmpExpr.thenElse("asdf", "jkl;").toCEL()).to.equal(
      '{{ params.A != params.B ? "asdf" : "jkl;" }}'
    );
    expect(cmpExpr.thenElse(-11, 22).toCEL()).to.equal("{{ params.A != params.B ? -11 : 22 }}");
    expect(cmpExpr.thenElse(false, true).toCEL()).to.equal(
      "{{ params.A != params.B ? false : true }}"
    );
    expect(
      cmpExpr.thenElse(params.defineString("FOO"), params.defineString("BAR")).toCEL()
    ).to.equal("{{ params.A != params.B ? params.FOO : params.BAR }}");
  });
});
