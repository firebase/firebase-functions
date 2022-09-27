import { expect } from "chai";
import * as params from "../../src/params";

describe("Params spec extraction", () => {
  it("converts Expressions in the param default to strings", () => {
    const bar = params.defineInt("BAR");
    expect(
      params.defineString("FOO", { default: bar.notEquals(22).then("asdf", "jkl;") }).toSpec()
        .default
    ).to.equal(`{{ params.BAR != 22 ? "asdf" : "jkl;" }}`);
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

  it("can select the output of a ternary expression based on the comparison", () => {
    const trueExpr = params.defineString("A_STRING").equals(params.defineString("SAME_STRING"));
    expect(trueExpr.then(1, 0).value()).to.equal(1);
    const falseExpr = params.defineInt("AN_INT").equals(params.defineInt("DIFF_INT"));
    expect(falseExpr.then(1, 0).value()).to.equal(0);

    const twentytwo = params.defineInt("DIFF_INT");
    expect(trueExpr.then(twentytwo, 0).value()).to.equal(22);
    expect(falseExpr.then(1, twentytwo).value()).to.equal(22);
  });
});

describe("Params as CEL", () => {
  it("does not allow you to reference internal parameters in the manifest", () => {
    expect(() => params.projectID.toCEL()).to.throw();
    expect(() => params.gcloudProject.toCEL()).to.throw();
    expect(() => params.databaseURL.toCEL()).to.throw();
    expect(() => params.storageBucket.toCEL()).to.throw();
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

    expect(booleanExpr.then("asdf", "jkl;").toCEL()).to.equal(
      '{{ params.BOOL ? "asdf" : "jkl;" }}'
    );
    expect(booleanExpr.then(-11, 22).toCEL()).to.equal("{{ params.BOOL ? -11 : 22 }}");
    expect(booleanExpr.then(false, true).toCEL()).to.equal("{{ params.BOOL ? false : true }}");
    expect(
      booleanExpr.then(params.defineString("FOO"), params.defineString("BAR")).toCEL()
    ).to.equal("{{ params.BOOL ? params.FOO : params.BAR }}");
    expect(cmpExpr.then("asdf", "jkl;").toCEL()).to.equal(
      '{{ params.A != params.B ? "asdf" : "jkl;" }}'
    );
    expect(cmpExpr.then(-11, 22).toCEL()).to.equal("{{ params.A != params.B ? -11 : 22 }}");
    expect(cmpExpr.then(false, true).toCEL()).to.equal("{{ params.A != params.B ? false : true }}");
    expect(cmpExpr.then(params.defineString("FOO"), params.defineString("BAR")).toCEL()).to.equal(
      "{{ params.A != params.B ? params.FOO : params.BAR }}"
    );
  });
});
