import { expect } from 'chai';
import * as path from 'path';
import * as semver from 'semver';

import * as loader from '../../src/runtime/loader';
import {
  ManifestStack,
  ManifestEndpoint,
  ManifestRequiredAPI,
} from '../../src/runtime/manifest';

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

describe('extractStack', () => {
  it('extracts stack from a simple module', () => {
    const module = {
      fn1: annotatedFn(HTTP_ENDPOINT),
      fn2: annotatedFn(EVENT_ENDPOINT),
    };

    const endpoints: Record<string, ManifestEndpoint> = {};
    const requiredAPIs: Record<string, ManifestRequiredAPI> = {};
    loader.extractStack(module, endpoints, requiredAPIs);
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

  it('extracts stack from a module with group functions', () => {
    const module = {
      fn1: annotatedFn(HTTP_ENDPOINT),
      g1: {
        fn2: annotatedFn(EVENT_ENDPOINT),
      },
    };

    const endpoints: Record<string, ManifestEndpoint> = {};
    const requiredAPIs: Record<string, ManifestRequiredAPI> = {};
    loader.extractStack(module, endpoints, requiredAPIs);
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

describe('loadStack', () => {
  const expected: ManifestStack = {
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
      v2http: {
        platform: 'gcfv2',
        entryPoint: 'v2http',
        labels: {},
        httpsTrigger: {},
      },
      v2callable: {
        platform: 'gcfv2',
        entryPoint: 'v2callable',
        labels: {},
        callableTrigger: {},
      },
    },
    requiredAPIs: [],
    specVersion: 'v1alpha1',
  };

  type Testcase = {
    name: string;
    modulePath: string;
    expected: ManifestStack;
  };

  function runTests(tc: Testcase) {
    it('loads backend given relative path', async () => {
      await expect(loader.loadStack(tc.modulePath)).to.eventually.deep.equal(
        tc.expected
      );
    });

    it('loads backend given absolute path', async () => {
      await expect(
        loader.loadStack(path.join(process.cwd(), tc.modulePath))
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
          ...expected,
          endpoints: {
            ...expected.endpoints,
            'g1-groupedhttp': {
              platform: 'gcfv1',
              entryPoint: 'g1.groupedhttp',
              httpsTrigger: {},
            },
            'g1-groupedcallable': {
              platform: 'gcfv1',
              entryPoint: 'g1.groupedcallable',
              labels: {},
              callableTrigger: {},
            },
          }
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
