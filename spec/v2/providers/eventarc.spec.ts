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
import * as options from "../../../src/v2/options";
import * as eventarc from "../../../src/v2/providers/eventarc";
import { FULL_OPTIONS } from "./fixtures";
import { FULL_ENDPOINT, MINIMAL_V2_ENDPOINT } from "../../fixtures";

const ENDPOINT_EVENT_TRIGGER = {
  eventType: "event-type",
  retry: false,
  eventFilters: {},
};

describe("v2/eventarc", () => {
  describe("onCustomEventPublished", () => {
    beforeEach(() => {
      process.env.GCLOUD_PROJECT = "aProject";
    });

    afterEach(() => {
      options.setGlobalOptions({});
      delete process.env.GCLOUD_PROJECT;
    });

    it("should create a minimal trigger/endpoint with default channel", () => {
      const result = eventarc.onCustomEventPublished("event-type", () => 42);

      expect(result.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        eventTrigger: {
          ...ENDPOINT_EVENT_TRIGGER,
          channel: "locations/us-central1/channels/firebase",
        },
      });
    });

    it("should create a minimal trigger/endpoint with opts", () => {
      const result = eventarc.onCustomEventPublished(
        { eventType: "event-type", region: "us-west1" },
        () => 42
      );

      expect(result.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        eventTrigger: {
          ...ENDPOINT_EVENT_TRIGGER,
          channel: "locations/us-central1/channels/firebase",
        },
        region: ["us-west1"],
      });
    });

    it("should create a minimal trigger with channel with opts", () => {
      const result = eventarc.onCustomEventPublished(
        {
          eventType: "event-type",
          channel: "locations/us-west1/channels/my-channel",
          filters: { foo: "bar" },
        },
        () => 42
      );

      expect(result.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        eventTrigger: {
          ...ENDPOINT_EVENT_TRIGGER,
          channel: "locations/us-west1/channels/my-channel",
          eventFilters: {
            foo: "bar",
          },
        },
      });
    });

    it("should create a complex trigger/endpoint with appropriate values", () => {
      const result = eventarc.onCustomEventPublished(
        {
          ...FULL_OPTIONS,
          eventType: "event-type",
          channel: "locations/us-west1/channels/my-channel",
        },
        () => 42
      );

      expect(result.__endpoint).to.deep.equal({
        ...FULL_ENDPOINT,
        platform: "gcfv2",
        eventTrigger: {
          ...ENDPOINT_EVENT_TRIGGER,
          channel: "locations/us-west1/channels/my-channel",
        },
      });
    });

    it("should merge options and globalOptions", () => {
      options.setGlobalOptions({
        concurrency: 20,
        region: "europe-west1",
        minInstances: 1,
      });

      const result = eventarc.onCustomEventPublished(
        {
          eventType: "event-type",
          channel: "locations/us-west1/channels/my-channel",
          region: "us-west1",
          minInstances: 3,
        },
        () => 42
      );

      expect(result.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        concurrency: 20,
        minInstances: 3,
        region: ["us-west1"],
        labels: {},
        eventTrigger: {
          ...ENDPOINT_EVENT_TRIGGER,
          channel: "locations/us-west1/channels/my-channel",
        },
      });
    });
  });
});
