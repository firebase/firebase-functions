import { expect } from 'chai';
import * as express from 'express';
import * as firebase from 'firebase-admin';
import * as sinon from 'sinon';

import { apps as appsNamespace } from '../../../src/apps';
import * as debug from '../../../src/common/debug';
import * as https from '../../../src/common/providers/https';
import {
  CallableContext,
  CallableRequest,
  TaskContext,
  TaskRequest,
  unsafeDecodeAppCheckToken,
  unsafeDecodeIdToken,
} from '../../../src/common/providers/https';
import * as mocks from '../../fixtures/credential/key.json';
import {
  expectedResponseHeaders,
  generateAppCheckToken,
  generateIdToken,
  generateUnsignedAppCheckToken,
  generateUnsignedIdToken,
  mockFetchAppCheckPublicJwks,
  mockFetchPublicKeys,
  mockRequest,
} from '../../fixtures/mockrequest';

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

  callableFunction2: (request: https.CallableRequest<any>) => any;

  callableOption?: https.CallableOptions;

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

// Runs a CallTest test.
async function runCallableTest(test: CallTest): Promise<any> {
  const opts = {
    cors: { origin: true, methods: 'POST' },
    ...test.callableOption,
  };
  const callableFunctionV1 = https.onCallHandler(opts, (data, context) => {
    expect(data).to.deep.equal(test.expectedData);
    return test.callableFunction(data, context);
  });

  const responseV1 = await runHandler(callableFunctionV1, test.httpRequest);

  expect(responseV1.body).to.deep.equal(test.expectedHttpResponse.body);
  expect(responseV1.headers).to.deep.equal(test.expectedHttpResponse.headers);
  expect(responseV1.status).to.equal(test.expectedHttpResponse.status);

  const callableFunctionV2 = https.onCallHandler(opts, (request) => {
    expect(request.data).to.deep.equal(test.expectedData);
    return test.callableFunction2(request);
  });

  const responseV2 = await runHandler(callableFunctionV2, test.httpRequest);

  expect(responseV2.body).to.deep.equal(test.expectedHttpResponse.body);
  expect(responseV2.headers).to.deep.equal(test.expectedHttpResponse.headers);
  expect(responseV2.status).to.equal(test.expectedHttpResponse.status);
}

/** Represents a test case for a Task Queue Function */
interface TaskTest {
  // An http request, mocking a subset of https.Request.
  httpRequest: any;

  // The expected format of the request passed to the handler.
  expectedData: any;

  taskFunction?: (
    data: any,
    context: https.TaskContext
  ) => void | Promise<void>;

  taskFunction2?: (request: https.TaskRequest<any>) => void | Promise<void>;

  // The expected shape of the http response returned to the callable SDK.
  expectedStatus: number;
}

// Runs a TaskTest test.
async function runTaskTest(test: TaskTest): Promise<any> {
  const taskQueueFunctionV1 = https.onDispatchHandler((data, context) => {
    expect(data).to.deep.equal(test.expectedData);
    if (test.taskFunction) {
      test.taskFunction(data, context);
    }
  });

  const responseV1 = await runHandler(taskQueueFunctionV1, test.httpRequest);
  expect(responseV1.status).to.equal(test.expectedStatus);

  const taskQueueFunctionV2 = https.onDispatchHandler((request) => {
    expect(request.data).to.deep.equal(test.expectedData);
    if (test.taskFunction2) {
      test.taskFunction2(request);
    }
  });

  const responseV2 = await runHandler(taskQueueFunctionV2, test.httpRequest);
  expect(responseV2.status).to.equal(test.expectedStatus);
}

function checkAuthContext(
  context: CallableContext | CallableRequest | TaskContext | TaskRequest,
  projectId: string,
  userId: string
) {
  expect(context.auth).to.not.be.undefined;
  expect(context.auth).to.not.be.null;
  expect(context.auth.uid).to.equal(userId);
  expect(context.auth.token.uid).to.equal(userId);
  expect(context.auth.token.sub).to.equal(userId);
  expect(context.auth.token.aud).to.equal(projectId);

  // TaskContext & TaskRequest don't have instanceIdToken
  if ({}.hasOwnProperty.call(context, 'instanceIdToken')) {
    expect((context as CallableContext).instanceIdToken).to.be.undefined;
  }
}

function checkAppCheckContext(
  context: CallableContext | CallableRequest,
  projectId: string,
  appId: string
) {
  expect(context.app).to.not.be.undefined;
  expect(context.app).to.not.be.null;
  expect(context.app.appId).to.equal(appId);
  expect(context.app.token.app_id).to.be.equal(appId);
  expect(context.app.token.sub).to.be.equal(appId);
  expect(context.app.token.aud).to.be.deep.equal([`projects/${projectId}`]);
  expect(context.auth).to.be.undefined;
  expect(context.instanceIdToken).to.be.undefined;
}

describe('onCallHandler', () => {
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

  it('should handle success', () => {
    return runCallableTest({
      httpRequest: mockRequest({ foo: 'bar' }),
      expectedData: { foo: 'bar' },
      callableFunction: (data, context) => ({ baz: 'qux' }),
      callableFunction2: (request) => ({ baz: 'qux' }),
      expectedHttpResponse: {
        status: 200,
        headers: expectedResponseHeaders,
        body: { result: { baz: 'qux' } },
      },
    });
  });

  it('should handle null data and return', () => {
    return runCallableTest({
      httpRequest: mockRequest(null),
      expectedData: null,
      callableFunction: (data, context) => null,
      callableFunction2: (request) => null,
      expectedHttpResponse: {
        status: 200,
        headers: expectedResponseHeaders,
        body: { result: null },
      },
    });
  });

  it('should handle void return', () => {
    return runCallableTest({
      httpRequest: mockRequest(null),
      expectedData: null,
      callableFunction: (data, context) => {
        return;
      },
      callableFunction2: (request) => {
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
    return runCallableTest({
      httpRequest: req,
      expectedData: null,
      callableFunction: (data, context) => {
        return;
      },
      callableFunction2: (request) => {
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
    return runCallableTest({
      httpRequest: mockRequest(null, 'application/json; charset=utf-8'),
      expectedData: null,
      callableFunction: (data, context) => {
        return;
      },
      callableFunction2: (request) => {
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
    return runCallableTest({
      httpRequest: mockRequest(null, 'text/plain'),
      expectedData: null,
      callableFunction: (data, context) => {
        return;
      },
      callableFunction2: (request) => {
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
    return runCallableTest({
      httpRequest: req,
      expectedData: null,
      callableFunction: (data, context) => {
        return;
      },
      callableFunction2: (request) => {
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
    return runCallableTest({
      httpRequest: mockRequest(null),
      expectedData: null,
      callableFunction: (data, context) => {
        throw new Error(`ceci n'est pas une error`);
      },
      callableFunction2: (request) => {
        throw new Error(`cece n'est pas une error`);
      },
      expectedHttpResponse: {
        status: 500,
        headers: expectedResponseHeaders,
        body: { error: { status: 'INTERNAL', message: 'INTERNAL' } },
      },
    });
  });

  it('should handle unknown error status', () => {
    return runCallableTest({
      httpRequest: mockRequest(null),
      expectedData: null,
      callableFunction: (data, context) => {
        throw new https.HttpsError('THIS_IS_NOT_VALID' as any, 'nope');
      },
      callableFunction2: (request) => {
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
    return runCallableTest({
      httpRequest: mockRequest(null),
      expectedData: null,
      callableFunction: (data, context) => {
        throw new https.HttpsError('not-found', 'i am error');
      },
      callableFunction2: (request) => {
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
    await runCallableTest({
      httpRequest: mockRequest(null, 'application/json', {
        authorization: 'Bearer ' + idToken,
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
    mock.done();
  });

  it('should reject bad auth', async () => {
    const projectId = appsNamespace().admin.options.projectId;
    const idToken = generateUnsignedIdToken(projectId);
    await runCallableTest({
      httpRequest: mockRequest(null, 'application/json', {
        authorization: 'Bearer ' + idToken,
      }),
      expectedData: null,
      callableFunction: (data, context) => {
        return;
      },
      callableFunction2: (request) => {
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

  it('should handle AppCheck token', async () => {
    const mock = mockFetchAppCheckPublicJwks();
    const projectId = appsNamespace().admin.options.projectId;
    const appId = '123:web:abc';
    const appCheckToken = generateAppCheckToken(projectId, appId);
    await runCallableTest({
      httpRequest: mockRequest(null, 'application/json', { appCheckToken }),
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
    mock.done();
  });

  it('should reject bad AppCheck token', async () => {
    const projectId = appsNamespace().admin.options.projectId;
    const appId = '123:web:abc';
    const appCheckToken = generateUnsignedAppCheckToken(projectId, appId);
    await runCallableTest({
      httpRequest: mockRequest(null, 'application/json', { appCheckToken }),
      expectedData: null,
      callableFunction: (data, context) => {
        return;
      },
      callableFunction2: (request) => {
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

  it('should handle bad AppCheck token with callable option', async () => {
    await runCallableTest({
      httpRequest: mockRequest(null, 'application/json', {
        appCheckToken: 'FAKE',
      }),
      expectedData: null,
      callableFunction: (data, context) => {
        return;
      },
      callableFunction2: (request) => {
        return;
      },
      callableOption: {
        cors: { origin: true, methods: 'POST' },
        allowInvalidAppCheckToken: true,
      },
      expectedHttpResponse: {
        status: 200,
        headers: expectedResponseHeaders,
        body: { result: null },
      },
    });
  });

  it('should handle instance id', async () => {
    await runCallableTest({
      httpRequest: mockRequest(null, 'application/json', {
        instanceIdToken: 'iid-token',
      }),
      expectedData: null,
      callableFunction: (data, context) => {
        expect(context.auth).to.be.undefined;
        expect(context.instanceIdToken).to.equal('iid-token');
        return null;
      },
      callableFunction2: (request) => {
        expect(request.auth).to.be.undefined;
        expect(request.instanceIdToken).to.equal('iid-token');
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

  describe('skip token verification debug mode support', () => {
    before(() => {
      sinon
        .stub(debug, 'isDebugFeatureEnabled')
        .withArgs('skipTokenVerification')
        .returns(true);
    });

    after(() => {
      sinon.verifyAndRestore();
    });

    it('should skip auth token verification', async () => {
      const projectId = appsNamespace().admin.options.projectId;
      const idToken = generateUnsignedIdToken(projectId);
      await runCallableTest({
        httpRequest: mockRequest(null, 'application/json', {
          authorization: 'Bearer ' + idToken,
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

    it('should skip app check token verification', async () => {
      const projectId = appsNamespace().admin.options.projectId;
      const appId = '123:web:abc';
      const appCheckToken = generateUnsignedAppCheckToken(projectId, appId);
      await runCallableTest({
        httpRequest: mockRequest(null, 'application/json', { appCheckToken }),
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

describe('onEnqueueHandler', () => {
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

  it('should handle success', () => {
    return runTaskTest({
      httpRequest: mockRequest({ foo: 'bar' }),
      expectedData: { foo: 'bar' },
      expectedStatus: 204,
    });
  });

  it('should reject bad method', () => {
    const req = mockRequest(null);
    req.method = 'GET';
    return runTaskTest({
      httpRequest: req,
      expectedData: null,
      expectedStatus: 400,
    });
  });

  it('should ignore charset', () => {
    return runTaskTest({
      httpRequest: mockRequest(null, 'application/json; charset=utf-8'),
      expectedData: null,
      expectedStatus: 204,
    });
  });

  it('should reject bad content type', () => {
    return runTaskTest({
      httpRequest: mockRequest(null, 'text/plain'),
      expectedData: null,
      expectedStatus: 400,
    });
  });

  it('should reject extra body fields', () => {
    const req = mockRequest(null);
    req.body.extra = 'bad';
    return runTaskTest({
      httpRequest: req,
      expectedData: null,
      expectedStatus: 400,
    });
  });

  it('should handle unhandled error', () => {
    return runTaskTest({
      httpRequest: mockRequest(null),
      expectedData: null,
      taskFunction: (data, context) => {
        throw new Error(`ceci n'est pas une error`);
      },
      taskFunction2: (request) => {
        throw new Error(`cece n'est pas une error`);
      },
      expectedStatus: 500,
    });
  });

  it('should handle unknown error status', () => {
    return runTaskTest({
      httpRequest: mockRequest(null),
      expectedData: null,
      taskFunction: (data, context) => {
        throw new https.HttpsError('THIS_IS_NOT_VALID' as any, 'nope');
      },
      taskFunction2: (request) => {
        throw new https.HttpsError('THIS_IS_NOT_VALID' as any, 'nope');
      },
      expectedStatus: 500,
    });
  });

  it('should handle well-formed error', () => {
    return runTaskTest({
      httpRequest: mockRequest(null),
      expectedData: null,
      taskFunction: (data, context) => {
        throw new https.HttpsError('not-found', 'i am error');
      },
      taskFunction2: (request) => {
        throw new https.HttpsError('not-found', 'i am error');
      },
      expectedStatus: 404,
    });
  });

  it('should handle auth', async () => {
    const mock = mockFetchPublicKeys();
    const projectId = appsNamespace().admin.options.projectId;
    const idToken = generateIdToken(projectId);
    await runTaskTest({
      httpRequest: mockRequest(null, 'application/json', {
        authorization: 'Bearer ' + idToken,
      }),
      expectedData: null,
      taskFunction: (data, context) => {
        checkAuthContext(context, projectId, mocks.user_id);
        return null;
      },
      taskFunction2: (request) => {
        checkAuthContext(request, projectId, mocks.user_id);
        return null;
      },
      expectedStatus: 204,
    });
    mock.done();
  });

  it('should reject bad auth', async () => {
    const projectId = appsNamespace().admin.options.projectId;
    const idToken = generateUnsignedIdToken(projectId);
    await runTaskTest({
      httpRequest: mockRequest(null, 'application/json', {
        authorization: 'Bearer ' + idToken,
      }),
      expectedData: null,
      expectedStatus: 401,
    });
  });

  describe('skip token verification debug mode support', () => {
    before(() => {
      sinon
        .stub(debug, 'isDebugFeatureEnabled')
        .withArgs('skipTokenVerification')
        .returns(true);
    });

    after(() => {
      sinon.verifyAndRestore();
    });

    it('should skip auth token verification', async () => {
      const projectId = appsNamespace().admin.options.projectId;
      const idToken = generateUnsignedIdToken(projectId);
      await runTaskTest({
        httpRequest: mockRequest(null, 'application/json', {
          authorization: 'Bearer ' + idToken,
        }),
        expectedData: null,
        taskFunction: (data, context) => {
          checkAuthContext(context, projectId, mocks.user_id);
        },
        taskFunction2: (request) => {
          checkAuthContext(request, projectId, mocks.user_id);
        },
        expectedStatus: 204,
      });
    });
  });
});

describe('encoding/decoding', () => {
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

  it('encodes function as an empty object', () => {
    expect(https.encode(() => 'foo')).to.deep.equal({});
  });
});

describe('decode tokens', () => {
  const projectId = 'myproject';
  const appId = '123:web:abc';

  it('decodes valid Auth ID Token', () => {
    const idToken = unsafeDecodeIdToken(generateIdToken(projectId));
    expect(idToken.uid).to.equal(mocks.user_id);
    expect(idToken.sub).to.equal(mocks.user_id);
  });

  it('decodes invalid Auth ID Token', () => {
    const idToken = unsafeDecodeIdToken(generateUnsignedIdToken(projectId));
    expect(idToken.uid).to.equal(mocks.user_id);
    expect(idToken.sub).to.equal(mocks.user_id);
  });

  it('decodes valid App Check Token', () => {
    const idToken = unsafeDecodeAppCheckToken(
      generateAppCheckToken(projectId, appId)
    );
    expect(idToken.app_id).to.equal(appId);
    expect(idToken.sub).to.equal(appId);
  });

  it('decodes invalid App Check Token', () => {
    const idToken = unsafeDecodeAppCheckToken(
      generateUnsignedAppCheckToken(projectId, appId)
    );
    expect(idToken.app_id).to.equal(appId);
    expect(idToken.sub).to.equal(appId);
  });
});
