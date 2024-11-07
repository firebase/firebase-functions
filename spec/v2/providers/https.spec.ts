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

describe("onRequest", () => {
  beforeEach(() => {
    options.setGlobalOptions({});
    process.env.GCLOUD_PROJECT = "aProject";
  });

  afterEach(() => {
    options.setGlobalOptions({});
    delete process.env.GCLOUD_PROJECT;
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

    const resp = await runHandler(func, req as any);
    expect(resp.body).to.equal("Works");
  });

  it("should enforce CORS options", async () => {
    const func = https.onRequest({ cors: "example.com" }, () => {
      throw new Error("Should not reach here for OPTIONS preflight");
    });

    const req = new MockRequest(
      {
        data: {},
      },
      {
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "origin",
        origin: "example.com",
      }
    );
    req.method = "OPTIONS";

    const resp = await runHandler(func, req as any);
    expect(resp.status).to.equal(204);
    expect(resp.body).to.be.undefined;
    expect(resp.headers).to.deep.equal({
      "Access-Control-Allow-Methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
      "Access-Control-Allow-Origin": "example.com",
      "Content-Length": "0",
      Vary: "Origin, Access-Control-Request-Headers",
    });
  });

  it("should add CORS headers if debug feature is enabled", async () => {
    sinon.stub(debug, "isDebugFeatureEnabled").withArgs("enableCors").returns(true);

    const func = https.onRequest(() => {
      throw new Error("Should not reach here for OPTIONS preflight");
    });

    const req = new MockRequest(
      {
        data: {},
      },
      {
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "origin",
        origin: "localhost",
      }
    );
    req.method = "OPTIONS";

    const resp = await runHandler(func, req as any);
    expect(resp.status).to.equal(204);
    expect(resp.body).to.be.undefined;
    expect(resp.headers).to.deep.equal({
      "Access-Control-Allow-Methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
      "Access-Control-Allow-Origin": "localhost",
      "Content-Length": "0",
      Vary: "Origin, Access-Control-Request-Headers",
    });

    sinon.restore();
  });

  it("should NOT add CORS headers if debug feature is enabled and cors has value false", async () => {
    sinon.stub(debug, "isDebugFeatureEnabled").withArgs("enableCors").returns(true);

    const func = https.onRequest({ cors: false }, (req, res) => {
      res.status(200).send("Good");
    });

    const req = new MockRequest(
      {
        data: {},
      },
      {
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "origin",
        origin: "example.com",
      }
    );
    req.method = "OPTIONS";

    const resp = await runHandler(func, req as any);
    expect(resp.status).to.equal(200);
    expect(resp.body).to.be.equal("Good");
    expect(resp.headers).to.deep.equal({});

    sinon.restore();
  });

  it("calls init function", async () => {
    const func = https.onRequest((req, res) => {
      res.status(200).send("Good");
    });
    const req = new MockRequest(
      {
        data: {},
      },
      {
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "origin",
        origin: "example.com",
      }
    );
    req.method = "OPTIONS";
    let hello;
    onInit(() => (hello = "world"));
    expect(hello).to.be.undefined;
    await runHandler(func, req as any);
    expect(hello).to.equal("world");
  });
});

describe("onCall", () => {
  beforeEach(() => {
    options.setGlobalOptions({});
    process.env.GCLOUD_PROJECT = "aProject";
  });

  afterEach(() => {
    delete process.env.GCLOUD_PROJECT;
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

    const resp = await runHandler(func, req as any);
    expect(resp.body).to.deep.equal(JSON.stringify({ result: 42 }));
  });

  it("should enforce CORS options", async () => {
    const func = https.onCall({ cors: "example.com" }, () => {
      throw new Error("Should not reach here for OPTIONS preflight");
    });

    const req = new MockRequest(
      {
        data: {},
      },
      {
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "origin",
        origin: "example.com",
      }
    );
    req.method = "OPTIONS";

    const resp = await runHandler(func, req as any);
    expect(resp.status).to.equal(204);
    expect(resp.body).to.be.undefined;
    expect(resp.headers).to.deep.equal({
      "Access-Control-Allow-Methods": "POST",
      "Access-Control-Allow-Origin": "example.com",
      "Content-Length": "0",
      Vary: "Origin, Access-Control-Request-Headers",
    });
  });

  it("overrides CORS headers if debug feature is enabled", async () => {
    sinon.stub(debug, "isDebugFeatureEnabled").withArgs("enableCors").returns(true);

    const func = https.onCall({ cors: "example.com" }, () => {
      throw new Error("Should not reach here for OPTIONS preflight");
    });
    const req = new MockRequest(
      {
        data: {},
      },
      {
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "origin",
        origin: "localhost",
      }
    );
    req.method = "OPTIONS";

    const response = await runHandler(func, req as any);

    expect(response.status).to.equal(204);
    expect(response.body).to.be.undefined;
    expect(response.headers).to.deep.equal({
      "Access-Control-Allow-Methods": "POST",
      "Access-Control-Allow-Origin": "localhost",
      "Content-Length": "0",
      Vary: "Origin, Access-Control-Request-Headers",
    });

    sinon.restore();
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
