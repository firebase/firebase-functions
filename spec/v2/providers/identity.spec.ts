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
import { defineString, clearParams } from "../../../src/params";

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

const opts: identity.BlockingOptions = {
  accessToken: true,
  refreshToken: false,
  minInstances: 1,
  region: REGION,
};

describe("identity", () => {
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

  describe("onUserCreated", () => {
    it("should create a function with only a handler", () => {
      const func = identity.onUserCreated(() => null);
      expect(func.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        eventTrigger: {
          eventType: "google.firebase.auth.user.v2.created",
          eventFilters: {},
          retry: false,
          region: "global",
        },
      });
    });

    it("should handle tenantId options", () => {
      const func = identity.onUserCreated({ tenantId: "my-tenant" }, () => null);
      expect(func.__endpoint.eventTrigger?.eventFilters?.tenantid).to.equal("my-tenant");
    });

    it("should handle IS_NOT_TENANT option", () => {
      const func = identity.onUserCreated({ tenantId: identity.IS_NOT_TENANT }, () => null);
      expect(func.__endpoint.eventTrigger?.eventFilters?.tenantid).to.equal("");
    });

    it("should populate project and tenantId on execution", () => {
      let called = false;
      const func = identity.onUserCreated((event) => {
        called = true;
        expect(event.project).to.equal("my-project");
        expect(event.tenantId).to.equal("my-tenant");
        expect(event.data.uid).to.equal("my-uid");
        expect(event.data.metadata.creationTime).to.equal("Sun, 01 Jan 2023 00:00:00 GMT");
        return null;
      });

      const mockEvent = {
        specversion: "1.0" as const,
        source: "//identitytoolkit.googleapis.com/projects/my-project",
        id: "event-id",
        type: "google.firebase.auth.user.v2.created",
        time: new Date().toISOString(),
        data: {
          uid: "my-uid",
          metadata: {
            createdAt: "2023-01-01T00:00:00Z",
          },
        } as any,
        tenantid: "my-tenant",
      };

      func(mockEvent);
      expect(called).to.be.true;
    });

    it("should handle source without project ID", () => {
      let called = false;
      const func = identity.onUserCreated((event) => {
        called = true;
        expect("project" in event).to.be.false;
        return null;
      });

      // This test case verifies defense against pathological changes or unexpected custom emulator event sources that we do not expect in production.
      const mockEvent = {
        specversion: "1.0" as const,
        source: "//identitytoolkit.googleapis.com/something-else",
        id: "event-id",
        type: "google.firebase.auth.user.v2.created",
        time: new Date().toISOString(),
        data: {} as any,
      };

      func(mockEvent);
      expect(called).to.be.true;
    });

    it("should handle missing tenantid", () => {
      let called = false;
      const func = identity.onUserCreated((event) => {
        called = true;
        expect("tenantId" in event).to.be.false;
        return null;
      });

      const mockEvent = {
        specversion: "1.0" as const,
        source: "//identitytoolkit.googleapis.com/projects/my-project",
        id: "event-id",
        type: "google.firebase.auth.user.v2.created",
        time: new Date().toISOString(),
        data: {} as any,
      };

      func(mockEvent);
      expect(called).to.be.true;
    });

    it("should handle Expression for tenantId", () => {
      const param = defineString("MY_TENANT");
      const func = identity.onUserCreated({ tenantId: param }, () => null);
      expect(func.__endpoint.eventTrigger?.eventFilters?.tenantid).to.equal(param);
      clearParams();
    });

    it("should unpack user from protobuf v2 value envelope with normalized fields", () => {
      let called = false;
      const func = identity.onUserCreated((event) => {
        called = true;
        expect(event.data.uid).to.equal("1qEveruhwnbiG1B9taHIBMmOVE83");
        expect(event.data.email).to.equal("testuser@example.com");
        expect(event.data.emailVerified).to.be.true;
        expect(event.data.displayName).to.equal("Test User");
        expect(event.data.photoURL).to.equal("http://example.com/photo.jpg");
        expect(event.data.metadata.creationTime).to.equal("Sun, 01 Jan 2023 00:00:00 GMT");
        return null;
      });

      const mockEvent = {
        specversion: "1.0" as const,
        source: "//identitytoolkit.googleapis.com/projects/my-project",
        id: "event-id",
        type: "google.firebase.auth.user.v2.created",
        time: new Date().toISOString(),
        data: {
          value: {
            uid: "1qEveruhwnbiG1B9taHIBMmOVE83",
            email: "testuser@example.com",
            emailVerified: true,
            displayName: "Test User",
            photoURL: "http://example.com/photo.jpg",
            metadata: {
              createTime: "2023-01-01T00:00:00Z",
            },
          },
        } as any,
      };

      func(mockEvent);
      expect(called).to.be.true;
    });
  });

  describe("onUserDeleted", () => {
    it("should create a function with only a handler", () => {
      const func = identity.onUserDeleted(() => null);
      expect(func.__endpoint).to.deep.equal({
        ...MINIMAL_V2_ENDPOINT,
        platform: "gcfv2",
        labels: {},
        eventTrigger: {
          eventType: "google.firebase.auth.user.v2.deleted",
          eventFilters: {},
          retry: false,
          region: "global",
        },
      });
    });

    it("should handle tenantId options", () => {
      const func = identity.onUserDeleted({ tenantId: "my-tenant" }, () => null);
      expect(func.__endpoint.eventTrigger?.eventFilters?.tenantid).to.equal("my-tenant");
    });

    it("should handle IS_NOT_TENANT option", () => {
      const func = identity.onUserDeleted({ tenantId: identity.IS_NOT_TENANT }, () => null);
      expect(func.__endpoint.eventTrigger?.eventFilters?.tenantid).to.equal("");
    });

    it("should populate project and tenantId on execution", () => {
      let called = false;
      const func = identity.onUserDeleted((event) => {
        called = true;
        expect(event.project).to.equal("my-project");
        expect(event.tenantId).to.equal("my-tenant");
        expect(event.data.uid).to.equal("my-uid");
        expect(event.data.metadata.creationTime).to.equal("Sun, 01 Jan 2023 00:00:00 GMT");
        return null;
      });

      const mockEvent = {
        specversion: "1.0" as const,
        source: "//identitytoolkit.googleapis.com/projects/my-project",
        id: "event-id",
        type: "google.firebase.auth.user.v2.deleted",
        time: new Date().toISOString(),
        data: {
          uid: "my-uid",
          metadata: {
            createdAt: "2023-01-01T00:00:00Z",
          },
        } as any,
        tenantid: "my-tenant",
      };

      func(mockEvent);
      expect(called).to.be.true;
    });

    it("should unpack user from protobuf v2 oldValue envelope on execution", () => {
      let called = false;
      const func = identity.onUserDeleted((event) => {
        called = true;
        expect(event.data.uid).to.equal("my-deleted-uid");
        expect(event.data.email).to.equal("deleted@example.com");
        expect(event.data.metadata.creationTime).to.equal("Sun, 01 Jan 2023 00:00:00 GMT");
        return null;
      });

      const mockEvent = {
        specversion: "1.0" as const,
        source: "//identitytoolkit.googleapis.com/projects/my-project",
        id: "event-id",
        type: "google.firebase.auth.user.v2.deleted",
        time: new Date().toISOString(),
        data: {
          oldValue: {
            uid: "my-deleted-uid",
            email: "deleted@example.com",
            metadata: {
              createTime: "2023-01-01T00:00:00Z",
            },
          },
        } as any,
      };

      func(mockEvent);
      expect(called).to.be.true;
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
});
