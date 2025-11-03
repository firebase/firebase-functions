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
import * as identity from "../../../src/v2/providers/identity";
import { MINIMAL_V2_ENDPOINT } from "../../fixtures";
import { onInit } from "../../../src/v2/core";
import { MockRequest } from "../../fixtures/mockrequest";
import { runHandler } from "../../helper";

const IDENTITY_TOOLKIT_API = "identitytoolkit.googleapis.com";
const REGION = "us-west1";

const BEFORE_CREATE_TRIGGER = {
  eventType: "providers/cloud.auth/eventTypes/user.beforeCreate",
  options: {
    accessToken: false,
    idToken: false,
    refreshToken: false,
  },
};

const BEFORE_SIGN_IN_TRIGGER = {
  eventType: "providers/cloud.auth/eventTypes/user.beforeSignIn",
  options: {
    accessToken: false,
    idToken: false,
    refreshToken: false,
  },
};

const BEFORE_EMAIL_TRIGGER = {
  eventType: "providers/cloud.auth/eventTypes/user.beforeSendEmail",
  options: {},
};

const BEFORE_SMS_TRIGGER = {
  eventType: "providers/cloud.auth/eventTypes/user.beforeSendSms",
  options: {},
};

const USER_CREATED_EVENT = "google.firebase.auth.user.v2.created";
const USER_DELETED_EVENT = "google.firebase.auth.user.v2.deleted";

const opts: identity.BlockingOptions = {
  accessToken: true,
  refreshToken: false,
  minInstances: 1,
  region: REGION,
};

describe("identity", () => {
  beforeEach(() => {
    process.env.GCLOUD_PROJECT = "aProject";
  });

  afterEach(() => {
    delete process.env.GCLOUD_PROJECT;
  });

  describe("beforeUserCreated", () => {
    it("should accept a handler", () => {
      const fn = identity.beforeUserCreated(() => Promise.resolve());

      expect(fn.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        blockingTrigger: BEFORE_CREATE_TRIGGER,
      });
      expect(fn.__requiredAPIs).to.deep.equal([
        {
          api: IDENTITY_TOOLKIT_API,
          reason: "Needed for auth blocking functions",
        },
      ]);
    });

    it("should accept options and a handler", () => {
      const fn = identity.beforeUserCreated(opts, () => Promise.resolve());

      expect(fn.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        minInstances: 1,
        region: [REGION],
        blockingTrigger: {
          ...BEFORE_CREATE_TRIGGER,
          options: {
            ...BEFORE_CREATE_TRIGGER.options,
            accessToken: true,
          },
        },
      });
      expect(fn.__requiredAPIs).to.deep.equal([
        {
          api: IDENTITY_TOOLKIT_API,
          reason: "Needed for auth blocking functions",
        },
      ]);
    });

    it("calls init function", async () => {
      const func = identity.beforeUserCreated(() => null);

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

  describe("beforeUserSignedIn", () => {
    it("should accept a handler", () => {
      const fn = identity.beforeUserSignedIn(() => Promise.resolve());

      expect(fn.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        blockingTrigger: BEFORE_SIGN_IN_TRIGGER,
      });
      expect(fn.__requiredAPIs).to.deep.equal([
        {
          api: IDENTITY_TOOLKIT_API,
          reason: "Needed for auth blocking functions",
        },
      ]);
    });

    it("should accept options and a handler", () => {
      const fn = identity.beforeUserSignedIn(opts, () => Promise.resolve());

      expect(fn.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        minInstances: 1,
        region: [REGION],
        blockingTrigger: {
          ...BEFORE_SIGN_IN_TRIGGER,
          options: {
            ...BEFORE_SIGN_IN_TRIGGER.options,
            accessToken: true,
          },
        },
      });
      expect(fn.__requiredAPIs).to.deep.equal([
        {
          api: IDENTITY_TOOLKIT_API,
          reason: "Needed for auth blocking functions",
        },
      ]);
    });

    it("calls init function", async () => {
      const func = identity.beforeUserSignedIn(() => null);

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

  describe("beforeEmailSent", () => {
    it("should accept a handler", () => {
      const fn = identity.beforeEmailSent(() => Promise.resolve());

      expect(fn.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        blockingTrigger: BEFORE_EMAIL_TRIGGER,
      });
      expect(fn.__requiredAPIs).to.deep.equal([
        {
          api: IDENTITY_TOOLKIT_API,
          reason: "Needed for auth blocking functions",
        },
      ]);
    });

    it("should accept options and a handler", () => {
      const fn = identity.beforeEmailSent(
        { region: opts.region, minInstances: opts.minInstances },
        () => Promise.resolve()
      );

      expect(fn.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        minInstances: 1,
        region: [REGION],
        blockingTrigger: {
          ...BEFORE_EMAIL_TRIGGER,
        },
      });
      expect(fn.__requiredAPIs).to.deep.equal([
        {
          api: IDENTITY_TOOLKIT_API,
          reason: "Needed for auth blocking functions",
        },
      ]);
    });
  });

  describe("beforeSmsSent", () => {
    it("should accept a handler", () => {
      const fn = identity.beforeSmsSent(() => Promise.resolve());

      expect(fn.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        blockingTrigger: BEFORE_SMS_TRIGGER,
      });
      expect(fn.__requiredAPIs).to.deep.equal([
        {
          api: IDENTITY_TOOLKIT_API,
          reason: "Needed for auth blocking functions",
        },
      ]);
    });

    it("should accept options and a handler", () => {
      const fn = identity.beforeSmsSent(
        { region: opts.region, minInstances: opts.minInstances },
        () => Promise.resolve()
      );

      expect(fn.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        minInstances: 1,
        region: [REGION],
        blockingTrigger: {
          ...BEFORE_SMS_TRIGGER,
        },
      });
      expect(fn.__requiredAPIs).to.deep.equal([
        {
          api: IDENTITY_TOOLKIT_API,
          reason: "Needed for auth blocking functions",
        },
      ]);
    });
  });

  describe("beforeOperation", () => {
    it("should handle eventType and handler for before create events", () => {
      const fn = identity.beforeOperation("beforeCreate", () => Promise.resolve(), undefined);

      expect(fn.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        blockingTrigger: BEFORE_CREATE_TRIGGER,
      });
      expect(fn.__requiredAPIs).to.deep.equal([
        {
          api: IDENTITY_TOOLKIT_API,
          reason: "Needed for auth blocking functions",
        },
      ]);
    });

    it("should handle eventType and handler for before sign in events", () => {
      const fn = identity.beforeOperation("beforeSignIn", () => Promise.resolve(), undefined);

      expect(fn.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        blockingTrigger: BEFORE_SIGN_IN_TRIGGER,
      });
      expect(fn.__requiredAPIs).to.deep.equal([
        {
          api: IDENTITY_TOOLKIT_API,
          reason: "Needed for auth blocking functions",
        },
      ]);
    });

    it("should handle eventType and handler for before email events", () => {
      const fn = identity.beforeOperation("beforeSendEmail", () => Promise.resolve(), undefined);

      expect(fn.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        blockingTrigger: BEFORE_EMAIL_TRIGGER,
      });
      expect(fn.__requiredAPIs).to.deep.equal([
        {
          api: IDENTITY_TOOLKIT_API,
          reason: "Needed for auth blocking functions",
        },
      ]);
    });

    it("should handle eventType and handler for before email events", () => {
      const fn = identity.beforeOperation("beforeSendEmail", () => Promise.resolve(), undefined);

      expect(fn.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        blockingTrigger: BEFORE_EMAIL_TRIGGER,
      });
      expect(fn.__requiredAPIs).to.deep.equal([
        {
          api: IDENTITY_TOOLKIT_API,
          reason: "Needed for auth blocking functions",
        },
      ]);
    });
    it("should handle eventType, options, and handler for before create events", () => {
      const fn = identity.beforeOperation("beforeCreate", opts, () => Promise.resolve());

      expect(fn.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        minInstances: 1,
        region: [REGION],
        blockingTrigger: {
          ...BEFORE_CREATE_TRIGGER,
          options: {
            ...BEFORE_CREATE_TRIGGER.options,
            accessToken: true,
          },
        },
      });
      expect(fn.__requiredAPIs).to.deep.equal([
        {
          api: IDENTITY_TOOLKIT_API,
          reason: "Needed for auth blocking functions",
        },
      ]);
    });

    it("should handle eventType, options, and handler for before sign in events", () => {
      const fn = identity.beforeOperation("beforeSignIn", opts, () => Promise.resolve());

      expect(fn.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        minInstances: 1,
        region: [REGION],
        blockingTrigger: {
          ...BEFORE_SIGN_IN_TRIGGER,
          options: {
            ...BEFORE_SIGN_IN_TRIGGER.options,
            accessToken: true,
          },
        },
      });
      expect(fn.__requiredAPIs).to.deep.equal([
        {
          api: IDENTITY_TOOLKIT_API,
          reason: "Needed for auth blocking functions",
        },
      ]);
    });

    it("should handle eventType, options, and handler for before send email events", () => {
      const fn = identity.beforeOperation("beforeSendEmail", opts, () => Promise.resolve());

      expect(fn.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        minInstances: 1,
        region: [REGION],
        blockingTrigger: {
          ...BEFORE_EMAIL_TRIGGER,
        },
      });
      expect(fn.__requiredAPIs).to.deep.equal([
        {
          api: IDENTITY_TOOLKIT_API,
          reason: "Needed for auth blocking functions",
        },
      ]);
    });
  });

  describe("getOpts", () => {
    it("should parse an empty object", () => {
      const internalOpts = identity.getOpts({});

      expect(internalOpts).to.deep.equal({
        opts: {},
        accessToken: false,
        idToken: false,
        refreshToken: false,
      });
    });

    it("should parse global options", () => {
      const internalOpts = identity.getOpts({ region: "us-central1", cpu: 2 });

      expect(internalOpts).to.deep.equal({
        opts: {
          region: "us-central1",
          cpu: 2,
        },
        accessToken: false,
        idToken: false,
        refreshToken: false,
      });
    });

    it("should a full options", () => {
      const internalOpts = identity.getOpts({
        region: "us-central1",
        cpu: 2,
        accessToken: true,
        idToken: false,
        refreshToken: true,
      });

      expect(internalOpts).to.deep.equal({
        opts: {
          region: "us-central1",
          cpu: 2,
        },
        accessToken: true,
        idToken: false,
        refreshToken: true,
      });
    });
  });

  describe("onUserCreated", () => {
    it("should create a minimal trigger/endpoint", () => {
      const result = identity.onUserCreated(() => Promise.resolve());


      expect(result.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        eventTrigger: {
          eventType: USER_CREATED_EVENT,
          retry: false,
          eventFilters: {},
        },
      });
    });

    it("should create a complex trigger/endpoint with tenantId", () => {
      const result = identity.onUserCreated(
        { ...opts, tenantId: "tid", retry: true },
        () => Promise.resolve()
      );

      expect(result.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        minInstances: 1,
        region: [REGION],
        labels: {},
        eventTrigger: {
          eventType: USER_CREATED_EVENT,
          retry: true,
          eventFilters: {
            tenantId: "tid",
          },
        },
      });
    });
  });

  describe("onUserDeleted", () => {
    it("should create a minimal trigger/endpoint", () => {
      const result = identity.onUserDeleted(() => Promise.resolve());


      expect(result.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        eventTrigger: {
          eventType: USER_DELETED_EVENT,
          retry: false,
          eventFilters: {},
        },
      });
    });

    it("should create a complex trigger/endpoint with tenantId", () => {
      const result = identity.onUserDeleted(
        { ...opts, tenantId: "tid", retry: true },
        () => Promise.resolve()
      );

      expect(result.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        minInstances: 1,
        region: [REGION],
        labels: {},
        eventTrigger: {
          eventType: USER_DELETED_EVENT,
          retry: true,
          eventFilters: {
            tenantId: "tid",
          },
        },
      });
    });
  });

  describe("onOperation", () => {
    it("should unwrap data.value if present", async () => {
      const handler = (event: identity.AuthEvent<identity.User>) => {
        return event.data.uid;
      };
      const func = identity.onUserCreated(handler);

      const event = {
        specversion: "1.0",
        id: "event-id",
        source: "firebase-auth",
        type: "google.firebase.auth.user.v2.created",
        time: "2023-10-31T00:00:00Z",
        data: {
          value: {
            uid: "test-uid",
          },
        },
      };

      const result = await func(event as any);
      expect(result).to.equal("test-uid");
    });

    it("should unwrap data.oldValue if present", async () => {
      const handler = (event: identity.AuthEvent<identity.User>) => {
        return event.data.uid;
      };
      const func = identity.onUserDeleted(handler);

      const event = {
        specversion: "1.0",
        id: "event-id",
        source: "firebase-auth",
        type: "google.firebase.auth.user.v2.deleted",
        time: "2023-10-31T00:00:00Z",
        data: {
          oldValue: {
            uid: "deleted-uid",
            email: "deleted@example.com",
          },
        },
      };

      const result = await func(event as any);
      expect(result).to.equal("deleted-uid");
    });

    it("should normalize user data (e.g. createTime -> creationTime)", async () => {
      const handler = (event: identity.AuthEvent<identity.User>) => {
        return event.data.metadata.creationTime;
      };
      const func = identity.onUserCreated(handler);

      const event = {
        specversion: "1.0",
        id: "event-id",
        source: "firebase-auth",
        type: "google.firebase.auth.user.v2.created",
        time: "2023-10-31T00:00:00Z",
        data: {
          uid: "test-uid",
          metadata: {
            createTime: "2023-10-31T00:00:00Z",
            lastSignInTime: "2023-10-31T01:00:00Z",
          },
        },
      };

      const result = await func(event as any);
      expect(result).to.equal("Tue, 31 Oct 2023 00:00:00 GMT");
    });
  });
});
