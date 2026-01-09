import { expect } from "chai";
import {
  stackToWire,
  ManifestStack,
  initV2ScheduleTrigger,
  initV1ScheduleTrigger,
  initTaskQueueTrigger,
} from "../../src/runtime/manifest";
import { RESET_VALUE } from "../../src/common/options";
import * as params from "../../src/params";
import * as optsv2 from "../../src/v2/options";
import * as v1 from "../../src/v1";
import { DeploymentOptions } from "../../src/v1";

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
      extensions: {},
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
              validationRegex: "\\d{5}",
            },
          },
        },
      ],
      specVersion: "v1alpha1",
      extensions: {},
    };
    expect(stackToWire(stack)).to.deep.equal(expected);
  });

  it("converts stack with null values", () => {
    const stack: ManifestStack = {
      endpoints: {
        v2http: {
          platform: "gcfv2",
          entryPoint: "v2http",
          labels: {},
          httpsTrigger: {},
          maxInstances: null,
        },
      },
      requiredAPIs: [],
      specVersion: "v1alpha1",
      extensions: {
        ext1: {
          params: {},
          localPath: "localPath",
          events: [],
        },
      },
    };
    const expected = {
      endpoints: {
        v2http: {
          platform: "gcfv2",
          entryPoint: "v2http",
          labels: {},
          httpsTrigger: {},
          maxInstances: null,
        },
      },
      requiredAPIs: [],
      specVersion: "v1alpha1",
      extensions: {
        ext1: {
          params: {},
          localPath: "localPath",
          events: [],
        },
      },
    };
    expect(stackToWire(stack)).to.deep.equal(expected);
  });

  it("converts stack with RESET_VALUES", () => {
    const stack: ManifestStack = {
      endpoints: {
        v1http: {
          platform: "gcfv1",
          entryPoint: "v1http",
          labels: {},
          httpsTrigger: {},
          maxInstances: v1.RESET_VALUE,
        },
        v2http: {
          platform: "gcfv2",
          entryPoint: "v2http",
          labels: {},
          httpsTrigger: {},
          maxInstances: optsv2.RESET_VALUE,
        },
      },
      requiredAPIs: [],
      specVersion: "v1alpha1",
      extensions: {
        ext1: {
          params: {},
          localPath: "localPath",
          events: [],
        },
      },
    };
    const expected = {
      endpoints: {
        v1http: {
          platform: "gcfv1",
          entryPoint: "v1http",
          labels: {},
          httpsTrigger: {},
          maxInstances: null,
        },
        v2http: {
          platform: "gcfv2",
          entryPoint: "v2http",
          labels: {},
          httpsTrigger: {},
          maxInstances: null,
        },
      },
      requiredAPIs: [],
      specVersion: "v1alpha1",
      extensions: {
        ext1: {
          params: {},
          localPath: "localPath",
          events: [],
        },
      },
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
          maxInstances: intParam.equals(24).thenElse(-1, 1),
        },
        v2schedule: {
          platform: "gcfv2",
          entryPoint: "v2callable",
          labels: {},
          scheduleTrigger: {
            schedule: stringParam.equals("America/Mexico_City").thenElse("mexico", "usa"),
            timeZone: stringParam,
          },
        },
      },
      requiredAPIs: [],
      specVersion: "v1alpha1",
      extensions: {
        ext1: {
          params: {},
          localPath: "localPath",
          events: [],
        },
      },
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
      extensions: {
        ext1: {
          params: {},
          localPath: "localPath",
          events: [],
        },
      },
    };
    expect(stackToWire(stack)).to.deep.equal(expected);
  });
});

describe("initTaskQueueTrigger", () => {
  it("should init a taskQueueTrigger without preserveExternalChanges", () => {
    const tt = initTaskQueueTrigger();

    expect(tt).to.deep.eq({
      retryConfig: {
        maxAttempts: RESET_VALUE,
        maxDoublings: RESET_VALUE,
        maxBackoffSeconds: RESET_VALUE,
        maxRetrySeconds: RESET_VALUE,
        minBackoffSeconds: RESET_VALUE,
      },
      rateLimits: {
        maxConcurrentDispatches: RESET_VALUE,
        maxDispatchesPerSecond: RESET_VALUE,
      },
    });
  });

  it("should init a taskQueueTrigger with preserveExternalChanges", () => {
    const opts: DeploymentOptions = { preserveExternalChanges: true };

    const tt = initTaskQueueTrigger(opts);

    expect(tt).to.deep.eq({
      rateLimits: {},
      retryConfig: {},
    });
  });
});

describe("initScheduleTrigger", () => {
  it("should init a v1 scheduleTrigger without preserveExternalChanges", () => {
    const st = initV1ScheduleTrigger("every 30 minutes");

    expect(st).to.deep.eq({
      schedule: "every 30 minutes",
      timeZone: RESET_VALUE,
      attemptDeadline: RESET_VALUE,
      retryConfig: {
        retryCount: RESET_VALUE,
        maxDoublings: RESET_VALUE,
        maxRetryDuration: RESET_VALUE,
        minBackoffDuration: RESET_VALUE,
        maxBackoffDuration: RESET_VALUE,
      },
    });
  });

  it("should init a v1 scheduleTrigger with preserveExternalChanges", () => {
    const opts: DeploymentOptions = { preserveExternalChanges: true };

    const st = initV1ScheduleTrigger("every 30 minutes", opts);

    expect(st).to.deep.eq({
      schedule: "every 30 minutes",
      retryConfig: {},
    });
  });

  it("should init a v2 scheduleTrigger without preserveExternalChanges", () => {
    const st = initV2ScheduleTrigger("every 30 minutes");

    expect(st).to.deep.eq({
      schedule: "every 30 minutes",
      timeZone: RESET_VALUE,
      attemptDeadline: RESET_VALUE,
      retryConfig: {
        retryCount: RESET_VALUE,
        maxDoublings: RESET_VALUE,
        maxRetrySeconds: RESET_VALUE,
        minBackoffSeconds: RESET_VALUE,
        maxBackoffSeconds: RESET_VALUE,
      },
    });
  });

  it("should init a v2 scheduleTrigger with preserveExternalChanges", () => {
    const opts: DeploymentOptions = { preserveExternalChanges: true };

    const st = initV2ScheduleTrigger("every 30 minutes", opts);

    expect(st).to.deep.eq({
      schedule: "every 30 minutes",
      retryConfig: {},
    });
  });
});
