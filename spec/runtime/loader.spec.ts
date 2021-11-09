import { expect } from 'chai';
import * as path from 'path';
import * as semver from 'semver';

import * as loader from '../../src/runtime/loader';
import { ManifestBackend, ManifestEndpoint } from '../../src/runtime/manifest';

function annotatedFn(
  endpoint: ManifestEndpoint
): Function & { __endpoint: ManifestEndpoint } {
  const noop = () => {};
  noop.__endpoint = endpoint;
  return noop;
}

const HTTP_ENDPOINT = {
  platform: 'gcfv1',
  httpsTrigger: {},
};

const EVENT_ENDPOINT = {
  platform: 'gcfv2',
  eventTrigger: {
    eventType: 'google.cloud.storage.object.v1.archived',
    eventFilters: { bucket: 'my-bucket' },
    retry: false,
  },
};

describe('extractEndpoints', () => {
  it('extracts endpoints from a simple module', () => {
    const module = {
      fn1: annotatedFn(HTTP_ENDPOINT),
      fn2: annotatedFn(EVENT_ENDPOINT),
    };

    const endpoints: Record<string, ManifestEndpoint> = {};
    loader.extractEndpoints(module, endpoints);
    expect(endpoints).to.be.deep.equal({
      fn1: {
        entryPoint: 'fn1',
        ...HTTP_ENDPOINT,
      },
      fn2: {
        entryPoint: 'fn2',
        ...EVENT_ENDPOINT,
      },
    });
  });

  it('extracts endpoints from a module with group functions', () => {
    const module = {
      fn1: annotatedFn(HTTP_ENDPOINT),
      g1: {
        fn2: annotatedFn(EVENT_ENDPOINT),
      },
    };

    const endpoints: Record<string, ManifestEndpoint> = {};
    loader.extractEndpoints(module, endpoints);
    expect(endpoints).to.be.deep.equal({
      fn1: {
        entryPoint: 'fn1',
        ...HTTP_ENDPOINT,
      },
      'g1-fn2': {
        entryPoint: 'g1.fn2',
        ...EVENT_ENDPOINT,
      },
    });
  });
});

describe('loadBackend', () => {
  const expected: ManifestBackend = {
    endpoints: {
      v1http: {
        platform: 'gcfv1',
        entryPoint: 'v1http',
        httpsTrigger: {},
      },
      v1callable: {
        platform: 'gcfv1',
        entryPoint: 'v1callable',
        labels: {},
        callableTrigger: {},
      },
    },
    requiredAPIs: {},
    specVersion: 'v1alpha1',
  };

  type Testcase = {
    name: string;
    modulePath: string;
    expected: ManifestBackend;
  };

  function runTests(tc: Testcase) {
    it('loads backend given relative path', async () => {
      await expect(loader.loadBackend(tc.modulePath)).to.eventually.deep.equal(
        tc.expected
      );
    });

    it('loads backend given absolute path', async () => {
      await expect(
        loader.loadBackend(path.join(process.cwd(), tc.modulePath))
      ).to.eventually.deep.equal(tc.expected);
    });
  }

  let prev;
  beforeEach(() => {
    // TODO: When __trigger annotation is removed and GCLOUD_PROJECT is not required at runtime, remove this.
    prev = process.env.GCLOUD_PROJECT;
    process.env.GCLOUD_PROJECT = 'test-project';
  });

  afterEach(() => {
    process.env.GCLOUD_PROJECT = prev;
  });

  describe('commonjs', () => {
    const testcases: Testcase[] = [
      {
        name: 'basic',
        modulePath: './spec/fixtures/sources/commonjs',
        expected,
      },
      {
        name: 'has main',
        modulePath: './spec/fixtures/sources/commonjs-main',
        expected,
      },
      {
        name: 'grouped',
        modulePath: './spec/fixtures/sources/commonjs-grouped',
        expected: {
          endpoints: {
            v1http: {
              platform: 'gcfv1',
              entryPoint: 'v1http',
              httpsTrigger: {},
            },
            'g1-v1callable': {
              platform: 'gcfv1',
              entryPoint: 'g1.v1callable',
              labels: {},
              callableTrigger: {},
            },
          },
          requiredAPIs: {},
          specVersion: 'v1alpha1',
        },
      },
      {
        name: 'scheduled',
        modulePath: './spec/fixtures/sources/commonjs-scheduled',
        expected: {
          endpoints: {
            scheduled: {
              platform: 'gcfv1',
              entryPoint: 'scheduled',
              labels: {
                'deployment-scheduled': 'true',
              },
              scheduleTrigger: {
                schedule: 'every 5 minutes',
              },
            },
          },
          requiredAPIs: {
            pubsub: 'pubsub.googleapis.com',
            scheduler: 'cloudscheduler.googleapis.com',
          },
          specVersion: 'v1alpha1',
        },
      },
    ];

    for (const tc of testcases) {
      describe(tc.name, () => {
        runTests(tc);
      });
    }
  });

  if (semver.gt(process.versions.node, '13.2.0')) {
    describe('esm', () => {
      const testcases: Testcase[] = [
        {
          name: 'basic',
          modulePath: './spec/fixtures/sources/esm',
          expected,
        },
        {
          name: 'with main',
          modulePath: './spec/fixtures/sources/esm-main',
          expected,
        },
        {
          name: 'with .m extension',
          modulePath: './spec/fixtures/sources/esm-ext',
          expected,
        },
      ];

      for (const tc of testcases) {
        describe(tc.name, () => {
          runTests(tc);
        });
      }
    });
  }
});
