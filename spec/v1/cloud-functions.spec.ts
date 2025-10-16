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

import {
  onInit,
  Event,
  EventContext,
  makeCloudFunction,
  MakeCloudFunctionArgs,
  RESET_VALUE,
} from "../../src/v1";
import { MINIMAL_V1_ENDPOINT } from "../fixtures";

describe("makeCloudFunction", () => {
  const cloudFunctionArgs: MakeCloudFunctionArgs<any> = {
    provider: "mock.provider",
    eventType: "mock.event",
    service: "service",
    triggerResource: () => "resource",
    handler: () => null,
    legacyEventType: "providers/provider/eventTypes/event",
  };

  it("calls init function", async () => {
    const test: Event = {
      context: {
        eventId: "00000",
        timestamp: "2016-11-04T21:29:03.496Z",
        eventType: "provider.event",
        resource: {
          service: "provider",
          name: "resource",
        },
      },
      data: "data",
    };
    const cf = makeCloudFunction({
      provider: "mock.provider",
      eventType: "mock.event",
      service: "service",
      triggerResource: () => "resource",
      handler: () => null,
    });

    let hello;
    onInit(() => (hello = "world"));
    expect(hello).is.undefined;
    await cf(test.data, test.context);
    expect(hello).equals("world");
  });

  it("should put a __trigger/__endpoint on the returned CloudFunction", () => {
    const cf = makeCloudFunction({
      provider: "mock.provider",
      eventType: "mock.event",
      service: "service",
      triggerResource: () => "resource",
      handler: () => null,
    });

    expect(cf.__trigger).to.deep.equal({
      eventTrigger: {
        eventType: "mock.provider.mock.event",
        resource: "resource",
        service: "service",
      },
    });

    expect(cf.__endpoint).to.deep.equal({
      ...MINIMAL_V1_ENDPOINT,
      platform: "gcfv1",
      eventTrigger: {
        eventType: "mock.provider.mock.event",
        eventFilters: {
          resource: "resource",
        },
        retry: false,
      },
      labels: {},
    });
  });

  it("should have legacy event type in __trigger/__endpoint if provided", () => {
    const cf = makeCloudFunction(cloudFunctionArgs);

    expect(cf.__trigger).to.deep.equal({
      eventTrigger: {
        eventType: "providers/provider/eventTypes/event",
        resource: "resource",
        service: "service",
      },
    });

    expect(cf.__endpoint).to.deep.equal({
      ...MINIMAL_V1_ENDPOINT,
      platform: "gcfv1",
      eventTrigger: {
        eventType: "providers/provider/eventTypes/event",
        eventFilters: {
          resource: "resource",
        },
        retry: false,
      },
      labels: {},
    });
  });

  it("should include converted options in __endpoint", () => {
    const cf = makeCloudFunction({
      provider: "mock.provider",
      eventType: "mock.event",
      service: "service",
      triggerResource: () => "resource",
      handler: () => null,
      options: {
        timeoutSeconds: 10,
        regions: ["us-central1"],
        memory: "128MB",
        serviceAccount: "foo@google.com",
        secrets: ["MY_SECRET"],
      },
    });

    expect(cf.__endpoint).to.deep.equal({
      ...MINIMAL_V1_ENDPOINT,
      platform: "gcfv1",
      timeoutSeconds: 10,
      region: ["us-central1"],
      availableMemoryMb: 128,
      serviceAccountEmail: "foo@google.com",
      eventTrigger: {
        eventType: "mock.provider.mock.event",
        eventFilters: {
          resource: "resource",
        },
        retry: false,
      },
      secretEnvironmentVariables: [{ key: "MY_SECRET" }],
      labels: {},
    });
  });

  it("should set retry given failure policy in __endpoint", () => {
    const cf = makeCloudFunction({
      provider: "mock.provider",
      eventType: "mock.event",
      service: "service",
      triggerResource: () => "resource",
      handler: () => null,
      options: { failurePolicy: { retry: {} } },
    });

    expect(cf.__endpoint).to.deep.equal({
      ...MINIMAL_V1_ENDPOINT,
      platform: "gcfv1",
      eventTrigger: {
        eventType: "mock.provider.mock.event",
        eventFilters: {
          resource: "resource",
        },
        retry: true,
      },
      labels: {},
    });
  });

  it("should setup a scheduleTrigger in __endpoint given a schedule", () => {
    const schedule = {
      schedule: "every 5 minutes",
      retryConfig: { retryCount: 3 },
      timeZone: "America/New_York",
    };
    const cf = makeCloudFunction({
      provider: "mock.provider",
      eventType: "mock.event",
      service: "service",
      triggerResource: () => "resource",
      handler: () => null,
      options: {
        schedule,
      },
    });
    expect(cf.__endpoint).to.deep.equal({
      ...MINIMAL_V1_ENDPOINT,
      platform: "gcfv1",
      scheduleTrigger: {
        ...schedule,
        attemptDeadline: RESET_VALUE,
        retryConfig: {
          ...schedule.retryConfig,
          maxBackoffDuration: RESET_VALUE,
          maxDoublings: RESET_VALUE,
          maxRetryDuration: RESET_VALUE,
          minBackoffDuration: RESET_VALUE,
        },
      },
      labels: {},
    });
  });

  it("should setup a scheduleTrigger in __endpoint given a schedule and preserveExternalChanges", () => {
    const schedule = {
      schedule: "every 5 minutes",
      retryConfig: { retryCount: 3 },
      timeZone: "America/New_York",
    };
    const cf = makeCloudFunction({
      provider: "mock.provider",
      eventType: "mock.event",
      service: "service",
      triggerResource: () => "resource",
      handler: () => null,
      options: {
        schedule,
        preserveExternalChanges: true,
      },
    });
    expect(cf.__endpoint).to.deep.equal({
      platform: "gcfv1",
      scheduleTrigger: {
        ...schedule,
        retryConfig: {
          ...schedule.retryConfig,
        },
      },
      labels: {},
    });
  });

  it("should construct the right context for event", () => {
    const args: any = {
      ...cloudFunctionArgs,
      handler: (data: any, context: EventContext) => context,
    };
    const cf = makeCloudFunction(args);
    const test: Event = {
      context: {
        eventId: "00000",
        timestamp: "2016-11-04T21:29:03.496Z",
        eventType: "provider.event",
        resource: {
          service: "provider",
          name: "resource",
        },
      },
      data: "data",
    };

    return expect(cf(test.data, test.context)).to.eventually.deep.equal({
      eventId: "00000",
      timestamp: "2016-11-04T21:29:03.496Z",
      eventType: "provider.event",
      resource: {
        service: "provider",
        name: "resource",
      },
      params: {},
    });
  });

  it("should throw error when context.params accessed in handler environment", () => {
    const args: any = {
      ...cloudFunctionArgs,
      handler: (data: any, context: EventContext) => context,
      triggerResource: () => null,
    };
    const cf = makeCloudFunction(args);
    const test: Event = {
      context: {
        eventId: "00000",
        timestamp: "2016-11-04T21:29:03.496Z",
        eventType: "provider.event",
        resource: {
          service: "provider",
          name: "resource",
        },
      },
      data: "test data",
    };

    return cf(test.data, test.context).then((result) => {
      expect(result).to.deep.equal({
        eventId: "00000",
        timestamp: "2016-11-04T21:29:03.496Z",
        eventType: "provider.event",
        resource: {
          service: "provider",
          name: "resource",
        },
      });
      expect(() => result.params).to.throw(Error);
    });
  });
});

describe("makeParams", () => {
  const args: MakeCloudFunctionArgs<any> = {
    provider: "provider",
    eventType: "event",
    service: "service",
    triggerResource: () => "projects/_/instances/pid/ref/{foo}/nested/{bar}",
    handler: (data, context) => context.params,
    legacyEventType: "legacyEvent",
  };
  const cf = makeCloudFunction(args);

  it("should construct params from the event resource of events", () => {
    const testEvent: Event = {
      context: {
        eventId: "111",
        timestamp: "2016-11-04T21:29:03.496Z",
        resource: {
          service: "service",
          name: "projects/_/instances/pid/ref/a/nested/b",
        },
        eventType: "event",
      },
      data: "data",
    };

    return expect(cf(testEvent.data, testEvent.context)).to.eventually.deep.equal({
      foo: "a",
      bar: "b",
    });
  });
});

describe("makeAuth and makeAuthType", () => {
  const args: MakeCloudFunctionArgs<any> = {
    provider: "google.firebase.database",
    eventType: "event",
    service: "service",
    triggerResource: () => "projects/_/instances/pid/ref/{foo}/nested/{bar}",
    handler: (data, context) => {
      return {
        auth: context.auth,
        authType: context.authType,
      };
    },
  };
  const cf = makeCloudFunction(args);

  it("should construct correct auth and authType for admin user", () => {
    const testEvent = {
      data: "data",
      context: {
        auth: {
          admin: true,
        },
      },
    };

    return expect(cf(testEvent.data, testEvent.context)).to.eventually.deep.equal({
      auth: undefined,
      authType: "ADMIN",
    });
  });

  it("should construct correct auth and authType for unauthenticated user", () => {
    const testEvent = {
      data: "data",
      context: {
        auth: {
          admin: false,
        },
      },
    };

    return expect(cf(testEvent.data, testEvent.context)).to.eventually.deep.equal({
      auth: null,
      authType: "UNAUTHENTICATED",
    });
  });

  it("should construct correct auth and authType for a user", () => {
    const testEvent = {
      data: "data",
      context: {
        auth: {
          admin: false,
          variable: {
            uid: "user",
            provider: "google",
            token: {
              sub: "user",
            },
          },
        },
      },
    };

    return expect(cf(testEvent.data, testEvent.context)).to.eventually.deep.equal({
      auth: {
        uid: "user",
        token: {
          sub: "user",
        },
      },
      authType: "USER",
    });
  });
});
