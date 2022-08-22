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
import { expectedResponseHeaders, MockRequest } from "../../fixtures/mockrequest";
import { runHandler } from "../../helper";

describe("CloudHttpsBuilder", () => {
  describe("#onRequest", () => {
    it("should return a trigger with appropriate values", () => {
      const result = https.onRequest((req, resp) => {
        resp.send(200);
      });
      expect(result.__endpoint).to.deep.equal({
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

      expect(fn.__endpoint.region).to.deep.equal(["us-east1"]);
      expect(fn.__endpoint.availableMemoryMb).to.deep.equal(256);
      expect(fn.__endpoint.timeoutSeconds).to.deep.equal(90);
      expect(fn.__endpoint.httpsTrigger.invoker).to.deep.equal(["private"]);
    });
  });
});

describe("#onCall", () => {
  it("should return a trigger/endpoint with appropriate values", () => {
    const result = https.onCall((data) => {
      return "response";
    });

    expect(result.__endpoint).to.deep.equal({
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

    expect(fn.__endpoint.region).to.deep.equal(["us-east1"]);
    expect(fn.__endpoint.availableMemoryMb).to.deep.equal(256);
    expect(fn.__endpoint.timeoutSeconds).to.deep.equal(90);
  });

  it("has a .run method", () => {
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
    expect(cf.run(data, context)).to.deep.equal({ data, context });
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
});

describe("callable CORS", () => {
  it("handles OPTIONS preflight", async () => {
    const func = https.onCall((data, context) => {
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
    const func = https.onCall((data, context) => 42);
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
