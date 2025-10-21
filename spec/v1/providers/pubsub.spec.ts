// The MIT License (MIT)
//
// Copyright (c) 2017 Firebase
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

import { Event, RESET_VALUE } from "../../../src/v1";
import { MINIMAL_V1_ENDPOINT } from "../../fixtures";
import { MINIMAL_SCHEDULE_TRIGGER } from "./fixtures";
import * as functions from "../../../src/v1";
import * as pubsub from "../../../src/v1/providers/pubsub";

describe("Pubsub Functions", () => {
  describe("pubsub.Message", () => {
    describe("#json", () => {
      it("should return json decoded from base64", () => {
        const message = new pubsub.Message({
          data: new Buffer('{"hello":"world"}', "utf8").toString("base64"),
        });

        expect(message.json.hello).to.equal("world");
      });

      it("should preserve passed in json", () => {
        const message = new pubsub.Message({
          data: new Buffer('{"hello":"world"}', "utf8").toString("base64"),
          json: { goodbye: "world" },
        });

        expect(message.json.goodbye).to.equal("world");
      });
    });

    describe("#toJSON", () => {
      it("should be JSON stringify-able", () => {
        const encoded = new Buffer('{"hello":"world"}', "utf8").toString("base64");
        const message = new pubsub.Message({
          data: encoded,
        });

        expect(JSON.parse(JSON.stringify(message))).to.deep.equal({
          data: encoded,
          attributes: {},
        });
      });
    });
  });

  describe("pubsub.FunctionBuilder", () => {
    before(() => {
      process.env.GCLOUD_PROJECT = "project1";
    });

    after(() => {
      delete process.env.GCLOUD_PROJECT;
    });

    it("should allow both region and runtime options to be set", () => {
      const fn = functions
        .region("us-east1")
        .runWith({
          timeoutSeconds: 90,
          memory: "256MB",
        })
        .pubsub.topic("toppy")
        .onPublish(() => null);

      expect(fn.__trigger.regions).to.deep.equal(["us-east1"]);
      expect(fn.__trigger.availableMemoryMb).to.deep.equal(256);
      expect(fn.__trigger.timeout).to.deep.equal("90s");

      expect(fn.__endpoint.region).to.deep.equal(["us-east1"]);
      expect(fn.__endpoint.availableMemoryMb).to.deep.equal(256);
      expect(fn.__endpoint.timeoutSeconds).to.deep.equal(90);
    });

    describe("#onPublish", () => {
      it("should return a trigger/endpoint with appropriate values", () => {
        // Pick up project from process.env.GCLOUD_PROJECT
        const result = pubsub.topic("toppy").onPublish(() => null);

        expect(result.__trigger).to.deep.equal({
          eventTrigger: {
            eventType: "google.pubsub.topic.publish",
            resource: "projects/project1/topics/toppy",
            service: "pubsub.googleapis.com",
          },
        });

        expect(result.__endpoint).to.deep.equal({
          ...MINIMAL_V1_ENDPOINT,
          platform: "gcfv1",
          eventTrigger: {
            eventType: "google.pubsub.topic.publish",
            eventFilters: {
              resource: "projects/project1/topics/toppy",
            },
            retry: false,
          },
          labels: {},
        });
      });

      it("should throw with improperly formatted topics", () => {
        expect(() => pubsub.topic("bad/topic/format")).to.throw(Error);
      });

      it("should properly handle a new-style event", () => {
        const raw = new Buffer('{"hello":"world"}', "utf8").toString("base64");
        const event: Event = {
          data: {
            data: raw,
            attributes: {
              foo: "bar",
            },
          },
          context: {
            eventId: "70172329041928",
            timestamp: "2018-04-09T07:56:12.975Z",
            eventType: "google.pubsub.topic.publish",
            resource: {
              service: "pubsub.googleapis.com",
              name: "projects/project1/topics/toppy",
            },
          },
        };

        const result = pubsub.topic("toppy").onPublish((data) => {
          return {
            raw: data.data,
            json: data.json,
            attributes: data.attributes,
          };
        });

        return expect(result(event.data, event.context)).to.eventually.deep.equal({
          raw,
          json: { hello: "world" },
          attributes: { foo: "bar" },
        });
      });
    });

    describe("#schedule", () => {
      it("should return a trigger/endpoint with schedule", () => {
        const result = pubsub.schedule("every 5 minutes").onRun(() => null);

        expect(result.__trigger.schedule).to.deep.equal({
          schedule: "every 5 minutes",
        });

        expect(result.__endpoint.scheduleTrigger).to.deep.equal({
          ...MINIMAL_SCHEDULE_TRIGGER,
          schedule: "every 5 minutes",
        });
      });

      it("should return a trigger/endpoint with schedule and timeZone when one is chosen", () => {
        const result = pubsub
          .schedule("every 5 minutes")
          .timeZone("America/New_York")
          .onRun(() => null);

        expect(result.__trigger.schedule).to.deep.equal({
          schedule: "every 5 minutes",
          timeZone: "America/New_York",
        });

        expect(result.__endpoint.scheduleTrigger).to.deep.equal({
          ...MINIMAL_SCHEDULE_TRIGGER,
          schedule: "every 5 minutes",
          timeZone: "America/New_York",
        });
      });

      it("should return a trigger/endpoint with schedule and retry config when called with retryConfig", () => {
        const retryConfig = {
          retryCount: 3,
          maxRetryDuration: "10 minutes",
          minBackoffDuration: "10 minutes",
          maxBackoffDuration: "10 minutes",
          maxDoublings: 5,
        };
        const result = pubsub
          .schedule("every 5 minutes")
          .retryConfig(retryConfig)
          .onRun(() => null);

        expect(result.__trigger.schedule).to.deep.equal({
          schedule: "every 5 minutes",
          retryConfig,
        });
        expect(result.__trigger.labels).to.deep.equal({
          "deployment-scheduled": "true",
        });

        expect(result.__endpoint.scheduleTrigger).to.deep.equal({
          ...MINIMAL_SCHEDULE_TRIGGER,
          schedule: "every 5 minutes",
          retryConfig: {
            ...retryConfig,
          },
        });
        expect(result.__endpoint.labels).to.be.empty;
      });

      it(
        "should return a trigger/endpoint with schedule, timeZone and retry config" +
          "when called with retryConfig and timeout",
        () => {
          const retryConfig = {
            retryCount: 3,
            maxRetryDuration: "10 minutes",
            minBackoffDuration: "10 minutes",
            maxBackoffDuration: "10 minutes",
            maxDoublings: 5,
          };
          const result = pubsub
            .schedule("every 5 minutes")
            .timeZone("America/New_York")
            .retryConfig(retryConfig)
            .onRun(() => null);

          expect(result.__trigger.schedule).to.deep.equal({
            schedule: "every 5 minutes",
            retryConfig,
            timeZone: "America/New_York",
          });
          expect(result.__trigger.labels).to.deep.equal({
            "deployment-scheduled": "true",
          });

          expect(result.__endpoint.scheduleTrigger).to.deep.equal({
            ...MINIMAL_SCHEDULE_TRIGGER,
            schedule: "every 5 minutes",
            retryConfig: {
              ...retryConfig,
            },
            timeZone: "America/New_York",
          });
          expect(result.__endpoint.labels).to.be.empty;
        }
      );

      it("should return an appropriate trigger/endpoint when called with region and options", () => {
        const result = functions
          .region("us-east1")
          .runWith({
            timeoutSeconds: 90,
            memory: "256MB",
          })
          .pubsub.schedule("every 5 minutes")
          .onRun(() => null);
        expect(result.__trigger.schedule).to.deep.equal({
          schedule: "every 5 minutes",
        });
        expect(result.__trigger.regions).to.deep.equal(["us-east1"]);
        expect(result.__trigger.availableMemoryMb).to.deep.equal(256);
        expect(result.__trigger.timeout).to.deep.equal("90s");

        expect(result.__endpoint.scheduleTrigger).to.deep.equal({
          ...MINIMAL_SCHEDULE_TRIGGER,
          schedule: "every 5 minutes",
        });
        expect(result.__endpoint.region).to.deep.equal(["us-east1"]);
        expect(result.__endpoint.availableMemoryMb).to.deep.equal(256);
        expect(result.__endpoint.timeoutSeconds).to.deep.equal(90);
      });

      it("should return an appropriate trigger/endpoint when called with region, timeZone, and options", () => {
        const result = functions
          .region("us-east1")
          .runWith({
            timeoutSeconds: 90,
            memory: "256MB",
          })
          .pubsub.schedule("every 5 minutes")
          .timeZone("America/New_York")
          .onRun(() => null);
        expect(result.__trigger.schedule).to.deep.equal({
          schedule: "every 5 minutes",
          timeZone: "America/New_York",
        });
        expect(result.__trigger.regions).to.deep.equal(["us-east1"]);
        expect(result.__trigger.availableMemoryMb).to.deep.equal(256);
        expect(result.__trigger.timeout).to.deep.equal("90s");

        expect(result.__endpoint.scheduleTrigger).to.deep.equal({
          ...MINIMAL_SCHEDULE_TRIGGER,
          schedule: "every 5 minutes",
          timeZone: "America/New_York",
        });
        expect(result.__endpoint.region).to.deep.equal(["us-east1"]);
        expect(result.__endpoint.availableMemoryMb).to.deep.equal(256);
        expect(result.__endpoint.timeoutSeconds).to.deep.equal(90);
      });

      it("should return an appropriate trigger/endpoint when called with region, options and retryConfig", () => {
        const retryConfig = {
          retryCount: 3,
          maxRetryDuration: "10 minutes",
          minBackoffDuration: "10 minutes",
          maxBackoffDuration: "10 minutes",
          maxDoublings: 5,
        };
        const result = functions
          .region("us-east1")
          .runWith({
            timeoutSeconds: 90,
            memory: "256MB",
          })
          .pubsub.schedule("every 5 minutes")
          .retryConfig(retryConfig)
          .onRun(() => null);
        expect(result.__trigger.schedule).to.deep.equal({
          schedule: "every 5 minutes",
          retryConfig,
        });
        expect(result.__trigger.labels).to.deep.equal({
          "deployment-scheduled": "true",
        });
        expect(result.__trigger.regions).to.deep.equal(["us-east1"]);
        expect(result.__trigger.availableMemoryMb).to.deep.equal(256);
        expect(result.__trigger.timeout).to.deep.equal("90s");

        expect(result.__endpoint.scheduleTrigger).to.deep.equal({
          ...MINIMAL_SCHEDULE_TRIGGER,
          schedule: "every 5 minutes",
          timeZone: RESET_VALUE,
          retryConfig: {
            ...retryConfig,
          },
        });
        expect(result.__endpoint.region).to.deep.equal(["us-east1"]);
        expect(result.__endpoint.availableMemoryMb).to.deep.equal(256);
        expect(result.__endpoint.timeoutSeconds).to.deep.equal(90);
      });

      it("should return an appropriate trigger/endpoint when called with region, options, retryConfig, and timeZone", () => {
        const retryConfig = {
          retryCount: 3,
          maxRetryDuration: "10 minutes",
          minBackoffDuration: "10 minutes",
          maxBackoffDuration: "10 minutes",
          maxDoublings: 5,
        };
        const result = functions
          .region("us-east1")
          .runWith({
            timeoutSeconds: 90,
            memory: "256MB",
          })
          .pubsub.schedule("every 5 minutes")
          .timeZone("America/New_York")
          .retryConfig(retryConfig)
          .onRun(() => null);
        expect(result.__trigger.schedule).to.deep.equal({
          schedule: "every 5 minutes",
          timeZone: "America/New_York",
          retryConfig,
        });
        expect(result.__trigger.labels).to.deep.equal({
          "deployment-scheduled": "true",
        });
        expect(result.__trigger.regions).to.deep.equal(["us-east1"]);
        expect(result.__trigger.availableMemoryMb).to.deep.equal(256);
        expect(result.__trigger.timeout).to.deep.equal("90s");

        expect(result.__endpoint.scheduleTrigger).to.deep.equal({
          ...MINIMAL_SCHEDULE_TRIGGER,
          schedule: "every 5 minutes",
          timeZone: "America/New_York",
          retryConfig: {
            ...retryConfig,
          },
        });
        expect(result.__endpoint.region).to.deep.equal(["us-east1"]);
        expect(result.__endpoint.availableMemoryMb).to.deep.equal(256);
        expect(result.__endpoint.timeoutSeconds).to.deep.equal(90);
      });

      it("should return an appropriate endpoint when called with preserveExternalChanges", () => {
        const result = functions
          .region("us-east1")
          .runWith({
            timeoutSeconds: 90,
            memory: "256MB",
            preserveExternalChanges: true,
          })
          .pubsub.schedule("every 5 minutes")
          .timeZone("America/New_York")
          .onRun(() => null);

        expect(result.__endpoint).to.deep.eq({
          platform: "gcfv1",
          labels: {},
          region: ["us-east1"],
          availableMemoryMb: 256,
          timeoutSeconds: 90,
          scheduleTrigger: {
            schedule: "every 5 minutes",
            timeZone: "America/New_York",
            retryConfig: {},
          },
        });
      });
    });
  });

  describe("process.env.GCLOUD_PROJECT not set", () => {
    it("should not throw if __trigger is not accessed", () => {
      expect(() => pubsub.topic("toppy").onPublish(() => null)).to.not.throw(Error);
    });

    it("should throw when trigger is accessed", () => {
      expect(() => pubsub.topic("toppy").onPublish(() => null).__trigger).to.throw(Error);
    });

    it("should throw when endpoint is accessed", () => {
      expect(() => pubsub.topic("toppy").onPublish(() => null).__endpoint).to.throw(Error);
    });

    it("should not throw when #run is called", () => {
      const cf = pubsub.topic("toppy").onPublish(() => null);
      expect(cf.run).to.not.throw(Error);
    });
  });
});
