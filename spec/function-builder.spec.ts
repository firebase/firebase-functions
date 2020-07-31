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

import * as functions from '../src/index';

describe('FunctionBuilder', () => {
  before(() => {
    process.env.GCLOUD_PROJECT = 'not-a-project';
  });

  after(() => {
    delete process.env.GCLOUD_PROJECT;
  });

  it('should allow supported region to be set', () => {
    const fn = functions
      .region('us-east1')
      .auth.user()
      .onCreate((user) => user);

    expect(fn.__trigger.regions).to.deep.equal(['us-east1']);
  });

  it('should allow multiple supported regions to be set', () => {
    const fn = functions
      .region('us-east1', 'us-central1')
      .auth.user()
      .onCreate((user) => user);

    expect(fn.__trigger.regions).to.deep.equal(['us-east1', 'us-central1']);
  });

  it('should allow all supported regions to be set', () => {
    const fn = functions
      .region(
        'us-central1',
        'us-east1',
        'us-east4',
        'europe-west1',
        'europe-west2',
        'europe-west3',
        'asia-east2',
        'asia-northeast1'
      )
      .auth.user()
      .onCreate((user) => user);

    expect(fn.__trigger.regions).to.deep.equal([
      'us-central1',
      'us-east1',
      'us-east4',
      'europe-west1',
      'europe-west2',
      'europe-west3',
      'asia-east2',
      'asia-northeast1',
    ]);
  });

  it('should allow valid runtime options to be set', () => {
    const fn = functions
      .runWith({
        timeoutSeconds: 90,
        memory: '256MB',
      })
      .auth.user()
      .onCreate((user) => user);

    expect(fn.__trigger.availableMemoryMb).to.deep.equal(256);
    expect(fn.__trigger.timeout).to.deep.equal('90s');
  });

  it('should allow both supported region and valid runtime options to be set', () => {
    const fn = functions
      .region('europe-west2')
      .runWith({
        timeoutSeconds: 90,
        memory: '256MB',
      })
      .auth.user()
      .onCreate((user) => user);

    expect(fn.__trigger.regions).to.deep.equal(['europe-west2']);
    expect(fn.__trigger.availableMemoryMb).to.deep.equal(256);
    expect(fn.__trigger.timeout).to.deep.equal('90s');
  });

  it('should allow both valid runtime options and supported region to be set in reverse order', () => {
    const fn = functions
      .runWith({
        timeoutSeconds: 90,
        memory: '256MB',
      })
      .region('europe-west1')
      .auth.user()
      .onCreate((user) => user);

    expect(fn.__trigger.regions).to.deep.equal(['europe-west1']);
    expect(fn.__trigger.availableMemoryMb).to.deep.equal(256);
    expect(fn.__trigger.timeout).to.deep.equal('90s');
  });

  it('should fail if supported region but invalid runtime options are set (reverse order)', () => {
    expect(() => {
      functions
        .region('asia-northeast1')
        .runWith({ timeoutSeconds: 600, memory: '256MB' });
    }).to.throw(Error, 'TimeoutSeconds');
  });

  it('should throw an error if user chooses an invalid memory allocation', () => {
    expect(() => {
      return functions.runWith({
        memory: 'unsupported',
      } as any);
    }).to.throw(Error, 'memory');

    expect(() => {
      return functions.region('us-east1').runWith({
        memory: 'unsupported',
      } as any);
    }).to.throw(Error, 'memory');
  });

  it('should throw an error if user chooses an invalid timeoutSeconds', () => {
    expect(() => {
      return functions.runWith({
        timeoutSeconds: 1000000,
      } as any);
    }).to.throw(Error, 'TimeoutSeconds');

    expect(() => {
      return functions.region('asia-east2').runWith({
        timeoutSeconds: 1000000,
      } as any);
    }).to.throw(Error, 'TimeoutSeconds');
  });

  it('should throw an error if user chooses no region when using .region()', () => {
    expect(() => {
      return functions.region();
    }).to.throw(Error, 'at least one region');

    expect(() => {
      return functions.region().runWith({
        timeoutSeconds: 500,
      } as any);
    }).to.throw(Error, 'at least one region');
  });
});
