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

import * as options from '../../../src/v2/options';
import { onTaskDispatched, Request } from '../../../src/v2/providers/tasks';
import { MockRequest } from '../../fixtures/mockrequest';
import { runHandler } from '../../helper';
import { FULL_ENDPOINT, FULL_OPTIONS, FULL_TRIGGER } from './fixtures';

describe('onTaskDispatched', () => {
  beforeEach(() => {
    options.setGlobalOptions({});
    process.env.GCLOUD_PROJECT = 'aProject';
  });

  afterEach(() => {
    delete process.env.GCLOUD_PROJECT;
  });

  it('should return a minimal trigger/endpoint with appropriate values', () => {
    const result = onTaskDispatched(() => {});

    expect(result.__trigger).to.deep.equal({
      platform: 'gcfv2',
      taskQueueTrigger: {},
      labels: {},
    });

    expect(result.__endpoint).to.deep.equal({
      platform: 'gcfv2',
      taskQueueTrigger: {},
      labels: {},
    });
  });

  it('should create a complex trigger/endpoint with appropriate values', () => {
    const result = onTaskDispatched(
      {
        ...FULL_OPTIONS,
        retryConfig: {
          maxAttempts: 4,
          maxRetrySeconds: 10,
          maxDoublings: 3,
          minBackoffSeconds: 1,
          maxBackoffSeconds: 2,
        },
        rateLimits: {
          maxConcurrentDispatches: 5,
          maxDispatchesPerSecond: 10,
        },
        invoker: 'private',
      },
      () => {}
    );

    expect(result.__trigger).to.deep.equal({
      ...FULL_TRIGGER,
      taskQueueTrigger: {
        retryConfig: {
          maxAttempts: 4,
          maxRetrySeconds: 10,
          maxDoublings: 3,
          minBackoffSeconds: 1,
          maxBackoffSeconds: 2,
        },
        rateLimits: {
          maxConcurrentDispatches: 5,
          maxDispatchesPerSecond: 10,
        },
        invoker: ['private'],
      },
    });

    expect(result.__endpoint).to.deep.equal({
      ...FULL_ENDPOINT,
      platform: 'gcfv2',
      taskQueueTrigger: {
        retryConfig: {
          maxAttempts: 4,
          maxRetrySeconds: 10,
          maxDoublings: 3,
          minBackoffSeconds: 1,
          maxBackoffSeconds: 2,
        },
        rateLimits: {
          maxConcurrentDispatches: 5,
          maxDispatchesPerSecond: 10,
        },
        invoker: ['private'],
      },
    });
  });

  it('should accept Expression<number> for the values of retryConfig and rateLimits', () => {
    const result = onTaskDispatched(
      {
        ...FULL_OPTIONS,
        retryConfig: {
          maxAttempts: '{{ params.MAXATTEMPTS }}',
          maxRetrySeconds: '{{ params.MAXRETRYSECONDS }}',
          maxDoublings: '{{ params.MAXDOUBLINGS }}',
          minBackoffSeconds: '{{ params.MINBACKOFFSECONDS }}',
          maxBackoffSeconds: '{{ params.MAXBACKOFFSECONDS }}',
        },
        rateLimits: {
          maxConcurrentDispatches: '{{ params.MAXCONCURRENTDISPATCHES }}',
          maxDispatchesPerSecond: '{{ params.MAXDISPATCHESPERSECOND }}',
        },
        invoker: 'private',
      },
      () => {}
    );

    expect(result.__trigger).to.deep.equal({
      ...FULL_TRIGGER,
      taskQueueTrigger: {
        retryConfig: {
          maxAttempts: '{{ params.MAXATTEMPTS }}',
          maxRetrySeconds: '{{ params.MAXRETRYSECONDS }}',
          maxDoublings: '{{ params.MAXDOUBLINGS }}',
          minBackoffSeconds: '{{ params.MINBACKOFFSECONDS }}',
          maxBackoffSeconds: '{{ params.MAXBACKOFFSECONDS }}',
        },
        rateLimits: {
          maxConcurrentDispatches: '{{ params.MAXCONCURRENTDISPATCHES }}',
          maxDispatchesPerSecond: '{{ params.MAXDISPATCHESPERSECOND }}',
        },
        invoker: ['private'],
      },
    });

    expect(result.__endpoint).to.deep.equal({
      ...FULL_ENDPOINT,
      platform: 'gcfv2',
      taskQueueTrigger: {
        retryConfig: {
          maxAttempts: '{{ params.MAXATTEMPTS }}',
          maxRetrySeconds: '{{ params.MAXRETRYSECONDS }}',
          maxDoublings: '{{ params.MAXDOUBLINGS }}',
          minBackoffSeconds: '{{ params.MINBACKOFFSECONDS }}',
          maxBackoffSeconds: '{{ params.MAXBACKOFFSECONDS }}',
        },
        rateLimits: {
          maxConcurrentDispatches: '{{ params.MAXCONCURRENTDISPATCHES }}',
          maxDispatchesPerSecond: '{{ params.MAXDISPATCHESPERSECOND }}',
        },
        invoker: ['private'],
      },
    });
  });

  it('should merge options and globalOptions', () => {
    options.setGlobalOptions({
      concurrency: 20,
      region: 'europe-west1',
      minInstances: 1,
    });

    const result = onTaskDispatched(
      {
        region: 'us-west1',
        minInstances: 3,
      },
      (request) => {}
    );

    expect(result.__trigger).to.deep.equal({
      platform: 'gcfv2',
      taskQueueTrigger: {},
      concurrency: 20,
      minInstances: 3,
      regions: ['us-west1'],
      labels: {},
    });

    expect(result.__endpoint).to.deep.equal({
      platform: 'gcfv2',
      taskQueueTrigger: {},
      concurrency: 20,
      minInstances: 3,
      region: ['us-west1'],
      labels: {},
    });
  });

  it('has a .run method', async () => {
    const request: any = { data: 'data' };
    const cf = onTaskDispatched((r) => {
      expect(r.data).to.deep.equal(request.data);
    });

    await cf.run(request);
  });

  it('should be an express handler', async () => {
    const func = onTaskDispatched((request) => {});

    const req = new MockRequest(
      {
        data: {},
      },
      {
        'content-type': 'application/json',
        authorization: 'Bearer abc',
        origin: 'example.com',
      }
    );
    req.method = 'POST';

    const resp = await runHandler(func, req as any);
    expect(resp.status).to.equal(204);
  });

  // These tests pass if the code transpiles
  it('allows desirable syntax', () => {
    onTaskDispatched<string>((request: Request<string>) => {
      // There should be no lint warnings that data is not a string.
      console.log(`hello, ${request.data}`);
    });
    onTaskDispatched((request: Request<string>) => {
      console.log(`hello, ${request.data}`);
    });
    onTaskDispatched<string>((request: Request) => {
      console.log(`hello, ${request.data}`);
    });
    onTaskDispatched((request: Request) => {
      console.log(`Hello, ${request.data}`);
    });
  });
});
