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
import * as sinon from "sinon";

import * as debug from "../../../src/common/debug";
import * as options from "../../../src/v2/options";
import * as https from "../../../src/v2/providers/https";
import { expectedResponseHeaders, MockRequest } from "../../fixtures/mockrequest";
import { runHandler } from "../../helper";
import { FULL_ENDPOINT, MINIMAL_V2_ENDPOINT, FULL_OPTIONS, FULL_TRIGGER } from "./fixtures";
import { onInit } from "../../../src/v2/core";
import { Handler } from "express";
import { genkit } from "genkit";
import { clearParams, defineList, Expression } from "../../../src/params";

function request(args: {
  data?: any;
  auth?: Record<string, string>;
  headers?: Record<string, string>;
  method?: MockRequest["method"];
}): any {
  let headers: Record<string, string> = {};
  if (args.method !== "POST") {
    headers["content-type"] = "application/json";
  }
  headers = {
    ...headers,
    ...args.headers,
  };
  if (args.auth) {
    headers["authorization"] = `bearer ignored.${Buffer.from(
      JSON.stringify(args.auth),
      "utf-8"
    ).toString("base64")}.ignored`;
  }
  const ret = new MockRequest({ data: args.data || {} }, headers);
  ret.method = args.method || "POST";
  return ret;
}

describe("onRequest", () => {
  beforeEach(() => {
    options.setGlobalOptions({});
    process.env.GCLOUD_PROJECT = "aProject";
  });

  afterEach(() => {
    options.setGlobalOptions({});
    delete process.env.GCLOUD_PROJECT;
    sinon.restore();
  });

  it("should return a minimal trigger/endpoint with appropriate values", () => {
    const result = https.onRequest((req, res) => {
      res.send(200);
    });

    expect(result.__trigger).to.deep.equal({
      platform: "gcfv2",
      httpsTrigger: {
        allowInsecure: false,
      },
      labels: {},
    });

    expect(result.__endpoint).to.deep.equal({
      ...MINIMAL_V2_ENDPOINT,
      platform: "gcfv2",
      httpsTrigger: {},
      labels: {},
    });
  });

  it("should create a complex trigger/endpoint with appropriate values", () => {
    const result = https.onRequest(
      {
        ...FULL_OPTIONS,
        region: ["us-west1", "us-central1"],
        invoker: ["service-account1@", "service-account2@"],
      },
      (req, res) => {
        res.send(200);
      }
    );

    expect(result.__trigger).to.deep.equal({
      ...FULL_TRIGGER,
      httpsTrigger: {
        allowInsecure: false,
        invoker: ["service-account1@", "service-account2@"],
      },
      regions: ["us-west1", "us-central1"],
    });

    expect(result.__endpoint).to.deep.equal({
      ...FULL_ENDPOINT,
      platform: "gcfv2",
      httpsTrigger: {
        invoker: ["service-account1@", "service-account2@"],
      },
      region: ["us-west1", "us-central1"],
    });
  });

  it("should merge options and globalOptions", () => {
    options.setGlobalOptions({
      concurrency: 20,
      region: "europe-west1",
      minInstances: 1,
      invoker: "public",
    });

    const result = https.onRequest(
      {
        region: ["us-west1", "us-central1"],
        minInstances: 3,
        invoker: "private",
      },
      (req, res) => {
        res.send(200);
      }
    );

    expect(result.__trigger).to.deep.equal({
      platform: "gcfv2",
      httpsTrigger: {
        allowInsecure: false,
        invoker: ["private"],
      },
      concurrency: 20,
      minInstances: 3,
      regions: ["us-west1", "us-central1"],
      labels: {},
    });

    expect(result.__endpoint).to.deep.equal({
      ...MINIMAL_V2_ENDPOINT,
      platform: "gcfv2",
      httpsTrigger: {
        invoker: ["private"],
      },
      concurrency: 20,
      minInstances: 3,
      region: ["us-west1", "us-central1"],
      labels: {},
    });
  });

  it("should take globalOptions invoker", () => {
    options.setGlobalOptions({
      invoker: "private",
    });

    const result = https.onRequest((req, res) => {
      res.send();
    });

    expect(result.__trigger).to.deep.eq({
      platform: "gcfv2",
      httpsTrigger: {
        allowInsecure: false,
        invoker: ["private"],
      },
      labels: {},
    });
    expect(result.__endpoint).to.deep.equal({
      ...MINIMAL_V2_ENDPOINT,
      platform: "gcfv2",
      httpsTrigger: {
        invoker: ["private"],
      },
      labels: {},
    });
  });

  it("should be an express handler", async () => {
    const func = https.onRequest((req, res) => {
      res.send("Works");
    });

    const req = request({ headers: { origin: "example.com" } });
    const resp = await runHandler(func, req);
    expect(resp.body).to.equal("Works");
  });

  it("should enforce CORS options", async () => {
    const func = https.onRequest({ cors: "example.com" }, () => {
      throw new Error("Should not reach here for OPTIONS preflight");
    });

    const req = request({
      headers: {
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "origin",
        origin: "example.com",
      },
      method: "OPTIONS",
    });

    const resp = await runHandler(func, req);
    expect(resp.status).to.equal(204);
    expect(resp.body).to.be.undefined;
    expect(resp.headers).to.deep.equal({
      "Access-Control-Allow-Methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
      "Access-Control-Allow-Origin": "example.com",
      "Content-Length": "0",
      Vary: "Origin, Access-Control-Request-Headers",
    });
  });

  it("should allow cors params", async () => {
    const origins = defineList("ORIGINS");

    try {
      process.env.ORIGINS = '["example.com","example2.com"]';
      const func = https.onRequest(
        {
          cors: origins,
        },
        (req, res) => {
          res.send("42");
        }
      );
      const req = request({
        headers: {
          referrer: "example.com",
          "content-type": "application/json",
          origin: "example.com",
        },
        method: "OPTIONS",
      });

      const response = await runHandler(func, req);

      expect(response.status).to.equal(204);
      expect(response.headers).to.deep.equal({
        "Access-Control-Allow-Origin": "example.com",
        "Access-Control-Allow-Methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
        "Content-Length": "0",
        Vary: "Origin, Access-Control-Request-Headers",
      });
    } finally {
      delete process.env.ORIGINS;
      clearParams();
    }
  });

  it("should add CORS headers if debug feature is enabled", async () => {
    sinon.stub(debug, "isDebugFeatureEnabled").withArgs("enableCors").returns(true);

    const func = https.onRequest(() => {
      throw new Error("Should not reach here for OPTIONS preflight");
    });

    const req = request({
      headers: {
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "origin",
        origin: "localhost",
      },
      method: "OPTIONS",
    });

    const resp = await runHandler(func, req);
    expect(resp.status).to.equal(204);
    expect(resp.body).to.be.undefined;
    expect(resp.headers).to.deep.equal({
      "Access-Control-Allow-Methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
      "Access-Control-Allow-Origin": "localhost",
      "Content-Length": "0",
      Vary: "Origin, Access-Control-Request-Headers",
    });
  });

  it("should NOT add CORS headers if debug feature is enabled and cors has value false", async () => {
    sinon.stub(debug, "isDebugFeatureEnabled").withArgs("enableCors").returns(true);

    const func = https.onRequest({ cors: false }, (req, res) => {
      res.status(200).send("Good");
    });

    const req = request({
      headers: {
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "origin",
        origin: "example.com",
      },
      method: "OPTIONS",
    });

    const resp = await runHandler(func, req);
    expect(resp.status).to.equal(200);
    expect(resp.body).to.be.equal("Good");
    expect(resp.headers).to.deep.equal({});
  });

  it("calls init function", async () => {
    const func = https.onRequest((req, res) => {
      res.status(200).send("Good");
    });
    const req = request({
      headers: {
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "origin",
        origin: "example.com",
      },
      method: "OPTIONS",
    });
    let hello;
    onInit(() => (hello = "world"));
    expect(hello).to.be.undefined;
    await runHandler(func, req);
    expect(hello).to.equal("world");
  });

  it("does not eagerly resolve defineList cors during onRequest definition", () => {
    const allowedOrigins = defineList("ALLOWED_ORIGINS");
    const runtimeValueStub = sinon.stub(allowedOrigins, "runtimeValue");
    const valueSpy = sinon.spy(allowedOrigins, "value");

    expect(() => {
      https.onRequest({ cors: allowedOrigins }, (_req, res) => {
        res.status(200).send("ok");
      });
    }).to.not.throw();

    expect(valueSpy.called).to.be.false;
    expect(runtimeValueStub.called).to.be.false;
  });

  it("treats a single-element expression list like a static single origin", async () => {
    const allowedOrigins = defineList("ALLOWED_ORIGINS");
    sinon.stub(allowedOrigins, "runtimeValue").returns(["https://app.example.com"]);

    const func = https.onRequest({ cors: allowedOrigins }, (req, res) => {
      res.status(200).send("ok");
    });

    const req = request({
      headers: {
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "origin",
        origin: "https://evil.example.com",
      },
      method: "OPTIONS",
    });

    const resp = await runHandler(func, req);

    expect(resp.status).to.equal(204);
    expect(resp.headers["Access-Control-Allow-Origin"]).to.equal("https://app.example.com");
  });

  it("matches request origin for multi-element expression-backed cors", async () => {
    const allowedOrigins = defineList("ALLOWED_ORIGINS");
    const runtimeValueStub = sinon
      .stub(allowedOrigins, "runtimeValue")
      .returns(["https://app.example.com", "https://admin.example.com"]);

    const func = https.onRequest({ cors: allowedOrigins }, (_req, res) => {
      res.status(200).send("ok");
    });

    const allowedReq = request({
      headers: {
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "origin",
        origin: "https://admin.example.com",
      },
      method: "OPTIONS",
    });

    const allowedResp = await runHandler(func, allowedReq);
    expect(allowedResp.status).to.equal(204);
    expect(allowedResp.headers["Access-Control-Allow-Origin"]).to.equal(
      "https://admin.example.com"
    );

    const deniedReq = request({
      headers: {
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "origin",
        origin: "https://evil.example.com",
      },
      method: "OPTIONS",
    });

    const deniedResp = await runHandler(func, deniedReq);
    expect(deniedResp.status).to.equal(200);
    expect(deniedResp.headers["Access-Control-Allow-Origin"]).to.be.undefined;
    expect(runtimeValueStub.calledTwice).to.be.true;
  });
});

describe("onCall", () => {
  let origins: Expression<string[]>;
  beforeEach(() => {
    origins = defineList("ORIGINS");
    process.env.ORIGINS = '["example.com","example2.com"]';

    options.setGlobalOptions({});
    process.env.GCLOUD_PROJECT = "aProject";
  });

  afterEach(() => {
    delete process.env.GCLOUD_PROJECT;
    delete process.env.ORIGINS;
    clearParams();
    sinon.restore();
  });

  it("should return a minimal trigger/endpoint with appropriate values", () => {
    const result = https.onCall(() => 42);

    expect(result.__trigger).to.deep.equal({
      platform: "gcfv2",
      httpsTrigger: {
        allowInsecure: false,
      },
      labels: {
        "deployment-callable": "true",
      },
    });

    expect(result.__endpoint).to.deep.equal({
      ...MINIMAL_V2_ENDPOINT,
      platform: "gcfv2",
      callableTrigger: {},
      labels: {},
    });
  });

  it("should create a complex trigger/endpoint with appropriate values", () => {
    const result = https.onCall(FULL_OPTIONS, () => 42);

    expect(result.__trigger).to.deep.equal({
      ...FULL_TRIGGER,
      httpsTrigger: {
        allowInsecure: false,
      },
      labels: {
        ...FULL_TRIGGER.labels,
        "deployment-callable": "true",
      },
    });

    expect(result.__endpoint).to.deep.equal({
      ...FULL_ENDPOINT,
      platform: "gcfv2",
      callableTrigger: {},
    });
  });

  it("should merge options and globalOptions", () => {
    options.setGlobalOptions({
      concurrency: 20,
      region: "europe-west1",
      minInstances: 1,
    });

    const result = https.onCall(
      {
        region: ["us-west1", "us-central1"],
        minInstances: 3,
      },
      () => 42
    );

    expect(result.__trigger).to.deep.equal({
      platform: "gcfv2",
      httpsTrigger: {
        allowInsecure: false,
      },
      concurrency: 20,
      minInstances: 3,
      regions: ["us-west1", "us-central1"],
      labels: {
        "deployment-callable": "true",
      },
    });

    expect(result.__endpoint).to.deep.equal({
      ...MINIMAL_V2_ENDPOINT,
      platform: "gcfv2",
      callableTrigger: {},
      concurrency: 20,
      minInstances: 3,
      region: ["us-west1", "us-central1"],
      labels: {},
    });
  });

  it("has a .run method", async () => {
    const cf = https.onCall((request) => {
      return request;
    });

    const request: any = {
      data: "data",
      instanceIdToken: "token",
      auth: {
        uid: "abc",
        token: "token",
      },
    };
    await expect(cf.run(request)).to.eventually.deep.equal(request);
  });

  it("should be an express handler", async () => {
    const func = https.onCall(() => 42);

    const req = request({ headers: { origin: "example.com" } });

    const resp = await runHandler(func, req);
    expect(resp.body).to.deep.equal(JSON.stringify({ result: 42 }));
  });

  it("should enforce CORS options", async () => {
    const func = https.onCall({ cors: "example.com" }, () => {
      throw new Error("Should not reach here for OPTIONS preflight");
    });

    const req = request({
      headers: {
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "origin",
        origin: "example.com",
      },
      method: "OPTIONS",
    });

    const resp = await runHandler(func, req);
    expect(resp.status).to.equal(204);
    expect(resp.body).to.be.undefined;
    expect(resp.headers).to.deep.equal({
      "Access-Control-Allow-Methods": "POST",
      "Access-Control-Allow-Origin": "example.com",
      "Content-Length": "0",
      Vary: "Origin, Access-Control-Request-Headers",
    });
  });

  it("should allow cors params", async () => {
    const func = https.onCall({ cors: origins }, () => 42);
    const req = request({
      headers: {
        referrer: "example.com",
        "content-type": "application/json",
        origin: "example.com",
      },
      method: "OPTIONS",
    });

    const response = await runHandler(func, req);

    expect(response.status).to.equal(204);
    expect(response.headers).to.deep.equal({
      "Access-Control-Allow-Origin": "example.com",
      "Access-Control-Allow-Methods": "POST",
      "Content-Length": "0",
      Vary: "Origin, Access-Control-Request-Headers",
    });
  });

  it("overrides CORS headers if debug feature is enabled", async () => {
    sinon.stub(debug, "isDebugFeatureEnabled").withArgs("enableCors").returns(true);

    const func = https.onCall({ cors: "example.com" }, () => {
      throw new Error("Should not reach here for OPTIONS preflight");
    });
    const req = request({
      headers: {
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "origin",
        origin: "localhost",
      },
      method: "OPTIONS",
    });

    const response = await runHandler(func, req);

    expect(response.status).to.equal(204);
    expect(response.body).to.be.undefined;
    expect(response.headers).to.deep.equal({
      "Access-Control-Allow-Methods": "POST",
      "Access-Control-Allow-Origin": "localhost",
      "Content-Length": "0",
      Vary: "Origin, Access-Control-Request-Headers",
    });
  });

  it("should NOT add CORS headers if debug feature is enabled and cors has value false", async () => {
    sinon.stub(debug, "isDebugFeatureEnabled").withArgs("enableCors").returns(true);

    const func = https.onCall({ cors: false }, () => 42);
    const req = request({
      data: {},
      headers: {
        origin: "example.com",
        "content-type": "application/json",
      },
      method: "POST",
    });

    const response = await runHandler(func, req);

    expect(response.status).to.equal(200);
    expect(response.headers).to.not.have.property("Access-Control-Allow-Origin");
  });

  it("adds CORS headers", async () => {
    const func = https.onCall(() => 42);
    const req = request({ headers: { origin: "example.com" } });
    const response = await runHandler(func, req);

    expect(response.status).to.equal(200);
    expect(response.body).to.be.deep.equal(JSON.stringify({ result: 42 }));
    expect(response.headers).to.deep.equal(expectedResponseHeaders);
  });

  // These tests pass if the code transpiles
  it("allows desirable syntax", () => {
    https.onCall<string, string>(
      (request: https.CallableRequest<string>) => `hello, ${request.data}!`
    );
    https.onCall<string>((request: https.CallableRequest<string>) => `hello, ${request.data}!`);
    https.onCall<string>((request: https.CallableRequest) => `hello, ${request.data}!`);
    https.onCall((request: https.CallableRequest<string>) => `Hello, ${request.data}`);
    https.onCall((request: https.CallableRequest) => `Hello, ${request.data}`);
  });

  it("calls init function", async () => {
    const func = https.onCall(() => 42);

    const req = request({ headers: { origin: "example.com" } });
    let hello;
    onInit(() => (hello = "world"));
    expect(hello).to.be.undefined;
    await runHandler(func, req);
    expect(hello).to.equal("world");
  });

  describe("authPolicy", () => {
    beforeEach(() => {
      sinon.stub(debug, "isDebugFeatureEnabled").withArgs("skipTokenVerification").returns(true);
    });

    it("should check isSignedIn", async () => {
      const func = https.onCall(
        {
          authPolicy: https.isSignedIn(),
        },
        () => 42
      );

      const authResp = await runHandler(func, request({ auth: { sub: "inlined" } }));
      expect(authResp.status).to.equal(200);

      const anonResp = await runHandler(func, request({}));
      expect(anonResp.status).to.equal(403);
    });

    it("should check hasClaim", async () => {
      const anyValue = https.onCall(
        {
          authPolicy: https.hasClaim("meaning"),
        },
        () => "HHGTTG"
      );
      const specificValue = https.onCall(
        {
          authPolicy: https.hasClaim("meaning", "42"),
        },
        () => "HHGTG"
      );

      const cases: Array<{ fn: Handler; auth?: Record<string, string>; status: number }> = [
        { fn: anyValue, auth: { meaning: "42" }, status: 200 },
        { fn: anyValue, auth: { meaning: "43" }, status: 200 },
        { fn: anyValue, auth: { order: "66" }, status: 403 },
        { fn: anyValue, status: 403 },
        { fn: specificValue, auth: { meaning: "42" }, status: 200 },
        { fn: specificValue, auth: { meaning: "43" }, status: 403 },
        { fn: specificValue, auth: { order: "66" }, status: 403 },
        { fn: specificValue, status: 403 },
      ];
      for (const test of cases) {
        const resp = await runHandler(test.fn, request({ auth: test.auth }));
        expect(resp.status).to.equal(test.status);
      }
    });

    it("can be any callback", async () => {
      const divTwo = https.onCall<number>(
        {
          authPolicy: (auth, data) => data % 2 === 0,
        },
        (req) => req.data / 2
      );

      const authorized = await runHandler(divTwo, request({ data: 2 }));
      expect(authorized.status).to.equal(200);
      const accessDenied = await runHandler(divTwo, request({ data: 1 }));
      expect(accessDenied.status).to.equal(403);
    });
  });

  it("does not eagerly resolve defineList cors during onCall definition", () => {
    const allowedOrigins = defineList("ALLOWED_ORIGINS");
    const runtimeValueStub = sinon.stub(allowedOrigins, "runtimeValue");
    const valueSpy = sinon.spy(allowedOrigins, "value");

    expect(() => {
      https.onCall({ cors: allowedOrigins }, () => 42);
    }).to.not.throw();

    expect(valueSpy.called).to.be.false;
    expect(runtimeValueStub.called).to.be.false;
  });
});

describe("onCallGenkit", () => {
  it("calls with JSON requests", async () => {
    const flow = {
      __action: {
        name: "test",
      },
      run: sinon.stub(),
      stream: sinon.stub(),
    };
    flow.run.withArgs("answer").returns({ result: 42 });
    flow.stream.throws("Unexpected stream");

    const f = https.onCallGenkit(flow);

    const req = request({ data: "answer" });
    const res = await runHandler(f, req);
    expect(JSON.parse(res.body)).to.deep.equal({ result: 42 });
  });

  it("Streams with SSE requests", async () => {
    const flow = {
      __action: {
        name: "test",
      },
      run: sinon.stub(),
      stream: sinon.stub(),
    };
    flow.run.onFirstCall().throws();
    flow.stream.withArgs("answer").returns({
      stream: (async function* () {
        await Promise.resolve();
        yield 1;
        await Promise.resolve();
        yield 2;
      })(),
      output: Promise.resolve(42),
    });

    const f = https.onCallGenkit(flow);

    const req = request({ data: "answer", headers: { accept: "text/event-stream" } });
    const res = await runHandler(f, req);
    expect(res.body).to.equal(
      ['data: {"message":1}', 'data: {"message":2}', 'data: {"result":42}', ""].join("\n\n")
    );
  });

  it("Exports types that are compatible with the genkit library (compilation is success)", () => {
    const ai = genkit({});
    const flow = ai.defineFlow("test", () => 42);
    https.onCallGenkit(flow);
  });
});
