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

import { expect } from 'chai';
import { App, deleteApp, initializeApp } from 'firebase-admin/app';

import { getApp, setApp } from '../../../src/common/app';
import * as https from '../../../src/common/providers/https';
import {
  onDispatchHandler,
  Request,
  TaskContext,
} from '../../../src/common/providers/tasks';
import * as mocks from '../../fixtures/credential/key.json';
import {
  generateIdToken,
  generateUnsignedIdToken,
  mockRequest,
} from '../../fixtures/mockrequest';
import { checkAuthContext, runHandler } from '../../helper';

/** Represents a test case for a Task Queue Function */
interface TaskTest {
  // An http request, mocking a subset of https.Request.
  httpRequest: any;

  // The expected format of the request passed to the handler.
  expectedData: any;

  taskFunction?: (data: any, context: TaskContext) => void | Promise<void>;

  taskFunction2?: (request: Request<any>) => void | Promise<void>;

  // The expected shape of the http response returned to the callable SDK.
  expectedStatus: number;
}

// Runs a TaskTest test.
export async function runTaskTest(test: TaskTest): Promise<any> {
  const taskQueueFunctionV1 = onDispatchHandler((data, context) => {
    expect(data).to.deep.equal(test.expectedData);
    if (test.taskFunction) {
      test.taskFunction(data, context);
    }
  });

  const responseV1 = await runHandler(taskQueueFunctionV1, test.httpRequest);
  expect(responseV1.status).to.equal(test.expectedStatus);

  const taskQueueFunctionV2 = onDispatchHandler((request) => {
    expect(request.data).to.deep.equal(test.expectedData);
    if (test.taskFunction2) {
      test.taskFunction2(request);
    }
  });

  const responseV2 = await runHandler(taskQueueFunctionV2, test.httpRequest);
  expect(responseV2.status).to.equal(test.expectedStatus);
}

describe('onEnqueueHandler', () => {
  let app: App;

  function mockEnqueueRequest(
    data: unknown,
    contentType: string = 'application/json',
    context: { authorization: string } = { authorization: 'Bearer abc' }
  ): ReturnType<typeof mockRequest> {
    return mockRequest(data, contentType, context);
  }

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
    app = initializeApp({
      projectId: 'aProjectId',
      credential,
    });
    setApp(app);
  });

  after(() => {
    deleteApp(app);
    setApp(undefined);
  });

  it('should handle success', () => {
    return runTaskTest({
      httpRequest: mockEnqueueRequest({ foo: 'bar' }),
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
      httpRequest: mockEnqueueRequest(null, 'application/json; charset=utf-8'),
      expectedData: null,
      expectedStatus: 204,
    });
  });

  it('should reject bad content type', () => {
    return runTaskTest({
      httpRequest: mockEnqueueRequest(null, 'text/plain'),
      expectedData: null,
      expectedStatus: 400,
    });
  });

  it('should reject extra body fields', () => {
    const req = mockEnqueueRequest(null);
    req.body.extra = 'bad';
    return runTaskTest({
      httpRequest: req,
      expectedData: null,
      expectedStatus: 400,
    });
  });

  it('should handle unhandled error', () => {
    return runTaskTest({
      httpRequest: mockEnqueueRequest(null),
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
      httpRequest: mockEnqueueRequest(null),
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
      httpRequest: mockEnqueueRequest(null),
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
    const projectId = getApp().options.projectId;
    const idToken = generateIdToken(projectId);
    await runTaskTest({
      httpRequest: mockEnqueueRequest(null, 'application/json', {
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
  });

  it('should accept unsigned auth too', async () => {
    const projectId = getApp().options.projectId;
    const idToken = generateUnsignedIdToken(projectId);
    await runTaskTest({
      httpRequest: mockEnqueueRequest(null, 'application/json', {
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
  });
});
