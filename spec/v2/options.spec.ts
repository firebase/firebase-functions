// The MIT License (MIT)
//
// Copyright (c) 2025 Firebase
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import { expect } from "chai";
import { defineInt, defineJsonSecret, defineSecret } from "../../src/params";
import {
  assertTimeoutSecondsValid,
  GlobalOptions,
  optionsToEndpoint,
  optionsToTriggerAnnotations,
  RESET_VALUE,
  setGlobalOptions,
} from "../../src/v2/options";

describe("GlobalOptions", () => {
  it("should accept all valid secret types in secrets array (type test)", () => {
    // This is a compile-time type test. If any of these types are not assignable
    // to the secrets array, TypeScript will fail to compile this test file.
    const jsonSecret = defineJsonSecret<{ key: string }>("JSON_SECRET");
    const stringSecret = defineSecret("STRING_SECRET");
    const plainSecret = "PLAIN_SECRET";

    const opts: GlobalOptions = {
      secrets: [plainSecret, stringSecret, jsonSecret],
    };

    expect(opts.secrets).to.have.length(3);
  });
});

describe("optionsToEndpoint", () => {
  it("should return an empty vpc if none provided", () => {
    const endpoint = optionsToEndpoint({});
    expect(endpoint.vpc).to.be.undefined;
  });

  it("should set vpcConnector correctly", () => {
    const endpoint = optionsToEndpoint({ vpcConnector: "my-connector", vpcEgress: "ALL_TRAFFIC" });
    expect(endpoint.vpc).to.deep.equal({
      connector: "my-connector",
      egressSettings: "ALL_TRAFFIC",
    });
  });

  it("should set networkInterface correctly", () => {
    const endpoint = optionsToEndpoint({
      networkInterface: { network: "my-network" },
      vpcEgress: "PRIVATE_RANGES_ONLY",
    });
    expect(endpoint.vpc).to.deep.equal({
      networkInterfaces: [{ network: "my-network" }],
      egressSettings: "PRIVATE_RANGES_ONLY",
    });
  });

  it("should throw an error if both vpcConnector and networkInterface are provided", () => {
    expect(() => {
      optionsToEndpoint({
        vpcConnector: "my-connector",
        networkInterface: { network: "my-network" },
      });
    }).to.throw("Cannot set both vpcConnector and networkInterface");
  });

  it("should throw an error if networkInterface has no network or subnetwork", () => {
    expect(() => {
      optionsToEndpoint({
        networkInterface: {},
      });
    }).to.throw("At least one of network or subnetwork must be specified in networkInterface.");
  });

  it("should reset vpc when vpcConnector is RESET_VALUE", () => {
    const endpoint = optionsToEndpoint({ vpcConnector: RESET_VALUE });
    expect(endpoint.vpc).to.equal(RESET_VALUE);
  });

  it("should reset vpc when networkInterface is RESET_VALUE", () => {
    const endpoint = optionsToEndpoint({ networkInterface: RESET_VALUE });
    expect(endpoint.vpc).to.equal(RESET_VALUE);
  });
});

describe("assertTimeoutSecondsValid", () => {
  afterEach(() => {
    setGlobalOptions({});
  });

  it("is a no-op when timeoutSeconds is undefined", () => {
    expect(() => assertTimeoutSecondsValid({}, "event")).to.not.throw();
    expect(() => assertTimeoutSecondsValid({}, "https")).to.not.throw();
    expect(() => assertTimeoutSecondsValid({}, "task")).to.not.throw();
  });

  it("accepts values within each kind's limit", () => {
    expect(() => assertTimeoutSecondsValid({ timeoutSeconds: 540 }, "event")).to.not.throw();
    expect(() => assertTimeoutSecondsValid({ timeoutSeconds: 3600 }, "https")).to.not.throw();
    expect(() => assertTimeoutSecondsValid({ timeoutSeconds: 1800 }, "task")).to.not.throw();
    expect(() => assertTimeoutSecondsValid({ timeoutSeconds: 0 }, "event")).to.not.throw();
  });

  it("throws when timeoutSeconds exceeds the event-handler limit", () => {
    expect(() => assertTimeoutSecondsValid({ timeoutSeconds: 3600 }, "event")).to.throw(
      /between 0 and 540 for event-handling functions/
    );
  });

  it("throws when timeoutSeconds exceeds the HTTPS limit", () => {
    expect(() => assertTimeoutSecondsValid({ timeoutSeconds: 3601 }, "https")).to.throw(
      /between 0 and 3600 for HTTPS and callable functions/
    );
  });

  it("throws when timeoutSeconds exceeds the task-queue limit", () => {
    expect(() => assertTimeoutSecondsValid({ timeoutSeconds: 1801 }, "task")).to.throw(
      /between 0 and 1800 for task queue functions/
    );
  });

  it("throws when timeoutSeconds is negative", () => {
    expect(() => assertTimeoutSecondsValid({ timeoutSeconds: -1 }, "event")).to.throw(
      /between 0 and 540/
    );
  });

  it("skips validation for Expression timeouts", () => {
    const expr = { timeoutSeconds: defineInt("TIMEOUT") };
    expect(() => assertTimeoutSecondsValid(expr, "event")).to.not.throw();
  });

  it("skips validation for RESET_VALUE timeouts", () => {
    const opts = { timeoutSeconds: RESET_VALUE as unknown as number };
    expect(() => assertTimeoutSecondsValid(opts, "event")).to.not.throw();
  });

  it("falls back to the global timeoutSeconds when the function-level option is absent", () => {
    setGlobalOptions({ timeoutSeconds: 3600 });
    expect(() => assertTimeoutSecondsValid({}, "event")).to.throw(
      /between 0 and 540 for event-handling functions/
    );
    expect(() => assertTimeoutSecondsValid({}, "https")).to.not.throw();
  });

  it("prefers the function-level timeoutSeconds over the global one", () => {
    setGlobalOptions({ timeoutSeconds: 60 });
    expect(() => assertTimeoutSecondsValid({ timeoutSeconds: 1000 }, "event")).to.throw(
      /between 0 and 540/
    );
  });

  it("treats a function-level RESET_VALUE as a clear of an out-of-range global", () => {
    setGlobalOptions({ timeoutSeconds: 3600 });
    expect(() =>
      assertTimeoutSecondsValid({ timeoutSeconds: RESET_VALUE as unknown as number }, "event")
    ).to.not.throw();
  });
});

describe("optionsToEndpoint timeout validation", () => {
  afterEach(() => {
    setGlobalOptions({});
  });

  it("does not validate when kind is omitted (backwards compatibility)", () => {
    expect(() => optionsToEndpoint({ timeoutSeconds: 9999 })).to.not.throw();
  });

  it("throws when kind is provided and timeoutSeconds exceeds the limit", () => {
    expect(() => optionsToEndpoint({ timeoutSeconds: 3600 }, "event")).to.throw(
      /between 0 and 540/
    );
    expect(() => optionsToEndpoint({ timeoutSeconds: 3601 }, "https")).to.throw(
      /between 0 and 3600/
    );
    expect(() => optionsToEndpoint({ timeoutSeconds: 1801 }, "task")).to.throw(
      /between 0 and 1800/
    );
  });

  it("is a no-op for in-range timeouts when kind is provided", () => {
    expect(() => optionsToEndpoint({ timeoutSeconds: 540 }, "event")).to.not.throw();
    expect(() => optionsToEndpoint({ timeoutSeconds: 3600 }, "https")).to.not.throw();
    expect(() => optionsToEndpoint({ timeoutSeconds: 1800 }, "task")).to.not.throw();
  });
});

describe("optionsToTriggerAnnotations timeout validation", () => {
  afterEach(() => {
    setGlobalOptions({});
  });

  it("does not validate when kind is omitted (backwards compatibility)", () => {
    expect(() => optionsToTriggerAnnotations({ timeoutSeconds: 9999 })).to.not.throw();
  });

  it("throws when kind is provided and timeoutSeconds exceeds the limit", () => {
    expect(() => optionsToTriggerAnnotations({ timeoutSeconds: 3600 }, "event")).to.throw(
      /between 0 and 540/
    );
    expect(() => optionsToTriggerAnnotations({ timeoutSeconds: 3601 }, "https")).to.throw(
      /between 0 and 3600/
    );
    expect(() => optionsToTriggerAnnotations({ timeoutSeconds: 1801 }, "task")).to.throw(
      /between 0 and 1800/
    );
  });

  it("is a no-op for in-range timeouts when kind is provided", () => {
    expect(() => optionsToTriggerAnnotations({ timeoutSeconds: 540 }, "event")).to.not.throw();
    expect(() => optionsToTriggerAnnotations({ timeoutSeconds: 3600 }, "https")).to.not.throw();
    expect(() => optionsToTriggerAnnotations({ timeoutSeconds: 1800 }, "task")).to.not.throw();
  });
});
