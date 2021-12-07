import { expect } from 'chai';
import * as path from 'path';
import * as semver from 'semver';

import * as loader from '../../src/runtime/loader';
import * as functions from '../../src/index';

import {
  ManifestStack,
  ManifestEndpoint,
  ManifestRequiredAPI,
} from '../../src/runtime/manifest';

describe('extractStack', () => {
  const httpFn = functions.https.onRequest(() => {});
  const httpEndpoint =  {
    platform: 'gcfv1',
    httpsTrigger: {},
  };

  const callableFn = functions.https.onCall(() => {});
  const callableEndpoint =  {
    platform: 'gcfv1',
    labels: {}, // TODO: empty labels?
    callableTrigger: {},
  };

  it('extracts stack from a simple module', () => {
    const module = {
      http: httpFn,
      callable: callableFn,
    };

    const endpoints: Record<string, ManifestEndpoint> = {};
    const requiredAPIs: Record<string, ManifestRequiredAPI> = {};
    loader.extractStack(module, endpoints, requiredAPIs);

    expect(endpoints).to.be.deep.equal({
      http: {entryPoint: 'http', ...httpEndpoint},
      callable: {entryPoint: 'callable', ...callableEndpoint},
    });

    expect(requiredAPIs).to.be.empty;
  });

  it('extracts stack with required APIs', () => {
    const module = {
      taskq: functions.https.taskQueue().onDispatch(() => {}),
    };

    const endpoints: Record<string, ManifestEndpoint> = {};
    const requiredAPIs: Record<string, ManifestRequiredAPI> = {};
    loader.extractStack(module, endpoints, requiredAPIs);

    expect(endpoints).to.be.deep.equal({
      taskq: {
        entryPoint: 'taskq',
        platform: 'gcfv1',
        taskQueueTrigger: {},
      },
    });

    expect(requiredAPIs).to.be.deep.equal({
      'cloudtasks.googleapis.com': {
        api: 'cloudtasks.googleapis.com',
        reason: 'Needed for v1 task queue functions',
      },
    });
  });

  it('extracts stack from a module with group functions', () => {
    const module = {
      fn1: httpFn,
      g1: {
        fn2: httpFn,
      },
    };

    const endpoints: Record<string, ManifestEndpoint> = {};
    const requiredAPIs: Record<string, ManifestRequiredAPI> = {};
    loader.extractStack(module, endpoints, requiredAPIs);
    expect(endpoints).to.be.deep.equal({
      fn1: {
        entryPoint: 'fn1',
        ...httpEndpoint,
      },
      'g1-fn2': {
        entryPoint: 'g1.fn2',
        ...httpEndpoint,
      },
    });
  });

  describe('with GCLOUD_PROJECT env var', () => {
    const project = 'my-project';
    let prev;

    beforeEach(() => {
      prev = process.env.GCLOUD_PROJECT;
      process.env.GCLOUD_PROJECT = project;
    });

    afterEach(() => {
      process.env.GCLOUD_PROJECT = prev;
    });

    it('extracts stack from a simple module', () => {
      const module = {
        fn: functions.pubsub.topic('my-topic').onPublish(() => {}),
      };

      const endpoints: Record<string, ManifestEndpoint> = {};
      const requiredAPIs: Record<string, ManifestRequiredAPI> = {};
      loader.extractStack(module, endpoints, requiredAPIs);

      expect(endpoints).to.be.deep.equal({
        fn: {
          entryPoint: 'fn',
          platform: 'gcfv1',
          eventTrigger: {
            eventType: 'google.pubsub.topic.publish',
            eventFilters: { resource: 'projects/my-project/topics/my-topic' },
            retry: false,
          },
        },
      });
    });

    it('extracts stack with required APIs', () => {
      const module = {
        scheduled: functions.pubsub.schedule('every 5 minutes').onRun(() => {}),
      };

      const endpoints: Record<string, ManifestEndpoint> = {};
      const requiredAPIs: Record<string, ManifestRequiredAPI> = {};
      loader.extractStack(module, endpoints, requiredAPIs);

      expect(endpoints).to.be.deep.equal({
        scheduled: {
          entryPoint: 'scheduled',
          platform: 'gcfv1',
          // TODO: This label should not exist?
          labels: {
            'deployment-scheduled': 'true',
          },
          scheduleTrigger: { schedule: 'every 5 minutes' },
        },
      });

      expect(requiredAPIs).to.be.deep.equal({
        'cloudscheduler.googleapis.com': {
          api: 'cloudscheduler.googleapis.com',
          reason: 'Needed for v1 scheduled functions.',
        },
        'pubsub.googleapis.com': {
          api: 'pubsub.googleapis.com',
          reason: 'Needed for v1 scheduled functions.',
        },
      });
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
          },
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
