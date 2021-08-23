import { expect } from 'chai';
import * as express from 'express';

import * as options from '../../../src/v2/options';
import * as https from '../../../src/v2/providers/https';
import {
  expectedResponseHeaders,
  MockRequest,
} from '../../fixtures/mockrequest';
import { FULL_OPTIONS, FULL_TRIGGER } from './helpers';

/**
 * RunHandlerResult contains the data from an express.Response.
 */
interface RunHandlerResult {
  status: number;
  headers: { [name: string]: string };
  body: any;
}

function runHandler(
  handler: express.Handler,
  request: https.Request
): Promise<RunHandlerResult> {
  return new Promise((resolve, reject) => {
    // MockResponse mocks an express.Response.
    // This class lives here so it can reference resolve and reject.
    class MockResponse {
      private statusCode = 0;
      private headers: { [name: string]: string } = {};
      private callback: Function;

      public status(code: number) {
        this.statusCode = code;
        return this;
      }

      // Headers are only set by the cors handler.
      public setHeader(name: string, value: string) {
        this.headers[name] = value;
      }

      public getHeader(name: string): string {
        return this.headers[name];
      }

      public send(body: any) {
        resolve({
          status: this.statusCode,
          headers: this.headers,
          body,
        });
        if (this.callback) {
          this.callback();
        }
      }

      public end() {
        this.send(undefined);
      }

      public on(event: string, callback: Function) {
        if (event !== 'finish') {
          throw new Error('MockResponse only implements the finish event');
        }
        this.callback = callback;
      }
    }

    const response = new MockResponse();
    handler(request, response as any, () => undefined);
  });
}

describe('onRequest', () => {
  beforeEach(() => {
    options.setGlobalOptions({});
    process.env.GCLOUD_PROJECT = 'aProject';
  });

  afterEach(() => {
    delete process.env.GCLOUD_PROJECT;
  });

  it('should return a minimal trigger with appropriate values', () => {
    const result = https.onRequest((req, res) => {
      res.send(200);
    });
    expect(result.__trigger).to.deep.equal({
      apiVersion: 2,
      platform: 'gcfv2',
      httpsTrigger: {
        allowInsecure: false,
      },
      labels: {},
    });
  });

  it('should create a complex trigger with appropriate values', () => {
    const result = https.onRequest(
      {
        ...FULL_OPTIONS,
        region: ['us-west1', 'us-central1'],
        invoker: ['service-account1@', 'service-account2@'],
      },
      (req, res) => {
        res.send(200);
      }
    );
    expect(result.__trigger).to.deep.equal({
      ...FULL_TRIGGER,
      httpsTrigger: {
        allowInsecure: false,
        invoker: ['service-account1@', 'service-account2@'],
      },
      regions: ['us-west1', 'us-central1'],
    });
  });

  it('should merge options and globalOptions', () => {
    options.setGlobalOptions({
      concurrency: 20,
      region: 'europe-west1',
      minInstances: 1,
      invoker: 'public',
    });

    const result = https.onRequest(
      {
        region: ['us-west1', 'us-central1'],
        minInstances: 3,
        invoker: 'private',
      },
      (req, res) => {
        res.send(200);
      }
    );

    expect(result.__trigger).to.deep.equal({
      apiVersion: 2,
      platform: 'gcfv2',
      httpsTrigger: {
        allowInsecure: false,
        invoker: ['private'],
      },
      concurrency: 20,
      minInstances: 3,
      regions: ['us-west1', 'us-central1'],
      labels: {},
    });
  });

  it('should be an express handler', async () => {
    const func = https.onRequest((req, res) => {
      res.send('Works');
    });

    const req = new MockRequest(
      {
        data: {},
      },
      {
        'content-type': 'application/json',
        origin: 'example.com',
      }
    );
    req.method = 'POST';

    const resp = await runHandler(func, req as any);
    expect(resp.body).to.equal('Works');
  });

  it('should enforce CORS options', async () => {
    const func = https.onRequest({ cors: 'example.com' }, (req, res) => {
      throw new Error('Should not reach here for OPTIONS preflight');
    });

    const req = new MockRequest(
      {
        data: {},
      },
      {
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'origin',
        Origin: 'example.com',
      }
    );
    req.method = 'OPTIONS';

    const resp = await runHandler(func, req as any);
    expect(resp.status).to.equal(204);
    expect(resp.body).to.be.undefined;
    expect(resp.headers).to.deep.equal({
      'Access-Control-Allow-Methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
      'Access-Control-Allow-Origin': 'example.com',
      'Content-Length': '0',
      Vary: 'Origin, Access-Control-Request-Headers',
    });
  });
});

describe('onCall', () => {
  beforeEach(() => {
    options.setGlobalOptions({});
    process.env.GCLOUD_PROJECT = 'aProject';
  });

  afterEach(() => {
    delete process.env.GCLOUD_PROJECT;
  });

  it('should return a minimal trigger with appropriate values', () => {
    const result = https.onCall((request) => 42);
    expect(result.__trigger).to.deep.equal({
      apiVersion: 2,
      platform: 'gcfv2',
      httpsTrigger: {
        allowInsecure: false,
      },
      labels: {
        'deployment-callable': 'true',
      },
    });
  });

  it('should create a complex trigger with appropriate values', () => {
    const result = https.onCall(FULL_OPTIONS, (request) => 42);
    expect(result.__trigger).to.deep.equal({
      ...FULL_TRIGGER,
      httpsTrigger: {
        allowInsecure: false,
      },
      labels: {
        ...FULL_TRIGGER.labels,
        'deployment-callable': 'true',
      },
    });
  });

  it('should merge options and globalOptions', () => {
    options.setGlobalOptions({
      concurrency: 20,
      region: 'europe-west1',
      minInstances: 1,
    });

    const result = https.onCall(
      {
        region: ['us-west1', 'us-central1'],
        minInstances: 3,
      },
      (request) => 42
    );

    expect(result.__trigger).to.deep.equal({
      apiVersion: 2,
      platform: 'gcfv2',
      httpsTrigger: {
        allowInsecure: false,
      },
      concurrency: 20,
      minInstances: 3,
      regions: ['us-west1', 'us-central1'],
      labels: {
        'deployment-callable': 'true',
      },
    });
  });

  it('has a .run method', () => {
    const cf = https.onCall((request) => {
      return request;
    });

    const request: any = {
      data: 'data',
      instanceIdToken: 'token',
      auth: {
        uid: 'abc',
        token: 'token',
      },
    };
    expect(cf.run(request)).to.deep.equal(request);
  });

  it('should be an express handler', async () => {
    const func = https.onCall((request) => 42);

    const req = new MockRequest(
      {
        data: {},
      },
      {
        'content-type': 'application/json',
        origin: 'example.com',
      }
    );
    req.method = 'POST';

    const resp = await runHandler(func, req as any);
    expect(resp.body).to.deep.equal({ result: 42 });
  });

  it('should enforce CORS options', async () => {
    const func = https.onCall({ cors: 'example.com' }, (request) => {
      throw new Error('Should not reach here for OPTIONS preflight');
    });

    const req = new MockRequest(
      {
        data: {},
      },
      {
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'origin',
        Origin: 'example.com',
      }
    );
    req.method = 'OPTIONS';

    const resp = await runHandler(func, req as any);
    expect(resp.status).to.equal(204);
    expect(resp.body).to.be.undefined;
    expect(resp.headers).to.deep.equal({
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Origin': 'example.com',
      'Content-Length': '0',
      Vary: 'Origin, Access-Control-Request-Headers',
    });
  });

  it('adds CORS headers', async () => {
    const func = https.onCall((request) => 42);
    const req = new MockRequest(
      {
        data: {},
      },
      {
        'content-type': 'application/json',
        origin: 'example.com',
      }
    );
    req.method = 'POST';

    const response = await runHandler(func, req as any);

    expect(response.status).to.equal(200);
    expect(response.body).to.be.deep.equal({ result: 42 });
    expect(response.headers).to.deep.equal(expectedResponseHeaders);
  });

  // These tests pass if the code transpiles
  it('allows desirable syntax', () => {
    https.onCall<string, string>(
      (request: https.CallableRequest<string>) => `hello, ${request.data}!`
    );
    https.onCall<string>(
      (request: https.CallableRequest<string>) => `hello, ${request.data}!`
    );
    https.onCall<string>(
      (request: https.CallableRequest) => `hello, ${request.data}!`
    );
    https.onCall(
      (request: https.CallableRequest<string>) => `Hello, ${request.data}`
    );
    https.onCall((request: https.CallableRequest) => `Hello, ${request.data}`);
  });
});
