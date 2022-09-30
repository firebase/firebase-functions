import { expect } from "chai";
import { stackToWire, ManifestStack } from "../../src/runtime/manifest";
import * as params from "../../src/params";

describe("stackToWire", () => {
  afterEach(() => {
    params.clearParams();
  });

  it("converts regular expressions used in param inputs", () => {
    const regExpParam = params.defineString("foo", {
      input: { text: { validationRegex: /\d{5}/ } },
    });

    const stack: ManifestStack = {
      endpoints: {},
      requiredAPIs: [],
      params: [regExpParam.toSpec()],
      specVersion: "v1alpha1",
    };
    const expected = {
      endpoints: {},
      requiredAPIs: [],
      params: [
        {
          name: "foo",
          type: "string",
          input: {
            text: {
              validationRegexp: "\\d{5}",
            },
          },
        },
      ],
      specVersion: "v1alpha1",
    };
    expect(stackToWire(stack)).to.deep.equal(expected);
  });

  it("converts Expression types in endpoint options to CEL", () => {
    const intParam = params.defineInt("foo", { default: 11 });
    const stringParam = params.defineString("bar", {
      default: "America/Los_Angeles",
    });

    const stack: ManifestStack = {
      endpoints: {
        v2http: {
          platform: "gcfv2",
          entryPoint: "v2http",
          labels: {},
          httpsTrigger: {},
          concurrency: intParam,
          maxInstances: intParam.equals(24).then(-1, 1),
        },
        v2schedule: {
          platform: "gcfv2",
          entryPoint: "v2callable",
          labels: {},
          scheduleTrigger: {
            schedule: stringParam.equals("America/Mexico_City").then("mexico", "usa"),
            timeZone: stringParam,
          },
        },
      },
      requiredAPIs: [],
      specVersion: "v1alpha1",
    };
    const expected = {
      endpoints: {
        v2http: {
          platform: "gcfv2",
          entryPoint: "v2http",
          labels: {},
          httpsTrigger: {},
          concurrency: "{{ params.foo }}",
          maxInstances: "{{ params.foo == 24 ? -1 : 1 }}",
        },
        v2schedule: {
          platform: "gcfv2",
          entryPoint: "v2callable",
          labels: {},
          scheduleTrigger: {
            schedule: '{{ params.bar == "America/Mexico_City" ? "mexico" : "usa" }}',
            timeZone: "{{ params.bar }}",
          },
        },
      },
      requiredAPIs: [],
      specVersion: "v1alpha1",
    };
    expect(stackToWire(stack)).to.deep.equal(expected);
  });
});
