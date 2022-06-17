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

import * as functions from '../../../src/v1';
import { taskQueue } from '../../../src/v1/providers/tasks';
import { MockRequest } from '../../fixtures/mockrequest';
import { runHandler } from '../../helper';

describe('#onDispatch', () => {
  it('should return a trigger/endpoint with appropriate values', () => {
    const result = taskQueue({
      rateLimits: {
        maxConcurrentDispatches: 30,
        maxDispatchesPerSecond: 40,
      },
      retryConfig: {
        maxAttempts: 5,
        maxRetrySeconds: 10,
        maxBackoffSeconds: 20,
        maxDoublings: 3,
        minBackoffSeconds: 5,
      },
      invoker: 'private',
    }).onDispatch(() => {});

    expect(result.__trigger).to.deep.equal({
      taskQueueTrigger: {
        rateLimits: {
          maxConcurrentDispatches: 30,
          maxDispatchesPerSecond: 40,
        },
        retryConfig: {
          maxAttempts: 5,
          maxRetrySeconds: 10,
          maxBackoffSeconds: 20,
          maxDoublings: 3,
          minBackoffSeconds: 5,
        },
        invoker: ['private'],
      },
    });

    expect(result.__endpoint).to.deep.equal({
      platform: 'gcfv1',
      taskQueueTrigger: {
        rateLimits: {
          maxConcurrentDispatches: 30,
          maxDispatchesPerSecond: 40,
        },
        retryConfig: {
          maxAttempts: 5,
          maxRetrySeconds: 10,
          maxBackoffSeconds: 20,
          maxDoublings: 3,
          minBackoffSeconds: 5,
        },
        invoker: ['private'],
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
      .tasks.taskQueue({ retryConfig: { maxAttempts: 5 } })
      .onDispatch(() => null);

    expect(fn.__trigger).to.deep.equal({
      regions: ['us-east1'],
      availableMemoryMb: 256,
      timeout: '90s',
      taskQueueTrigger: {
        retryConfig: {
          maxAttempts: 5,
        },
      },
    });

    expect(fn.__endpoint).to.deep.equal({
      platform: 'gcfv1',
      region: ['us-east1'],
      availableMemoryMb: 256,
      timeoutSeconds: 90,
      taskQueueTrigger: {
        retryConfig: {
          maxAttempts: 5,
        },
      },
    });
  });

  it('has a .run method', async () => {
    const data = 'data';
    const context = {
      auth: {
        uid: 'abc',
        token: 'token' as any,
      },
    };
    let done = false;
    const cf = taskQueue().onDispatch((d, c) => {
      expect(d).to.equal(data);
      expect(c).to.deep.equal(context);
      done = true;
    });

    await cf.run(data, context);
    expect(done).to.be.true;
  });

  // Regression test for firebase-functions#947
  it('should lock to the v1 API even with function.length == 1', async () => {
    let gotData: Record<string, any>;
    const func = taskQueue().onDispatch((data) => {
      gotData = data;
    });

    const req = new MockRequest(
      {
        data: { foo: 'bar' },
      },
      {
        'content-type': 'application/json',
        authorization: 'Bearer abc',
      }
    );
    req.method = 'POST';

    const response = await runHandler(func, req as any);
    expect(response.status).to.equal(204);
    expect(gotData).to.deep.equal({ foo: 'bar' });
  });
});

describe('handler namespace', () => {
  it('should return an empty trigger', () => {
    const result = functions.handler.tasks.taskQueue.onDispatch(() => null);
    expect(result.__trigger).to.deep.equal({});
    expect(result.__endpoint).to.be.undefined;
  });
});
