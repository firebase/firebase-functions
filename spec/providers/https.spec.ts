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

import { expect } from 'chai';
import * as express from 'express';
import * as firebase from 'firebase-admin';
import * as _ from 'lodash';
import { apps as appsNamespace } from '../../src/apps';
import * as functions from '../../src/index';
import * as https from '../../src/providers/https';
import * as mocks from '../fixtures/credential/key.json';
import {
  expectedResponseHeaders,
  generateIdToken,
  mockFetchPublicKeys,
  MockRequest,
  mockRequest,
} from '../fixtures/mockrequest';

describe('CloudHttpsBuilder', () => {
  describe('#onRequest', () => {
    it('should return a Trigger with appropriate values', () => {
      const result = https.onRequest((req, resp) => {
        resp.send(200);
      });
      expect(result.__trigger).to.deep.equal({ httpsTrigger: {} });
    });

    it('should allow both region and runtime options to be set', () => {
      const fn = functions
        .region('us-east1')
        .runWith({
          timeoutSeconds: 90,
          memory: '256MB',
        })
        .https.onRequest(() => null);

      expect(fn.__trigger.regions).to.deep.equal(['us-east1']);
      expect(fn.__trigger.availableMemoryMb).to.deep.equal(256);
      expect(fn.__trigger.timeout).to.deep.equal('90s');
    });
  });
});

describe('handler namespace', () => {
  describe('#onRequest', () => {
    it('should return an empty trigger', () => {
      const result = functions.handler.https.onRequest((req, res) => {
        res.send(200);
      });
      expect(result.__trigger).to.deep.equal({});
    });
  });

  describe('#onCall', () => {
    it('should return an empty trigger', () => {
      const result = functions.handler.https.onCall(() => null);
      expect(result.__trigger).to.deep.equal({});
    });
  });
});

/**
 * RunHandlerResult contains the data from an express.Response.
 */
interface RunHandlerResult {
  status: number;
  headers: { [name: string]: string };
  body: any;
}

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

  // The expected shape of the http response returned to the callable SDK.
  expectedHttpResponse: RunHandlerResult;
}

/**
 * Runs an express handler with a given request asynchronously and returns the
 * data populated into the response.
 */
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
      }

      public end() {
        this.send(undefined);
      }
    }

    const response = new MockResponse();
    handler(request, response as any, () => undefined);
  });
}

// Runs a CallTest test.
async function runTest(test: CallTest): Promise<any> {
  const callableFunction = https.onCall((data, context) => {
    expect(data).to.deep.equal(test.expectedData);
    return test.callableFunction(data, context);
  });

  const response = await runHandler(callableFunction, test.httpRequest);

  expect(response.body).to.deep.equal(test.expectedHttpResponse.body);
  expect(response.headers).to.deep.equal(test.expectedHttpResponse.headers);
  expect(response.status).to.equal(test.expectedHttpResponse.status);
}

describe('callable.FunctionBuilder', () => {
  let app: firebase.app.App;

  before(() => {
    const credential = {
      getAccessToken: () => {
        return Promise.resolve({
          expires_in: 1000,
          access_token: 'fake',
        });
      },
      getCertificate: () => {
        return {
          projectId: 'aProjectId',
        };
      },
    };
    app = firebase.initializeApp({
      projectId: 'aProjectId',
      credential,
    });
    Object.defineProperty(appsNamespace(), 'admin', { get: () => app });
  });

  after(() => {
    app.delete();
    delete appsNamespace.singleton;
  });

  describe('#onCall', () => {
    it('should return a Trigger with appropriate values', () => {
      const result = https.onCall((data) => {
        return 'response';
      });
      expect(result.__trigger).to.deep.equal({
        httpsTrigger: {},
        labels: { 'deployment-callable': 'true' },
      });
    });

    it('should handle success', () => {
      return runTest({
        httpRequest: mockRequest({ foo: 'bar' }),
        expectedData: { foo: 'bar' },
        callableFunction: (data, context) => ({ baz: 'qux' }),
        expectedHttpResponse: {
          status: 200,
          headers: expectedResponseHeaders,
          body: { result: { baz: 'qux' } },
        },
      });
    });

    it('should handle null data and return', () => {
      return runTest({
        httpRequest: mockRequest(null),
        expectedData: null,
        callableFunction: (data, context) => null,
        expectedHttpResponse: {
          status: 200,
          headers: expectedResponseHeaders,
          body: { result: null },
        },
      });
    });

    it('should handle void return', () => {
      return runTest({
        httpRequest: mockRequest(null),
        expectedData: null,
        callableFunction: (data, context) => {
          return;
        },
        expectedHttpResponse: {
          status: 200,
          headers: expectedResponseHeaders,
          body: { result: null },
        },
      });
    });

    it('should reject bad method', () => {
      const req = mockRequest(null);
      req.method = 'GET';
      return runTest({
        httpRequest: req,
        expectedData: null,
        callableFunction: (data, context) => {
          return;
        },
        expectedHttpResponse: {
          status: 400,
          headers: expectedResponseHeaders,
          body: {
            error: { status: 'INVALID_ARGUMENT', message: 'Bad Request' },
          },
        },
      });
    });

    it('should ignore charset', () => {
      return runTest({
        httpRequest: mockRequest(null, 'application/json; charset=utf-8'),
        expectedData: null,
        callableFunction: (data, context) => {
          return;
        },
        expectedHttpResponse: {
          status: 200,
          headers: expectedResponseHeaders,
          body: { result: null },
        },
      });
    });

    it('should reject bad content type', () => {
      return runTest({
        httpRequest: mockRequest(null, 'text/plain'),
        expectedData: null,
        callableFunction: (data, context) => {
          return;
        },
        expectedHttpResponse: {
          status: 400,
          headers: expectedResponseHeaders,
          body: {
            error: { status: 'INVALID_ARGUMENT', message: 'Bad Request' },
          },
        },
      });
    });

    it('should reject extra body fields', () => {
      const req = mockRequest(null);
      req.body.extra = 'bad';
      return runTest({
        httpRequest: req,
        expectedData: null,
        callableFunction: (data, context) => {
          return;
        },
        expectedHttpResponse: {
          status: 400,
          headers: expectedResponseHeaders,
          body: {
            error: { status: 'INVALID_ARGUMENT', message: 'Bad Request' },
          },
        },
      });
    });

    it('should handle unhandled error', () => {
      return runTest({
        httpRequest: mockRequest(null),
        expectedData: null,
        callableFunction: (data, context) => {
          throw new Error(`ceci n'est pas une error`);
        },
        expectedHttpResponse: {
          status: 500,
          headers: expectedResponseHeaders,
          body: { error: { status: 'INTERNAL', message: 'INTERNAL' } },
        },
      });
    });

    it('should handle unknown error status', () => {
      return runTest({
        httpRequest: mockRequest(null),
        expectedData: null,
        callableFunction: (data, context) => {
          throw new https.HttpsError('THIS_IS_NOT_VALID' as any, 'nope');
        },
        expectedHttpResponse: {
          status: 500,
          headers: expectedResponseHeaders,
          body: { error: { status: 'INTERNAL', message: 'INTERNAL' } },
        },
      });
    });

    it('should handle well-formed error', () => {
      return runTest({
        httpRequest: mockRequest(null),
        expectedData: null,
        callableFunction: (data, context) => {
          throw new https.HttpsError('not-found', 'i am error');
        },
        expectedHttpResponse: {
          status: 404,
          headers: expectedResponseHeaders,
          body: { error: { status: 'NOT_FOUND', message: 'i am error' } },
        },
      });
    });

    it('should handle auth', async () => {
      const mock = mockFetchPublicKeys();
      const projectId = appsNamespace().admin.options.projectId;
      const idToken = generateIdToken(projectId);
      await runTest({
        httpRequest: mockRequest(null, 'application/json', {
          authorization: 'Bearer ' + idToken,
        }),
        expectedData: null,
        callableFunction: (data, context) => {
          expect(context.auth).to.not.be.undefined;
          expect(context.auth).to.not.be.null;
          expect(context.auth.uid).to.equal(mocks.user_id);
          expect(context.auth.token.uid).to.equal(mocks.user_id);
          expect(context.auth.token.sub).to.equal(mocks.user_id);
          expect(context.auth.token.aud).to.equal(projectId);
          expect(context.instanceIdToken).to.be.undefined;
          return null;
        },
        expectedHttpResponse: {
          status: 200,
          headers: expectedResponseHeaders,
          body: { result: null },
        },
      });
      mock.done();
    });

    it('should reject bad auth', async () => {
      await runTest({
        httpRequest: mockRequest(null, 'application/json', {
          authorization: 'Bearer FAKE',
        }),
        expectedData: null,
        callableFunction: (data, context) => {
          return;
        },
        expectedHttpResponse: {
          status: 401,
          headers: expectedResponseHeaders,
          body: {
            error: {
              status: 'UNAUTHENTICATED',
              message: 'Unauthenticated',
            },
          },
        },
      });
    });

    it('should handle instance id', async () => {
      await runTest({
        httpRequest: mockRequest(null, 'application/json', {
          instanceIdToken: 'iid-token',
        }),
        expectedData: null,
        callableFunction: (data, context) => {
          expect(context.auth).to.be.undefined;
          expect(context.instanceIdToken).to.equal('iid-token');
          return null;
        },
        expectedHttpResponse: {
          status: 200,
          headers: expectedResponseHeaders,
          body: { result: null },
        },
      });
    });

    it('should expose raw request', async () => {
      const mockReq = mockRequest(null, 'application/json', {});
      await runTest({
        httpRequest: mockReq,
        expectedData: null,
        callableFunction: (data, context) => {
          expect(context.rawRequest).to.not.be.undefined;
          expect(context.rawRequest).to.equal(mockReq);
          return null;
        },
        expectedHttpResponse: {
          status: 200,
          headers: expectedResponseHeaders,
          body: { result: null },
        },
      });
    });

    it('should allow both region and runtime options to be set', () => {
      const fn = functions
        .region('us-east1')
        .runWith({
          timeoutSeconds: 90,
          memory: '256MB',
        })
        .https.onCall(() => null);

      expect(fn.__trigger.regions).to.deep.equal(['us-east1']);
      expect(fn.__trigger.availableMemoryMb).to.deep.equal(256);
      expect(fn.__trigger.timeout).to.deep.equal('90s');
    });

    it('has a .run method', () => {
      const cf = https.onCall((d, c) => {
        return { data: d, context: c };
      });

      const data = 'data';
      const context = {
        instanceIdToken: 'token',
        auth: {
          uid: 'abc',
          token: 'token',
        },
      };
      expect(cf.run(data, context)).to.deep.equal({ data, context });
    });
  });
});

describe('callable CORS', () => {
  it('handles OPTIONS preflight', async () => {
    const func = https.onCall((data, context) => {
      throw new Error(
        `This shouldn't have gotten called for an OPTIONS preflight.`
      );
    });

    const req = new MockRequest(
      {},
      {
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'origin',
        Origin: 'example.com',
      }
    );
    req.method = 'OPTIONS';

    const response = await runHandler(func, req as any);

    expect(response.status).to.equal(204);
    expect(response.body).to.be.undefined;
    expect(response.headers).to.deep.equal({
      'Access-Control-Allow-Methods': 'POST',
      'Content-Length': '0',
      Vary: 'Origin, Access-Control-Request-Headers',
    });
  });
});

describe('callable', () => {
  it('encodes null', () => {
    expect(https.encode(null)).to.be.null;
    expect(https.encode(undefined)).to.be.null;
  });

  it('encodes int', () => {
    expect(https.encode(1)).to.equal(1);
    // Number isn't allowed in our own codebase, but we need to test it, in case
    // a user passes one in. There's no reason not to support it, and we don't
    // want to unintentionally encode them as {}.
    // tslint:disable-next-line
    expect(https.encode(new Number(1))).to.equal(1);
  });

  it('decodes int', () => {
    expect(https.decode(1)).to.equal(1);
  });

  it('encodes long', () => {
    expect(https.encode(-9223372036854775000)).to.equal(-9223372036854775000);
  });

  it('decodes long', () => {
    expect(
      https.decode({
        '@type': 'type.googleapis.com/google.protobuf.Int64Value',
        value: '-9223372036854775000',
      })
    ).to.equal(-9223372036854775000);
  });

  it('encodes unsigned long', () => {
    expect(https.encode(9223372036854800000)).to.equal(9223372036854800000);
  });

  it('decodes unsigned long', () => {
    expect(
      https.decode({
        '@type': 'type.googleapis.com/google.protobuf.UInt64Value',
        value: '9223372036854800000',
      })
    ).to.equal(9223372036854800000);
  });

  it('encodes double', () => {
    expect(https.encode(1.2)).to.equal(1.2);
  });

  it('decodes double', () => {
    expect(https.decode(1.2)).to.equal(1.2);
  });

  it('encodes string', () => {
    expect(https.encode('hello')).to.equal('hello');
  });

  it('decodes string', () => {
    expect(https.decode('hello')).to.equal('hello');
  });

  it('encodes array', () => {
    // TODO(klimt): Make this test more interesting once there's some type
    // that needs encoding that can be created from JavaScript.
    expect(https.encode([1, '2', [3, 4]])).to.deep.equal([1, '2', [3, 4]]);
  });

  it('decodes array', () => {
    expect(
      https.decode([
        1,
        '2',
        [
          3,
          {
            value: '1099511627776',
            '@type': 'type.googleapis.com/google.protobuf.Int64Value',
          },
        ],
      ])
    ).to.deep.equal([1, '2', [3, 1099511627776]]);
  });

  it('encodes object', () => {
    // TODO(klimt): Make this test more interesting once there's some type
    // that needs encoding that can be created from JavaScript.
    expect(
      https.encode({
        foo: 1,
        bar: 'hello',
        baz: [1, 2, 3],
      })
    ).to.deep.equal({
      foo: 1,
      bar: 'hello',
      baz: [1, 2, 3],
    });
  });

  it('decodes object', () => {
    expect(
      https.decode({
        foo: 1,
        bar: 'hello',
        baz: [
          1,
          2,
          {
            value: '1099511627776',
            '@type': 'type.googleapis.com/google.protobuf.Int64Value',
          },
        ],
      })
    ).to.deep.equal({
      foo: 1,
      bar: 'hello',
      baz: [1, 2, 1099511627776],
    });
  });
});
