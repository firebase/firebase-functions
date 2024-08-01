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
import { PathPattern } from "../../../src/common/utilities/path-pattern";
import * as database from "../../../src/v2/providers/database";
import { expectType } from "../../common/metaprogramming";
import { MINIMAL_V2_ENDPOINT } from "../../fixtures";
import { CloudEvent, onInit } from "../../../src/v2/core";

const RAW_RTDB_EVENT: database.RawRTDBCloudEvent = {
  data: {
    ["@type"]: "type.googleapis.com/google.events.firebase.database.v1.ReferenceEventData",
    data: {},
    delta: {}
  },
  firebasedatabasehost: "firebaseio.com",
  instance: "my-instance",
  ref: "foo/bar",
  location: "us-central1",
  id: "id",
  source: "source",
  specversion: "1.0",
  time: "time",
  type: "type"
};

describe("database", () => {
  describe("makeParams", () => {
    it("should make params with basic path", () => {
      const event: database.RawRTDBCloudEvent = {
        ...RAW_RTDB_EVENT,
        ref: "match_a/something/else/nothing/end/match_b"
      };

      expect(
        database.makeParams(
          event,
          new PathPattern("{a}/something/else/*/end/{b}"),
          new PathPattern("*")
        )
      ).to.deep.equal({
        a: "match_a",
        b: "match_b"
      });
    });

    it("should make params with multi segment path", () => {
      const event: database.RawRTDBCloudEvent = {
        ...RAW_RTDB_EVENT,
        ref: "something/is/a/thing/else/match_a/hello/match_b/world"
      };

      expect(
        database.makeParams(
          event,
          new PathPattern("something/**/else/{a}/hello/{b}/world"),
          new PathPattern("*")
        )
      ).to.deep.equal({
        a: "match_a",
        b: "match_b"
      });
    });

    it("should make params with multi segment path capture", () => {
      const event: database.RawRTDBCloudEvent = {
        ...RAW_RTDB_EVENT,
        ref: "something/is/a/thing/else/match_a/hello/match_b/world"
      };

      expect(
        database.makeParams(
          event,
          new PathPattern("something/{path=**}/else/{a}/hello/{b}/world"),
          new PathPattern("*")
        )
      ).to.deep.equal({
        path: "is/a/thing",
        a: "match_a",
        b: "match_b"
      });
    });

    it("should make params for a full path and instance", () => {
      const event: database.RawRTDBCloudEvent = {
        ...RAW_RTDB_EVENT,
        ref: "something/is/a/thing/else/match_a/hello/match_b/world"
      };

      expect(
        database.makeParams(
          event,
          new PathPattern("something/{path=**}/else/{a}/hello/{b}/world"),
          new PathPattern("*")
        )
      ).to.deep.equal({
        path: "is/a/thing",
        a: "match_a",
        b: "match_b"
      });
    });
  });

  describe("getOpts", () => {
    it("should return opts when passed in a path", () => {
      expect(database.getOpts("/foo/{bar}/")).to.deep.equal({
        path: "foo/{bar}",
        instance: "*",
        opts: {}
      });
    });

    it("should return opts when passed in an options object", () => {
      expect(
        database.getOpts({
          ref: "/foo/{bar}/",
          region: "us-central1"
        })
      ).to.deep.equal({
        path: "foo/{bar}",
        instance: "*",
        opts: {
          region: "us-central1"
        }
      });
    });
  });

  describe("makeEndpoint", () => {
    it("should create an endpoint with an instance wildcard", () => {
      const ep = database.makeEndpoint(
        database.writtenEventType,
        {
          region: "us-central1",
          labels: { 1: "2" }
        },
        new PathPattern("foo/bar"),
        new PathPattern("*")
      );

      expect(ep).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {
          1: "2"
        },
        region: ["us-central1"],
        eventTrigger: {
          eventType: database.writtenEventType,
          eventFilters: {},
          eventFilterPathPatterns: {
            ref: "foo/bar",
            instance: "*"
          },
          retry: false
        }
      });
    });

    it("should create an endpoint without an instance wildcard", () => {
      const ep = database.makeEndpoint(
        database.writtenEventType,
        {
          region: "us-central1",
          labels: { 1: "2" }
        },
        new PathPattern("foo/bar"),
        new PathPattern("my-instance")
      );

      expect(ep).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {
          1: "2"
        },
        region: ["us-central1"],
        eventTrigger: {
          eventType: database.writtenEventType,
          eventFilters: {
            instance: "my-instance"
          },
          eventFilterPathPatterns: {
            ref: "foo/bar"
          },
          retry: false
        }
      });
    });
  });

  describe("onChangedOperation", () => {
    it("should create a function for a written event", () => {
      const func = database.onChangedOperation(database.writtenEventType, "/foo/{bar}/", () => 2);

      expect(func.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        eventTrigger: {
          eventType: database.writtenEventType,
          eventFilters: {},
          eventFilterPathPatterns: {
            ref: "foo/{bar}",
            instance: "*"
          },
          retry: false
        }
      });
    });

    it("should create a function for a updated event", () => {
      const func = database.onChangedOperation(database.updatedEventType, "/foo/{bar}/", () => 2);

      expect(func.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        eventTrigger: {
          eventType: database.updatedEventType,
          eventFilters: {},
          eventFilterPathPatterns: {
            ref: "foo/{bar}",
            instance: "*"
          },
          retry: false
        }
      });
    });

    it("should create a complex function", () => {
      const func = database.onChangedOperation(
        database.writtenEventType,
        {
          ref: "/foo/{path=**}/{bar}/",
          instance: "my-instance",
          region: "us-central1",
          cpu: "gcf_gen1",
          minInstances: 2
        },
        () => 2
      );

      expect(func.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        cpu: "gcf_gen1",
        minInstances: 2,
        region: ["us-central1"],
        labels: {},
        eventTrigger: {
          eventType: database.writtenEventType,
          eventFilters: {
            instance: "my-instance"
          },
          eventFilterPathPatterns: {
            ref: "foo/{path=**}/{bar}"
          },
          retry: false
        }
      });
    });

    it("should supply retry", () => {
      const func = database.onChangedOperation(
        database.writtenEventType,
        {
          ref: "/foo/{path=**}/{bar}/",
          instance: "my-instance",
          region: "us-central1",
          cpu: "gcf_gen1",
          minInstances: 2,
          retry: true,
        },
        () => 2
      );

      expect(func.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        cpu: "gcf_gen1",
        minInstances: 2,
        region: ["us-central1"],
        labels: {},
        eventTrigger: {
          eventType: database.writtenEventType,
          eventFilters: {
            instance: "my-instance"
          },
          eventFilterPathPatterns: {
            ref: "foo/{path=**}/{bar}"
          },
          retry: true
        }
      });
    });
  });

  describe("onOperation", () => {
    it("should create a function for a created event", () => {
      const func = database.onOperation(database.createdEventType, "/foo/{bar}/", () => 2);

      expect(func.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        eventTrigger: {
          eventType: database.createdEventType,
          eventFilters: {},
          eventFilterPathPatterns: {
            ref: "foo/{bar}",
            instance: "*"
          },
          retry: false
        }
      });
    });

    it("should create a function for a deleted event", () => {
      const func = database.onOperation(database.deletedEventType, "/foo/{bar}/", () => 2);

      expect(func.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        eventTrigger: {
          eventType: database.deletedEventType,
          eventFilters: {},
          eventFilterPathPatterns: {
            ref: "foo/{bar}",
            instance: "*"
          },
          retry: false
        }
      });
    });

    it("should create a complex function", () => {
      const func = database.onOperation(
        database.createdEventType,
        {
          ref: "/foo/{path=**}/{bar}/",
          instance: "my-instance",
          region: "us-central1",
          cpu: "gcf_gen1",
          minInstances: 2
        },
        () => 2
      );

      expect(func.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        cpu: "gcf_gen1",
        minInstances: 2,
        region: ["us-central1"],
        labels: {},
        eventTrigger: {
          eventType: database.createdEventType,
          eventFilters: {
            instance: "my-instance"
          },
          eventFilterPathPatterns: {
            ref: "foo/{path=**}/{bar}"
          },
          retry: false
        }
      });
    });
  });

  describe("onValueWritten", () => {
    it("should create a function with a reference", () => {
      const func = database.onValueWritten("/foo/{bar}/", (event) => {
        expectType<{ bar: string }>(event.params);
      });

      expect(func.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        eventTrigger: {
          eventType: database.writtenEventType,
          eventFilters: {},
          eventFilterPathPatterns: {
            ref: "foo/{bar}",
            instance: "*"
          },
          retry: false
        }
      });
    });

    it("should create a function with opts", () => {
      const func = database.onValueWritten(
        {
          ref: "/foo/{path=**}/{bar}/",
          instance: "my-instance",
          region: "us-central1",
          cpu: "gcf_gen1",
          minInstances: 2
        },
        (event) => {
          expectType<{ path: string; bar: string }>(event.params);
        }
      );

      expect(func.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        cpu: "gcf_gen1",
        minInstances: 2,
        region: ["us-central1"],
        labels: {},
        eventTrigger: {
          eventType: database.writtenEventType,
          eventFilters: {
            instance: "my-instance"
          },
          eventFilterPathPatterns: {
            ref: "foo/{path=**}/{bar}"
          },
          retry: false
        }
      });
    });

    it("calls init function", async () => {
      const event: CloudEvent<string> = {
        specversion: "1.0",
        id: "id",
        source: "source",
        type: "type",
        time: "now",
        data: "data"
      };

      let hello;
      onInit(() => (hello = "world"));
      expect(hello).to.be.undefined;
      await database.onValueWritten("path", () => null)(event);
      expect(hello).to.equal("world");
    });
  });

  describe("onValueCreated", () => {
    it("should create a function with a reference", () => {
      const func = database.onValueCreated("/foo/{bar}/", (event) => {
        expectType<{ bar: string }>(event.params);
      });

      expect(func.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        eventTrigger: {
          eventType: database.createdEventType,
          eventFilters: {},
          eventFilterPathPatterns: {
            ref: "foo/{bar}",
            instance: "*"
          },
          retry: false
        }
      });
    });

    it("should create a function with opts", () => {
      const func = database.onValueCreated(
        {
          ref: "/foo/{path=**}/{bar}/",
          instance: "instance",
          region: "us-central1",
          cpu: "gcf_gen1",
          minInstances: 2
        },
        (event) => {
          expectType<{
            path: string;
            bar: string;
          }>(event.params);
        }
      );

      expect(func.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        cpu: "gcf_gen1",
        minInstances: 2,
        region: ["us-central1"],
        labels: {},
        eventTrigger: {
          eventType: database.createdEventType,
          eventFilters: {
            instance: "instance"
          },
          eventFilterPathPatterns: {
            ref: "foo/{path=**}/{bar}"
          },
          retry: false
        }
      });
    });

    it("calls init function", async () => {
      const event: CloudEvent<string> = {
        specversion: "1.0",
        id: "id",
        source: "source",
        type: "type",
        time: "now",
        data: "data"
      };

      let hello;
      onInit(() => (hello = "world"));
      expect(hello).to.be.undefined;
      await database.onValueCreated("path", () => null)(event);
      expect(hello).to.equal("world");
    });
  });

  describe("onValueUpdated", () => {
    it("should create a function with a reference", () => {
      const func = database.onValueUpdated("/foo/{bar}/", (event) => {
        expectType<{ bar: string }>(event.params);
      });

      expect(func.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        eventTrigger: {
          eventType: database.updatedEventType,
          eventFilters: {},
          eventFilterPathPatterns: {
            ref: "foo/{bar}",
            instance: "*"
          },
          retry: false
        }
      });
    });

    it("should create a function with opts", () => {
      const func = database.onValueUpdated(
        {
          ref: "/foo/{path=**}/{bar}/",
          instance: "my-instance",
          region: "us-central1",
          cpu: "gcf_gen1",
          minInstances: 2
        },
        (event) => {
          expectType<{ path: string; bar: string }>(event.params);
        }
      );

      expect(func.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        cpu: "gcf_gen1",
        minInstances: 2,
        region: ["us-central1"],
        labels: {},
        eventTrigger: {
          eventType: database.updatedEventType,
          eventFilters: {
            instance: "my-instance"
          },
          eventFilterPathPatterns: {
            ref: "foo/{path=**}/{bar}"
          },
          retry: false
        }
      });
    });

    it("calls init function", async () => {
      const event: CloudEvent<string> = {
        specversion: "1.0",
        id: "id",
        source: "source",
        type: "type",
        time: "now",
        data: "data"
      };

      let hello;
      onInit(() => (hello = "world"));
      expect(hello).to.be.undefined;
      await database.onValueUpdated("path", () => null)(event);
      expect(hello).to.equal("world");
    });
  });

  describe("onValueDeleted", () => {
    it("should create a function with a reference", () => {
      const func = database.onValueDeleted("/foo/{bar}/", (event) => {
        expectType<{ bar: string }>(event.params);
      });

      expect(func.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        eventTrigger: {
          eventType: database.deletedEventType,
          eventFilters: {},
          eventFilterPathPatterns: {
            ref: "foo/{bar}",
            instance: "*"
          },
          retry: false
        }
      });
    });

    it("should create a function with opts", () => {
      const func = database.onValueDeleted(
        {
          ref: "/foo/{path=**}/{bar}/",
          instance: "my-instance",
          region: "us-central1",
          cpu: "gcf_gen1",
          minInstances: 2
        },
        (event) => {
          expectType<{ path: string; bar: string }>(event.params);
        }
      );

      expect(func.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        cpu: "gcf_gen1",
        minInstances: 2,
        region: ["us-central1"],
        labels: {},
        eventTrigger: {
          eventType: database.deletedEventType,
          eventFilters: {
            instance: "my-instance"
          },
          eventFilterPathPatterns: {
            ref: "foo/{path=**}/{bar}"
          },
          retry: false
        }
      });
    });

    it("calls init function", async () => {
      const event: CloudEvent<string> = {
        specversion: "1.0",
        id: "id",
        source: "source",
        type: "type",
        time: "now",
        data: "data"
      };

      let hello;
      onInit(() => (hello = "world"));
      expect(hello).to.be.undefined;
      await database.onValueDeleted("path", () => null)(event);
      expect(hello).to.equal("world");
    });
  });
});
