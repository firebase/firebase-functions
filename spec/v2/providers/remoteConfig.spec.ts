// The MIT License (MIT)
//
// Copyright (c) 2022 Firebase
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
import { CloudEvent, onInit } from "../../../src/v2/core";
import * as options from "../../../src/v2/options";
import * as remoteConfig from "../../../src/v2/providers/remoteConfig";
import { MINIMAL_V2_ENDPOINT } from "../../fixtures";

describe("onConfigUpdated", () => {
  afterEach(() => {
    options.setGlobalOptions({});
  });

  it("should create a function with a handler", async () => {
    const fn = remoteConfig.onConfigUpdated(() => 2);

    expect(fn.__endpoint).to.deep.eq({
      ...MINIMAL_V2_ENDPOINT,
      platform: "gcfv2",
      labels: {},
      eventTrigger: {
        eventType: remoteConfig.eventType,
        eventFilters: {},
        retry: false,
      },
    });
    await expect(fn(1 as any)).to.eventually.eq(2);
  });

  it("should create a function with opts and a handler", async () => {
    options.setGlobalOptions({
      memory: "512MiB",
      region: "us-west1",
    });

    const fn = remoteConfig.onConfigUpdated(
      {
        region: "us-central1",
        retry: true,
      },
      () => 2
    );

    expect(fn.__endpoint).to.deep.eq({
      ...MINIMAL_V2_ENDPOINT,
      platform: "gcfv2",
      availableMemoryMb: 512,
      region: ["us-central1"],
      labels: {},
      eventTrigger: {
        eventType: remoteConfig.eventType,
        eventFilters: {},
        retry: true,
      },
    });
    await expect(fn(1 as any)).to.eventually.eq(2);
  });

  it("calls init function", async () => {
    const event: CloudEvent<string> = {
      specversion: "1.0",
      id: "id",
      source: "source",
      type: "type",
      time: "now",
      data: "data",
    };

    let hello;
    onInit(() => (hello = "world"));
    expect(hello).to.be.undefined;
    await remoteConfig.onConfigUpdated(() => null)(event);
    expect(hello).to.equal("world");
  });
});
