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

import { ManifestEndpoint } from "../../../src/runtime/manifest";
import { onTaskDispatched, Request } from "../../../src/v2/providers/tasks";
import { MockRequest } from "../../fixtures/mockrequest";
import { runHandler } from "../../helper";
import { FULL_OPTIONS } from "./fixtures";
import { FULL_ENDPOINT, MINIMAL_V2_ENDPOINT } from "../../fixtures";
import * as options from "../../../src/v2/options";

const MINIMIAL_TASK_QUEUE_TRIGGER: ManifestEndpoint["taskQueueTrigger"] = {
  rateLimits: {
    maxConcurrentDispatches: options.RESET_VALUE,
    maxDispatchesPerSecond: options.RESET_VALUE,
  },
  retryConfig: {
    maxAttempts: options.RESET_VALUE,
    maxBackoffSeconds: options.RESET_VALUE,
    maxDoublings: options.RESET_VALUE,
    maxRetrySeconds: options.RESET_VALUE,
    minBackoffSeconds: options.RESET_VALUE,
  },
};

describe("onTaskDispatched", () => {
  beforeEach(() => {
    options.setGlobalOptions({});
    process.env.GCLOUD_PROJECT = "aProject";
  });

  afterEach(() => {
    delete process.env.GCLOUD_PROJECT;
  });

  it("should return a minimal trigger/endpoint with appropriate values", () => {
    const result = onTaskDispatched(() => undefined);

    expect(result.__endpoint).to.deep.equal({
      ...MINIMAL_V2_ENDPOINT,
      platform: "gcfv2",
      labels: {},
      taskQueueTrigger: MINIMIAL_TASK_QUEUE_TRIGGER,
    });
  });

  it("should create a complex trigger/endpoint with appropriate values", () => {
    const result = onTaskDispatched(
      {
        ...FULL_OPTIONS,
        retryConfig: {
          maxAttempts: 4,
          maxRetrySeconds: 10,
          maxDoublings: 3,
          minBackoffSeconds: 1,
          maxBackoffSeconds: 2,
        },
        rateLimits: {
          maxConcurrentDispatches: 5,
          maxDispatchesPerSecond: 10,
        },
        invoker: "private",
      },
      () => undefined
    );

    expect(result.__endpoint).to.deep.equal({
      ...FULL_ENDPOINT,
      platform: "gcfv2",
      taskQueueTrigger: {
        retryConfig: {
          maxAttempts: 4,
          maxRetrySeconds: 10,
          maxDoublings: 3,
          minBackoffSeconds: 1,
          maxBackoffSeconds: 2,
        },
        rateLimits: {
          maxConcurrentDispatches: 5,
          maxDispatchesPerSecond: 10,
        },
        invoker: ["private"],
      },
    });
  });

  it("should merge options and globalOptions", () => {
    options.setGlobalOptions({
      concurrency: 20,
      region: "europe-west1",
      minInstances: 1,
    });

    const result = onTaskDispatched(
      {
        region: "us-west1",
        minInstances: 3,
      },
      () => undefined
    );

    expect(result.__endpoint).to.deep.equal({
      ...MINIMAL_V2_ENDPOINT,
      platform: "gcfv2",
      concurrency: 20,
      minInstances: 3,
      region: ["us-west1"],
      labels: {},
      taskQueueTrigger: MINIMIAL_TASK_QUEUE_TRIGGER,
    });
  });

  it("has a .run method", async () => {
    const request: any = { data: "data" };
    const cf = onTaskDispatched((r) => {
      expect(r.data).to.deep.equal(request.data);
    });

    await cf.run(request);
  });

  it("should be an express handler", async () => {
    const func = onTaskDispatched(() => undefined);

    const req = new MockRequest(
      {
        data: {},
      },
      {
        "content-type": "application/json",
        authorization: "Bearer abc",
        origin: "example.com",
      }
    );
    req.method = "POST";

    const resp = await runHandler(func, req as any);
    expect(resp.status).to.equal(204);
  });

  // These tests pass if the code transpiles
  it("allows desirable syntax", () => {
    onTaskDispatched<string>((request: Request<string>) => {
      // There should be no lint warnings that data is not a string.
      console.log(`hello, ${request.data}`);
    });
    onTaskDispatched((request: Request<string>) => {
      console.log(`hello, ${request.data}`);
    });
    onTaskDispatched<string>((request: Request) => {
      console.log(`hello, ${request.data}`);
    });
    onTaskDispatched((request: Request) => {
      console.log(`Hello, ${request.data}`);
    });
  });
});
