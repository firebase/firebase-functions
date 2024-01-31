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

import * as functions from "../../../src/v1";
import * as https from "../../../src/v1/providers/https";
import * as debug from "../../../src/common/debug";
import * as sinon from "sinon";
import {
  expectedResponseHeaders,
  generateUnsignedIdToken,
  MockRequest,
  mockRequest,
} from "../../fixtures/mockrequest";
import { runHandler } from "../../helper";
import { MINIMAL_V1_ENDPOINT } from "../../fixtures";
import { CALLABLE_AUTH_HEADER, ORIGINAL_AUTH_HEADER } from "../../../src/common/providers/https";
import { onInit } from "../../../src/v1";

describe("CloudHttpsBuilder", () => {
  describe("#onRequest", () => {
    it("should return a trigger with appropriate values", () => {
      const result = https.onRequest((req, resp) => {
        resp.send(200);
      });
      expect(result.__trigger).to.deep.equal({ httpsTrigger: {} });
      expect(result.__endpoint).to.deep.equal({
        ...MINIMAL_V1_ENDPOINT,
        platform: "gcfv1",
        httpsTrigger: {},
      });
    });

    it("should allow both region and runtime options to be set", () => {
      const fn = functions
        .region("us-east1")
        .runWith({
          timeoutSeconds: 90,
          memory: "256MB",
          invoker: "private",
        })
        .https.onRequest(() => null);

      expect(fn.__trigger.regions).to.deep.equal(["us-east1"]);
      expect(fn.__trigger.availableMemoryMb).to.deep.equal(256);
      expect(fn.__trigger.timeout).to.deep.equal("90s");
      expect(fn.__trigger.httpsTrigger.invoker).to.deep.equal(["private"]);

      expect(fn.__endpoint.region).to.deep.equal(["us-east1"]);
      expect(fn.__endpoint.availableMemoryMb).to.deep.equal(256);
      expect(fn.__endpoint.timeoutSeconds).to.deep.equal(90);
      expect(fn.__endpoint.httpsTrigger.invoker).to.deep.equal(["private"]);
    });

    it("should call initializer", async () => {
      let hello;
      onInit(() => (hello = "world"));
      expect(hello).to.be.undefined;
      const fn = functions.https.onRequest(() => null);
      const req = new MockRequest(
        {
          data: { foo: "bar" },
        },
        {
          "content-type": "application/json",
        }
      );
      req.method = "POST";
      // We don't really have test infrastructure to fake requests. Luckily we
      // don't touch much of the request in boilerplate, just trace context.
      await fn({headers: []} as any, null as any);
      expect(hello).to.equal("world");
    });
  });
});

describe("#onCall", () => {
  afterEach(() => {
    sinon.verifyAndRestore();
  });

  it("should return a trigger/endpoint with appropriate values", () => {
    const result = https.onCall(() => {
      return "response";
    });

    expect(result.__trigger).to.deep.equal({
      httpsTrigger: {},
      labels: { "deployment-callable": "true" },
    });

    expect(result.__endpoint).to.deep.equal({
      ...MINIMAL_V1_ENDPOINT,
      platform: "gcfv1",
      callableTrigger: {},
      labels: {},
    });
  });

  it("should allow both region and runtime options to be set", () => {
    const fn = functions
      .region("us-east1")
      .runWith({
        timeoutSeconds: 90,
        memory: "256MB",
      })
      .https.onCall(() => null);

    expect(fn.__trigger.regions).to.deep.equal(["us-east1"]);
    expect(fn.__trigger.availableMemoryMb).to.deep.equal(256);
    expect(fn.__trigger.timeout).to.deep.equal("90s");

    expect(fn.__endpoint.region).to.deep.equal(["us-east1"]);
    expect(fn.__endpoint.availableMemoryMb).to.deep.equal(256);
    expect(fn.__endpoint.timeoutSeconds).to.deep.equal(90);
  });

  it("has a .run method", async () => {
    const cf = https.onCall((d, c) => {
      return { data: d, context: c };
    });

    const data = "data";
    const context = {
      instanceIdToken: "token",
      auth: {
        uid: "abc",
        token: "token",
      },
    };

    await expect(cf.run(data, context)).to.eventually.deep.equal({ data, context });
  });

  // Regression test for firebase-functions#947
  it("should lock to the v1 API even with function.length == 1", async () => {
    let gotData: Record<string, any>;
    const func = https.onCall((data) => {
      gotData = data;
    });

    const req = new MockRequest(
      {
        data: { foo: "bar" },
      },
      {
        "content-type": "application/json",
      }
    );
    req.method = "POST";

    const response = await runHandler(func, req as any);
    expect(response.status).to.equal(200);
    expect(gotData).to.deep.equal({ foo: "bar" });
  });

  it("should call initializer", async () => {
    const func = https.onCall(() => null);
    const req = new MockRequest(
      {
        data: {},
      },
      {
        "content-type": "application/json",
      }
    );
    req.method = "POST";

    let hello;
    onInit(() => (hello = "world"));
    expect(hello).to.be.undefined;
    await runHandler(func, req as any);
    expect(hello).to.equal("world");
  });

  // Test for firebase-tools#5210
  it("should create context.auth for v1 emulated functions", async () => {
    sinon.stub(debug, "isDebugFeatureEnabled").withArgs("skipTokenVerification").returns(true);

    let gotData: Record<string, any>;
    let gotContext: Record<string, any>;
    const reqData = { hello: "world" };
    const authContext = {
      uid: "SomeUID",
      token: {
        aud: "123456",
        sub: "SomeUID",
        uid: "SomeUID",
      },
    };
    const originalAuth = "Bearer " + generateUnsignedIdToken("123456");
    const func = https.onCall((data, context) => {
      gotData = data;
      gotContext = context;
    });
    const mockReq = mockRequest(
      reqData,
      "application/json",
      {},
      {
        [CALLABLE_AUTH_HEADER]: encodeURIComponent(JSON.stringify(authContext)),
        [ORIGINAL_AUTH_HEADER]: originalAuth,
      }
    );

    const response = await runHandler(func, mockReq as any);

    expect(response.status).to.equal(200);
    expect(gotData).to.deep.eq(reqData);
    expect(gotContext.rawRequest).to.deep.eq(mockReq);
    expect(gotContext.rawRequest.headers["authorization"]).to.eq(originalAuth);
    expect(gotContext.auth).to.deep.eq(authContext);
  });
});

describe("callable CORS", () => {
  it("handles OPTIONS preflight", async () => {
    const func = https.onCall(() => {
      throw new Error(`This shouldn't have gotten called for an OPTIONS preflight.`);
    });

    const req = new MockRequest(
      {},
      {
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "origin",
        Origin: "example.com",
      }
    );
    req.method = "OPTIONS";

    const response = await runHandler(func, req as any);

    expect(response.status).to.equal(204);
    expect(response.body).to.be.undefined;
    expect(response.headers).to.deep.equal({
      "Access-Control-Allow-Methods": "POST",
      "Content-Length": "0",
      Vary: "Origin, Access-Control-Request-Headers",
    });
  });

  it("adds CORS headers", async () => {
    const func = https.onCall(() => 42);
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

    const response = await runHandler(func, req as any);

    expect(response.status).to.equal(200);
    expect(response.body).to.be.deep.equal({ result: 42 });
    expect(response.headers).to.deep.equal(expectedResponseHeaders);
  });
});
