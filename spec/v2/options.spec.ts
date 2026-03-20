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
import { defineJsonSecret, defineSecret } from "../../src/params";
import { GlobalOptions, optionsToEndpoint, RESET_VALUE } from "../../src/v2/options";

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
