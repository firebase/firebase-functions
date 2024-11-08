import { expect } from "chai";
import { App, initializeApp } from "firebase-admin/app";
import * as appCheck from "firebase-admin/app-check";
import * as sinon from "sinon";
import * as nock from "nock";

import { getApp, setApp } from "../../../src/common/app";
import * as debug from "../../../src/common/debug";
import * as https from "../../../src/common/providers/https";
import * as mocks from "../../fixtures/credential/key.json";
import {
  expectedResponseHeaders,
  generateAppCheckToken,
  generateIdToken,
  generateUnsignedAppCheckToken,
  generateUnsignedIdToken,
  mockFetchAppCheckPublicJwks,
  mockFetchPublicKeys,
  mockRequest,
} from "../../fixtures/mockrequest";
import { checkAppCheckContext, checkAuthContext, runHandler, RunHandlerResult } from "../../helper";

/**
 * A CallTest is a specification for a test of a callable function that
 * simulates triggering the http endpoint, and checks that the request
 * and response are properly converted to their http equivalents.
 */
interface CallTest {
  // An http request, mocking a subset of https.Request.
  httpRequest: any;

  // The expected format of the request passed to the handler.
  expectedData: any;

  // The function to execute with the request.
  callableFunction: (data: any, context: https.CallableContext) => any;

  callableFunction2: (request: https.CallableRequest<any>) => any;

  callableOption?: https.CallableOptions;

  // The expected shape of the http response returned to the callable SDK.
  expectedHttpResponse: RunHandlerResult;
}

// Runs a CallTest test.
async function runCallableTest(test: CallTest): Promise<any> {
  const opts = {
    cors: { origin: true, methods: "POST" },
    ...test.callableOption,
  };
  const callableFunctionV1 = https.onCallHandler(
    opts,
    (data, context) => {
      expect(data).to.deep.equal(test.expectedData);
      return test.callableFunction(data, context);
    },
    "gcfv1"
  );

  const responseV1 = await runHandler(callableFunctionV1, test.httpRequest);

  expect(responseV1.body).to.deep.equal(JSON.stringify(test.expectedHttpResponse.body));
  expect(responseV1.headers).to.deep.equal(test.expectedHttpResponse.headers);
  expect(responseV1.status).to.equal(test.expectedHttpResponse.status);

  const callableFunctionV2 = https.onCallHandler(
    opts,
    (request) => {
      expect(request.data).to.deep.equal(test.expectedData);
      return test.callableFunction2(request);
    },
    "gcfv2"
  );

  const responseV2 = await runHandler(callableFunctionV2, test.httpRequest);

  expect(responseV2.body).to.deep.equal(JSON.stringify(test.expectedHttpResponse.body));
  expect(responseV2.headers).to.deep.equal(test.expectedHttpResponse.headers);
  expect(responseV2.status).to.equal(test.expectedHttpResponse.status);
}

describe("onCallHandler", () => {
  let app: App;

  before(() => {
    const credential = {
      getAccessToken: () => {
        return Promise.resolve({
          expires_in: 1000,
          access_token: "fake",
        });
      },
      getCertificate: () => {
        return {
          projectId: "aProjectId",
        };
      },
    };
    app = initializeApp(
      {
        projectId: "aProjectId",
        credential,
      },
      "test-app"
    );
    setApp(app);
  });

  after(() => {
    setApp(undefined);
  });

  it("should handle success", () => {
    return runCallableTest({
      httpRequest: mockRequest({ foo: "bar" }),
      expectedData: { foo: "bar" },
      callableFunction: () => ({ baz: "qux" }),
      callableFunction2: () => ({ baz: "qux" }),
      expectedHttpResponse: {
        status: 200,
        headers: expectedResponseHeaders,
        body: { result: { baz: "qux" } },
      },
    });
  });

  it("should handle null data and return", () => {
    return runCallableTest({
      httpRequest: mockRequest(null),
      expectedData: null,
      callableFunction: () => null,
      callableFunction2: () => null,
      expectedHttpResponse: {
        status: 200,
        headers: expectedResponseHeaders,
        body: { result: null },
      },
    });
  });

  it("should handle void return", () => {
    return runCallableTest({
      httpRequest: mockRequest(null),
      expectedData: null,
      callableFunction: () => {
        return;
      },
      callableFunction2: () => {
        return;
      },
      expectedHttpResponse: {
        status: 200,
        headers: expectedResponseHeaders,
        body: { result: null },
      },
    });
  });

  it("should reject bad method", () => {
    const req = mockRequest(null);
    req.method = "GET";
    return runCallableTest({
      httpRequest: req,
      expectedData: null,
      callableFunction: () => {
        return;
      },
      callableFunction2: () => {
        return;
      },
      expectedHttpResponse: {
        status: 400,
        headers: expectedResponseHeaders,
        body: {
          error: { message: "Bad Request", status: "INVALID_ARGUMENT" },
        },
      },
    });
  });

  it("should ignore charset", () => {
    return runCallableTest({
      httpRequest: mockRequest(null, "application/json; charset=utf-8"),
      expectedData: null,
      callableFunction: () => {
        return;
      },
      callableFunction2: () => {
        return;
      },
      expectedHttpResponse: {
        status: 200,
        headers: expectedResponseHeaders,
        body: { result: null },
      },
    });
  });

  it("should reject bad content type", () => {
    return runCallableTest({
      httpRequest: mockRequest(null, "text/plain"),
      expectedData: null,
      callableFunction: () => {
        return;
      },
      callableFunction2: () => {
        return;
      },
      expectedHttpResponse: {
        status: 400,
        headers: expectedResponseHeaders,
        body: {
          error: { message: "Bad Request", status: "INVALID_ARGUMENT" },
        },
      },
    });
  });

  it("should reject extra body fields", () => {
    const req = mockRequest(null);
    req.body.extra = "bad";
    return runCallableTest({
      httpRequest: req,
      expectedData: null,
      callableFunction: () => {
        return;
      },
      callableFunction2: () => {
        return;
      },
      expectedHttpResponse: {
        status: 400,
        headers: expectedResponseHeaders,
        body: {
          error: { message: "Bad Request", status: "INVALID_ARGUMENT" },
        },
      },
    });
  });

  it("should handle unhandled error", () => {
    return runCallableTest({
      httpRequest: mockRequest(null),
      expectedData: null,
      callableFunction: () => {
        throw new Error(`ceci n'est pas une error`);
      },
      callableFunction2: () => {
        throw new Error(`cece n'est pas une error`);
      },
      expectedHttpResponse: {
        status: 500,
        headers: expectedResponseHeaders,
        body: { error: { message: "INTERNAL", status: "INTERNAL" } },
      },
    });
  });

  it("should handle unknown error status", () => {
    return runCallableTest({
      httpRequest: mockRequest(null),
      expectedData: null,
      callableFunction: () => {
        throw new https.HttpsError("THIS_IS_NOT_VALID" as any, "nope");
      },
      callableFunction2: () => {
        throw new https.HttpsError("THIS_IS_NOT_VALID" as any, "nope");
      },
      expectedHttpResponse: {
        status: 500,
        headers: expectedResponseHeaders,
        body: { error: { message: "INTERNAL", status: "INTERNAL" } },
      },
    });
  });

  it("should handle well-formed error", () => {
    return runCallableTest({
      httpRequest: mockRequest(null),
      expectedData: null,
      callableFunction: () => {
        throw new https.HttpsError("not-found", "i am error");
      },
      callableFunction2: () => {
        throw new https.HttpsError("not-found", "i am error");
      },
      expectedHttpResponse: {
        status: 404,
        headers: expectedResponseHeaders,
        body: { error: { message: "i am error", status: "NOT_FOUND" } },
      },
    });
  });

  describe("auth", () => {
    let mock: nock.Scope;

    before(() => {
      mock = mockFetchPublicKeys();
    });

    after(() => {
      mock.done();
    });

    it("should handle auth", async () => {
      const projectId = getApp().options.projectId;
      const idToken = generateIdToken(projectId);
      await runCallableTest({
        httpRequest: mockRequest(null, "application/json", {
          authorization: "Bearer " + idToken,
        }),
        expectedData: null,
        callableFunction: (data, context) => {
          checkAuthContext(context, projectId, mocks.user_id);
          return null;
        },
        callableFunction2: (request) => {
          checkAuthContext(request, projectId, mocks.user_id);
          return null;
        },
        expectedHttpResponse: {
          status: 200,
          headers: expectedResponseHeaders,
          body: { result: null },
        },
      });
    });

    it("should handle auth - case insensitive", async () => {
      const projectId = getApp().options.projectId;
      const idToken = generateIdToken(projectId);
      await runCallableTest({
        httpRequest: mockRequest(null, "application/json", {
          authorization: "bearer " + idToken,
        }),
        expectedData: null,
        callableFunction: (data, context) => {
          checkAuthContext(context, projectId, mocks.user_id);
          return null;
        },
        callableFunction2: (request) => {
          checkAuthContext(request, projectId, mocks.user_id);
          return null;
        },
        expectedHttpResponse: {
          status: 200,
          headers: expectedResponseHeaders,
          body: { result: null },
        },
      });
    });

    it("should reject auth with incorrect authorization header", async () => {
      const projectId = getApp().options.projectId;
      await runCallableTest({
        httpRequest: mockRequest(null, "application/json", {
          authorization: "Beaver heyyall",
        }),
        expectedData: null,
        callableFunction: (data, context) => {
          checkAuthContext(context, projectId, mocks.user_id);
          return null;
        },
        callableFunction2: (request) => {
          checkAuthContext(request, projectId, mocks.user_id);
          return null;
        },
        expectedHttpResponse: {
          status: 401,
          headers: expectedResponseHeaders,
          body: {
            error: {
              message: "Unauthenticated",
              status: "UNAUTHENTICATED",
            },
          },
        },
      });
    });

    it("should reject bad auth with bad signature", async () => {
      const projectId = getApp().options.projectId;
      const idToken = generateUnsignedIdToken(projectId);
      await runCallableTest({
        httpRequest: mockRequest(null, "application/json", {
          authorization: "Bearer " + idToken,
        }),
        expectedData: null,
        callableFunction: () => {
          return;
        },
        callableFunction2: () => {
          return;
        },
        expectedHttpResponse: {
          status: 401,
          headers: expectedResponseHeaders,
          body: {
            error: {
              message: "Unauthenticated",
              status: "UNAUTHENTICATED",
            },
          },
        },
      });
    });
  });

  describe("AppCheck", () => {
    describe("verify token", () => {
      let mock: nock.Scope;

      before(() => {
        mock = mockFetchAppCheckPublicJwks();
      });

      after(() => {
        mock.done();
      });

      it("should handle AppCheck token", async () => {
        const projectId = getApp().options.projectId;
        const appId = "123:web:abc";
        const appCheckToken = generateAppCheckToken(projectId, appId);
        await runCallableTest({
          httpRequest: mockRequest(null, "application/json", { appCheckToken }),
          expectedData: null,
          callableOption: {
            cors: { origin: true, methods: "POST" },
            enforceAppCheck: true,
          },
          callableFunction: (data, context) => {
            checkAppCheckContext(context, projectId, appId);
            return null;
          },
          callableFunction2: (request) => {
            checkAppCheckContext(request, projectId, appId);
            return null;
          },
          expectedHttpResponse: {
            status: 200,
            headers: expectedResponseHeaders,
            body: { result: null },
          },
        });
      });

      it("should reject bad AppCheck token", async () => {
        const projectId = getApp().options.projectId;
        const appId = "123:web:abc";
        const appCheckToken = generateUnsignedAppCheckToken(projectId, appId);
        await runCallableTest({
          httpRequest: mockRequest(null, "application/json", { appCheckToken }),
          expectedData: null,
          callableOption: {
            cors: { origin: true, methods: "POST" },
            enforceAppCheck: true,
          },
          callableFunction: () => {
            return;
          },
          callableFunction2: () => {
            return;
          },
          expectedHttpResponse: {
            status: 401,
            headers: expectedResponseHeaders,
            body: {
              error: {
                message: "Unauthenticated",
                status: "UNAUTHENTICATED",
              },
            },
          },
        });
      });

      it("should handle bad AppCheck token with enforcement disabled", async () => {
        await runCallableTest({
          httpRequest: mockRequest(null, "application/json", {
            appCheckToken: "FAKE",
          }),
          expectedData: null,
          callableOption: {
            cors: { origin: true, methods: "POST" },
            enforceAppCheck: false,
          },
          callableFunction: (data, context) => {
            expect(context.app).to.be.undefined;
            return;
          },
          callableFunction2: (request) => {
            expect(request.app).to.be.undefined;
            return;
          },
          expectedHttpResponse: {
            status: 200,
            headers: expectedResponseHeaders,
            body: { result: null },
          },
        });
      });

      it("should handle bad AppCheck token with enforcement enabled", async () => {
        await runCallableTest({
          httpRequest: mockRequest(null, "application/json", {
            appCheckToken: "FAKE",
          }),
          expectedData: null,
          callableOption: {
            cors: { origin: true, methods: "POST" },
            enforceAppCheck: true,
          },
          callableFunction: () => {
            return;
          },
          callableFunction2: () => {
            return;
          },
          expectedHttpResponse: {
            status: 401,
            headers: expectedResponseHeaders,
            body: {
              error: {
                message: "Unauthenticated",
                status: "UNAUTHENTICATED",
              },
            },
          },
        });
      });

      it("should handle no AppCheck token with enforcement enabled", async () => {
        await runCallableTest({
          httpRequest: mockRequest(null, "application/json", {
            appCheckToken: "MISSING",
          }),
          expectedData: null,
          callableFunction: () => {
            return;
          },
          callableFunction2: () => {
            return;
          },
          callableOption: {
            cors: { origin: true, methods: "POST" },
            enforceAppCheck: true,
          },
          expectedHttpResponse: {
            status: 401,
            headers: expectedResponseHeaders,
            body: {
              error: {
                message: "Unauthenticated",
                status: "UNAUTHENTICATED",
              },
            },
          },
        });
      });

      it("should handle instance id", async () => {
        await runCallableTest({
          httpRequest: mockRequest(null, "application/json", {
            instanceIdToken: "iid-token",
          }),
          expectedData: null,
          callableFunction: (data, context) => {
            expect(context.auth).to.be.undefined;
            expect(context.instanceIdToken).to.equal("iid-token");
            return null;
          },
          callableFunction2: (request) => {
            expect(request.auth).to.be.undefined;
            expect(request.instanceIdToken).to.equal("iid-token");
            return null;
          },
          expectedHttpResponse: {
            status: 200,
            headers: expectedResponseHeaders,
            body: { result: null },
          },
        });
      });

      it("should expose raw request", async () => {
        const mockReq = mockRequest(null, "application/json", {});
        await runCallableTest({
          httpRequest: mockReq,
          expectedData: null,
          callableFunction: (data, context) => {
            expect(context.rawRequest).to.not.be.undefined;
            expect(context.rawRequest).to.equal(mockReq);
            return null;
          },
          callableFunction2: (request) => {
            expect(request.rawRequest).to.not.be.undefined;
            expect(request.rawRequest).to.equal(mockReq);
            return null;
          },
          expectedHttpResponse: {
            status: 200,
            headers: expectedResponseHeaders,
            body: { result: null },
          },
        });
      });

      describe("skip token verification debug mode support", () => {
        before(() => {
          sinon
            .stub(debug, "isDebugFeatureEnabled")
            .withArgs("skipTokenVerification")
            .returns(true);
        });

        after(() => {
          sinon.verifyAndRestore();
        });

        it("should skip auth token verification", async () => {
          const projectId = getApp().options.projectId;
          const idToken = generateUnsignedIdToken(projectId);
          await runCallableTest({
            httpRequest: mockRequest(null, "application/json", {
              authorization: "Bearer " + idToken,
            }),
            expectedData: null,
            callableFunction: (data, context) => {
              checkAuthContext(context, projectId, mocks.user_id);
              return null;
            },
            callableFunction2: (request) => {
              checkAuthContext(request, projectId, mocks.user_id);
              return null;
            },
            expectedHttpResponse: {
              status: 200,
              headers: expectedResponseHeaders,
              body: { result: null },
            },
          });
        });

        it("should skip app check token verification", async () => {
          const projectId = getApp().options.projectId;
          const appId = "123:web:abc";
          const appCheckToken = generateUnsignedAppCheckToken(projectId, appId);
          await runCallableTest({
            httpRequest: mockRequest(null, "application/json", { appCheckToken }),
            expectedData: null,
            callableFunction: (data, context) => {
              checkAppCheckContext(context, projectId, appId);
              return null;
            },
            callableFunction2: (request) => {
              checkAppCheckContext(request, projectId, appId);
              return null;
            },
            expectedHttpResponse: {
              status: 200,
              headers: expectedResponseHeaders,
              body: { result: null },
            },
          });
        });
      });
    });

    describe("consume token", () => {
      let getAppCheckStub: sinon.SinonStub;

      before(() => {
        getAppCheckStub = sinon.stub(appCheck, "getAppCheck");
      });

      after(() => {
        sinon.verifyAndRestore();
      });

      it("should throw error when using unsupported version of the admin sdk", async () => {
        // Older versions of the admin SDK implements verifyToken with 1 argument.
        getAppCheckStub.returns({
          verifyToken: (token) => ({
            token,
            appId: "abc",
          }),
        });

        const projectId = getApp().options.projectId;
        const appId = "123:web:abc";
        const appCheckToken = generateAppCheckToken(projectId, appId);
        await runCallableTest({
          httpRequest: mockRequest(null, "application/json", { appCheckToken }),
          expectedData: null,
          callableFunction: () => {
            return;
          },
          callableFunction2: () => {
            return;
          },
          callableOption: {
            cors: { origin: true, methods: "POST" },
            enforceAppCheck: true,
            consumeAppCheckToken: true,
          },
          expectedHttpResponse: {
            status: 500,
            headers: expectedResponseHeaders,
            body: {
              error: {
                message: "Internal Error",
                status: "INTERNAL",
              },
            },
          },
        });
      });

      it("should consume the app check token", async () => {
        getAppCheckStub.returns({
          verifyToken: (token, opts) => {
            expect(opts.consume).to.be.true;
            return {
              token,
              appId: "abc",
            };
          },
        });

        const projectId = getApp().options.projectId;
        const appId = "123:web:abc";
        const appCheckToken = generateAppCheckToken(projectId, appId);
        await runCallableTest({
          httpRequest: mockRequest(null, "application/json", { appCheckToken }),
          expectedData: null,
          callableFunction: () => {
            return;
          },
          callableFunction2: () => {
            return;
          },
          callableOption: {
            cors: { origin: true, methods: "POST" },
            enforceAppCheck: true,
            consumeAppCheckToken: true,
          },
          expectedHttpResponse: {
            status: 200,
            headers: expectedResponseHeaders,
            body: { result: null },
          },
        });
      });
    });
  });

  describe("Streaming callables", () => {
    it("returns data in SSE format for requests Accept: text/event-stream header", async () => {
      const mockReq = mockRequest(
        { message: "hello streaming" },
        "application/json",
        {},
        { accept: "text/event-stream" }
      );
      const fn = https.onCallHandler(
        {
          cors: { origin: true, methods: "POST" },
        },
        (req, resp) => {
          resp.write("hello");
          return "world";
        },
        "gcfv2"
      );

      const resp = await runHandler(fn, mockReq as any);
      const data = [`data: {"message":"hello"}`, `data: {"result":"world"}`];
      expect(resp.body).to.equal([...data, ""].join("\n"));
    });

    it("returns error in SSE format", async () => {
      const mockReq = mockRequest(
        { message: "hello streaming" },
        "application/json",
        {},
        { accept: "text/event-stream" }
      );
      const fn = https.onCallHandler(
        {
          cors: { origin: true, methods: "POST" },
        },
        () => {
          throw new Error("BOOM");
        },
        "gcfv2"
      );

      const resp = await runHandler(fn, mockReq as any);
      const data = [`data: {"error":{"message":"INTERNAL","status":"INTERNAL"}}`];
      expect(resp.body).to.equal([...data, ""].join("\n"));
    });

    it("stops processing when client disconnects", async () => {
      const mockReq = mockRequest(
        { message: "test abort" },
        "application/json",
        {},
        { accept: "text/event-stream" }
      ) as any;

      const fn = https.onCallHandler(
        {
          cors: { origin: true, methods: "POST" },
        },
        (req, resp) => {
          resp.write("initial message");
          mockReq.emit("close");
          resp.write("should not be sent");
          return "done";
        },
        "gcfv2"
      );

      const resp = await runHandler(fn, mockReq);

      expect(resp.body).to.equal(`data: {"message":"initial message"}\n`);
    });

    describe("Heartbeats", () => {
      let clock: sinon.SinonFakeTimers;

      beforeEach(() => {
        clock = sinon.useFakeTimers();
      });

      afterEach(() => {
        clock.restore();
      });

      it("sends heartbeat messages at specified interval", async () => {
        const mockReq = mockRequest(
          { message: "test heartbeat" },
          "application/json",
          {},
          { accept: "text/event-stream" }
        );

        const fn = https.onCallHandler(
          {
            cors: { origin: true, methods: "POST" },
            heartbeatSeconds: 5,
          },
          async () => {
            // Simulate long-running operation
            await new Promise((resolve) => setTimeout(resolve, 11_000));
            return "done";
          },
          "gcfv2"
        );

        const handlerPromise = runHandler(fn, mockReq as any);
        await clock.tickAsync(11_000);
        const resp = await handlerPromise;
        expect(resp.body).to.include(': ping\n: ping\ndata: {"result":"done"}');
      });

      it("respects null heartbeatSeconds option", async () => {
        const mockReq = mockRequest(
          { message: "test no heartbeat" },
          "application/json",
          {},
          { accept: "text/event-stream" }
        );

        const fn = https.onCallHandler(
          {
            cors: { origin: true, methods: "POST" },
            heartbeatSeconds: null,
          },
          async () => {
            await new Promise((resolve) => setTimeout(resolve, 31_000));
            return "done";
          },
          "gcfv2"
        );

        const handlerPromise = runHandler(fn, mockReq as any);
        await clock.tickAsync(31_000);
        const resp = await handlerPromise;
        expect(resp.body).to.include('data: {"result":"done"}');
      });
    });
  });
});

describe("encoding/decoding", () => {
  it("encodes null", () => {
    expect(https.encode(null)).to.be.null;
    expect(https.encode(undefined)).to.be.null;
  });

  it("encodes int", () => {
    expect(https.encode(1)).to.equal(1);
    // Number isn't allowed in our own codebase, but we need to test it, in case
    // a user passes one in. There's no reason not to support it, and we don't
    // want to unintentionally encode them as {}.
    // tslint:disable-next-line
    expect(https.encode(Number(1))).to.equal(1);
  });

  it("decodes int", () => {
    expect(https.decode(1)).to.equal(1);
  });

  it("encodes long", () => {
    expect(https.encode(-9223372036854775000)).to.equal(-9223372036854775000);
  });

  it("decodes long", () => {
    expect(
      https.decode({
        "@type": "type.googleapis.com/google.protobuf.Int64Value",
        value: "-9223372036854775000",
      })
    ).to.equal(-9223372036854775000);
  });

  it("encodes unsigned long", () => {
    expect(https.encode(9223372036854800000)).to.equal(9223372036854800000);
  });

  it("decodes unsigned long", () => {
    expect(
      https.decode({
        "@type": "type.googleapis.com/google.protobuf.UInt64Value",
        value: "9223372036854800000",
      })
    ).to.equal(9223372036854800000);
  });

  it("encodes double", () => {
    expect(https.encode(1.2)).to.equal(1.2);
  });
  it("decodes double", () => {
    expect(https.decode(1.2)).to.equal(1.2);
  });

  it("encodes string", () => {
    expect(https.encode("hello")).to.equal("hello");
  });

  it("decodes string", () => {
    expect(https.decode("hello")).to.equal("hello");
  });

  it("encodes array", () => {
    // TODO(klimt): Make this test more interesting once there's some type
    // that needs encoding that can be created from JavaScript.
    expect(https.encode([1, "2", [3, 4]])).to.deep.equal([1, "2", [3, 4]]);
  });

  it("decodes array", () => {
    expect(
      https.decode([
        1,
        "2",
        [
          3,
          {
            value: "1099511627776",
            "@type": "type.googleapis.com/google.protobuf.Int64Value",
          },
        ],
      ])
    ).to.deep.equal([1, "2", [3, 1099511627776]]);
  });

  it("encodes object", () => {
    // TODO(klimt): Make this test more interesting once there's some type
    // that needs encoding that can be created from JavaScript.
    expect(
      https.encode({
        foo: 1,
        bar: "hello",
        baz: [1, 2, 3],
      })
    ).to.deep.equal({
      foo: 1,
      bar: "hello",
      baz: [1, 2, 3],
    });
  });

  it("decodes object", () => {
    expect(
      https.decode({
        foo: 1,
        bar: "hello",
        baz: [
          1,
          2,
          {
            value: "1099511627776",
            "@type": "type.googleapis.com/google.protobuf.Int64Value",
          },
        ],
      })
    ).to.deep.equal({
      foo: 1,
      bar: "hello",
      baz: [1, 2, 1099511627776],
    });
  });

  it("encodes function as an empty object", () => {
    expect(https.encode(() => "foo")).to.deep.equal({});
  });
});

describe("decode tokens", () => {
  const projectId = "myproject";
  const appId = "123:web:abc";

  it("decodes valid Auth ID Token", () => {
    const idToken = https.unsafeDecodeIdToken(generateIdToken(projectId));
    expect(idToken.uid).to.equal(mocks.user_id);
    expect(idToken.sub).to.equal(mocks.user_id);
  });

  it("decodes invalid Auth ID Token", () => {
    const idToken = https.unsafeDecodeIdToken(generateUnsignedIdToken(projectId));
    expect(idToken.uid).to.equal(mocks.user_id);
    expect(idToken.sub).to.equal(mocks.user_id);
  });

  it("decodes valid App Check Token", () => {
    const idToken = https.unsafeDecodeAppCheckToken(generateAppCheckToken(projectId, appId));
    expect(idToken.app_id).to.equal(appId);
    expect(idToken.sub).to.equal(appId);
  });

  it("decodes invalid App Check Token", () => {
    const idToken = https.unsafeDecodeAppCheckToken(
      generateUnsignedAppCheckToken(projectId, appId)
    );
    expect(idToken.app_id).to.equal(appId);
    expect(idToken.sub).to.equal(appId);
  });
});
