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

import * as functions from '../../src';

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
        failurePolicy: { retry: {} },
        memory: '256MB',
      })
      .auth.user()
      .onCreate((user) => user);

    expect(fn.__trigger.availableMemoryMb).to.deep.equal(256);
    expect(fn.__trigger.timeout).to.deep.equal('90s');
    expect(fn.__trigger.failurePolicy).to.deep.equal({ retry: {} });
  });

  it("should apply a default failure policy if it's aliased with `true`", () => {
    const fn = functions
      .runWith({
        failurePolicy: true,
        memory: '256MB',
        timeoutSeconds: 90,
      })
      .auth.user()
      .onCreate((user) => user);

    expect(fn.__trigger.failurePolicy).to.deep.equal({ retry: {} });
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

  it('should throw an error if user chooses a failurePolicy which is neither an object nor a boolean', () => {
    expect(() =>
      functions.runWith({
        failurePolicy: (1234 as unknown) as functions.RuntimeOptions['failurePolicy'],
      })
    ).to.throw(Error, 'failurePolicy must be a boolean or an object');
  });

  it('should throw an error if user chooses a failurePolicy.retry which is not an object', () => {
    expect(() =>
      functions.runWith({
        failurePolicy: { retry: (1234 as unknown) as object },
      })
    ).to.throw(Error, 'failurePolicy.retry');
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

  it('should allow a ingressSettings to be set', () => {
    const fn = functions
      .runWith({ ingressSettings: 'ALLOW_INTERNAL_ONLY' })
      .https.onRequest(() => {});

    expect(fn.__trigger.ingressSettings).to.equal('ALLOW_INTERNAL_ONLY');
  });

  it('should throw an error if user chooses an invalid ingressSettings', () => {
    expect(() => {
      return functions.runWith({
        ingressSettings: 'INVALID_OPTION',
      } as any);
    }).to.throw(
      Error,
      `The only valid ingressSettings values are: ${functions.INGRESS_SETTINGS_OPTIONS.join(
        ','
      )}`
    );
  });

  it('should allow a vpcConnector to be set', () => {
    const fn = functions
      .runWith({
        vpcConnector: 'test-connector',
      })
      .auth.user()
      .onCreate((user) => user);

    expect(fn.__trigger.vpcConnector).to.equal('test-connector');
  });

  it('should allow a vpcConnectorEgressSettings to be set', () => {
    const fn = functions
      .runWith({
        vpcConnector: 'test-connector',
        vpcConnectorEgressSettings: 'PRIVATE_RANGES_ONLY',
      })
      .auth.user()
      .onCreate((user) => user);

    expect(fn.__trigger.vpcConnectorEgressSettings).to.equal(
      'PRIVATE_RANGES_ONLY'
    );
  });

  it('should throw an error if user chooses an invalid vpcConnectorEgressSettings', () => {
    expect(() => {
      return functions.runWith({
        vpcConnector: 'test-connector',
        vpcConnectorEgressSettings: 'INCORRECT_OPTION',
      } as any);
    }).to.throw(
      Error,
      `The only valid vpcConnectorEgressSettings values are: ${functions.VPC_EGRESS_SETTINGS_OPTIONS.join(
        ','
      )}`
    );
  });

  it('should allow a serviceAccount to be set as-is', () => {
    const serviceAccount = 'test-service-account@test.iam.gserviceaccount.com';
    const fn = functions
      .runWith({
        serviceAccount,
      })
      .auth.user()
      .onCreate((user) => user);

    expect(fn.__trigger.serviceAccountEmail).to.equal(serviceAccount);
  });

  it('should allow a serviceAccount to be set with generated service account email', () => {
    const serviceAccount = 'test-service-account@';
    const projectId = process.env.GCLOUD_PROJECT;
    const fn = functions
      .runWith({
        serviceAccount,
      })
      .auth.user()
      .onCreate((user) => user);

    expect(fn.__trigger.serviceAccountEmail).to.equal(
      `test-service-account@${projectId}.iam.gserviceaccount.com`
    );
  });

  it('should set a null serviceAccountEmail if service account is set to `default`', () => {
    const serviceAccount = 'default';
    const fn = functions
      .runWith({
        serviceAccount,
      })
      .auth.user()
      .onCreate((user) => user);

    expect(fn.__trigger.serviceAccountEmail).to.be.null;
  });

  it('should throw an error if serviceAccount is set to an invalid value', () => {
    const serviceAccount = 'test-service-account';
    expect(() => {
      functions.runWith({
        serviceAccount,
      });
    }).to.throw();
  });

  it('should allow setting 4GB memory option', () => {
    const fn = functions
      .runWith({
        memory: '4GB',
      })
      .region('europe-west1')
      .auth.user()
      .onCreate((user) => user);

    expect(fn.__trigger.availableMemoryMb).to.deep.equal(4096);
  });

  it('should allow labels to be set', () => {
    const fn = functions
      .runWith({
        labels: {
          'valid-key': 'valid-value',
        },
      })
      .auth.user()
      .onCreate((user) => user);

    expect(fn.__trigger.labels).to.deep.equal({
      'valid-key': 'valid-value',
    });
  });

  it('should throw an error if more than 58 labels are set', () => {
    const labels = {};
    for (let i = 0; i < 59; i++) {
      labels[`label${i}`] = 'value';
    }

    expect(() =>
      functions.runWith({
        labels,
      })
    ).to.throw();
  });

  it('should throw an error if labels has a key that is too long', () => {
    expect(() =>
      functions.runWith({
        labels: {
          'a-very-long-key-that-is-more-than-the-maximum-allowed-length-for-keys':
            'value',
        },
      })
    ).to.throw();
  });

  it('should throw an error if labels has key that is too short', () => {
    expect(() =>
      functions.runWith({
        labels: { '': 'value' },
      })
    ).to.throw();
  });

  it('should throw an error if labels has a value that is too long', () => {
    expect(() =>
      functions.runWith({
        labels: {
          key:
            'a-very-long-value-that-is-more-than-the-maximum-allowed-length-for-values',
        },
      })
    ).to.throw();
  });

  it('should throw an error if labels has a key that contains invalid characters', () => {
    expect(() =>
      functions.runWith({
        labels: {
          Key: 'value',
        },
      })
    ).to.throw();

    expect(() =>
      functions.runWith({
        labels: {
          'key ': 'value',
        },
      })
    ).to.throw();

    expect(() =>
      functions.runWith({
        labels: {
          '1key': 'value',
        },
      })
    ).to.throw();
  });

  it('should throw an error if labels has a value that contains invalid characters', () => {
    expect(() =>
      functions.runWith({
        labels: {
          key: 'Value',
        },
      })
    ).to.throw();

    expect(() =>
      functions.runWith({
        labels: {
          'key ': 'va lue',
        },
      })
    ).to.throw();
  });

  it('should throw an error if a label key starts with a reserved namespace', () => {
    expect(() =>
      functions.runWith({
        labels: {
          'firebase-foo': 'value',
        },
      })
    ).to.throw();

    expect(() =>
      functions.runWith({
        labels: {
          'deployment-bar': 'value',
        },
      })
    ).to.throw();
  });

  it('should throw an error if invoker is an empty string', () => {
    expect(() =>
      functions.runWith({
        invoker: '',
      })
    ).to.throw();
  });

  it('should throw an error if invoker is an empty array', () => {
    expect(() =>
      functions.runWith({
        invoker: [''],
      })
    ).to.throw();
  });

  it('should throw an error if invoker has an empty string', () => {
    expect(() =>
      functions.runWith({
        invoker: ['service-account1', '', 'service-account2'],
      })
    ).to.throw();
  });

  it('should throw an error if public identifier is in the invoker array', () => {
    expect(() =>
      functions.runWith({
        invoker: ['service-account1', 'public', 'service-account2'],
      })
    ).to.throw();
  });

  it('', () => {
    expect(() =>
      functions.runWith({
        invoker: ['service-account1', 'private', 'service-account2'],
      })
    ).to.throw();
  });
});
