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
import * as options from "../../../src/v2/options";
import * as schedule from "../../../src/v2/providers/scheduler";
import { MINIMAL_V2_ENDPOINT } from "../../fixtures";
import { onInit } from "../../../src/v2/core";
import { MockRequest } from "../../fixtures/mockrequest";
import { runHandler } from "../../helper";

const MINIMAL_SCHEDULE_TRIGGER: ManifestEndpoint["scheduleTrigger"] = {
  schedule: "",
  timeZone: options.RESET_VALUE,
  retryConfig: {
    retryCount: options.RESET_VALUE,
    maxRetrySeconds: options.RESET_VALUE,
    minBackoffSeconds: options.RESET_VALUE,
    maxBackoffSeconds: options.RESET_VALUE,
    maxDoublings: options.RESET_VALUE,
    attemptDeadline: options.RESET_VALUE,
  },
};

describe("schedule", () => {
  describe("getOpts", () => {
    it("should handle a schedule", () => {
      expect(schedule.getOpts("* * * * *")).to.deep.eq({
        schedule: "* * * * *",
        opts: {},
      });
    });

    it("should handle full options", () => {
      const options: schedule.ScheduleOptions = {
        schedule: "* * * * *",
        timeZone: "utc",
        retryCount: 3,
        maxRetrySeconds: 1,
        minBackoffSeconds: 2,
        maxBackoffSeconds: 3,
        maxDoublings: 4,
        attemptDeadline: "120s",
        memory: "128MiB",
        region: "us-central1",
      };

      expect(schedule.getOpts(options)).to.deep.eq({
        schedule: "* * * * *",
        timeZone: "utc",
        retryConfig: {
          retryCount: 3,
          maxRetrySeconds: 1,
          minBackoffSeconds: 2,
          maxBackoffSeconds: 3,
          maxDoublings: 4,
          attemptDeadline: "120s",
        },
        opts: {
          ...options,
          memory: "128MiB",
          region: "us-central1",
        },
      });
    });
  });

  describe("onSchedule", () => {
    it("should create a schedule function given a schedule", () => {
      const schfn = schedule.onSchedule("* * * * *", () => console.log(1));

      expect(schfn.__endpoint).to.deep.eq({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        scheduleTrigger: {
          ...MINIMAL_SCHEDULE_TRIGGER,
          schedule: "* * * * *",
        },
      });
      expect(schfn.__requiredAPIs).to.deep.eq([
        {
          api: "cloudscheduler.googleapis.com",
          reason: "Needed for scheduled functions.",
        },
      ]);
    });

    it("should create a schedule function with attemptDeadline", () => {
      const schfn = schedule.onSchedule(
        {
          schedule: "* * * * *",
          attemptDeadline: "320s",
        },
        () => undefined
      );

      expect(schfn.__endpoint.scheduleTrigger?.retryConfig?.attemptDeadline).to.equal(
        "320s"
      );
    });

    it("should create a schedule function given options", () => {
      const schfn = schedule.onSchedule(
        {
          schedule: "* * * * *",
          timeZone: "utc",
          retryCount: 3,
          maxRetrySeconds: 10,
          minBackoffSeconds: 11,
          maxBackoffSeconds: 12,
          maxDoublings: 2,
          attemptDeadline: "120s",
          region: "us-central1",
          labels: { key: "val" },
        },
        () => undefined
      );

      expect(schfn.__endpoint).to.deep.eq({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: { key: "val" },
        region: ["us-central1"],
        scheduleTrigger: {
          schedule: "* * * * *",
          timeZone: "utc",
          retryConfig: {
            retryCount: 3,
            maxRetrySeconds: 10,
            minBackoffSeconds: 11,
            maxBackoffSeconds: 12,
            maxDoublings: 2,
            attemptDeadline: "120s",
          },
        },
      });
      expect(schfn.__requiredAPIs).to.deep.eq([
        {
          api: "cloudscheduler.googleapis.com",
          reason: "Needed for scheduled functions.",
        },
      ]);
    });

    it("should create a schedule function with preserveExternalChanges", () => {
      const schfn = schedule.onSchedule(
        {
          schedule: "* * * * *",
          preserveExternalChanges: true,
        },
        () => console.log(1)
      );

      expect(schfn.__endpoint).to.deep.eq({
        platform: "gcfv2",
        labels: {},
        scheduleTrigger: {
          schedule: "* * * * *",
          timeZone: undefined,
          retryConfig: {
            retryCount: undefined,
            maxRetrySeconds: undefined,
            minBackoffSeconds: undefined,
            maxBackoffSeconds: undefined,
            maxDoublings: undefined,
            attemptDeadline: undefined,
          },
        },
      });
      expect(schfn.__requiredAPIs).to.deep.eq([
        {
          api: "cloudscheduler.googleapis.com",
          reason: "Needed for scheduled functions.",
        },
      ]);
    });

    it("should have a .run method", async () => {
      const testObj = {
        foo: "bar",
      };
      const schfn = schedule.onSchedule("* * * * *", () => {
        testObj.foo = "newBar";
      });

      await schfn.run("input" as any);

      expect(testObj).to.deep.eq({
        foo: "newBar",
      });
    });

    it("calls init function", async () => {
      const func = schedule.onSchedule("* * * * *", () => null);

      const req = new MockRequest(
        {
          data: {},
        },
        {
          "content-type": "application/json",
          origin: "example.com",
        }
      );
      req.method = "POST";

      let hello;
      onInit(() => (hello = "world"));
      expect(hello).to.be.undefined;
      await runHandler(func, req as any);
      expect(hello).to.equal("world");
    });
  });
});
