import * as subprocess from "child_process";
import * as path from "path";
import { promisify } from "util";

import { expect } from "chai";
import * as yaml from "js-yaml";
import fetch from "node-fetch";
import * as portfinder from "portfinder";
import * as semver from "semver";

const TIMEOUT_XL = 20_000;
const TIMEOUT_L = 10_000;
const TIMEOUT_M = 5_000;
const TIMEOUT_S = 1_000;

const DEFAULT_OPTIONS = {
  availableMemoryMb: null,
  maxInstances: null,
  minInstances: null,
  timeoutSeconds: null,
  vpc: null,
  serviceAccountEmail: null,
  ingressSettings: null,
};

const DEFAULT_V1_OPTIONS = { ...DEFAULT_OPTIONS };

const DEFAULT_V2_OPTIONS = { ...DEFAULT_OPTIONS, concurrency: null };

const BASE_STACK = {
  endpoints: {
    v1http: {
      ...DEFAULT_V1_OPTIONS,
      platform: "gcfv1",
      entryPoint: "v1http",
      httpsTrigger: {},
    },
    v1callable: {
      ...DEFAULT_V1_OPTIONS,
      platform: "gcfv1",
      entryPoint: "v1callable",
      labels: {},
      callableTrigger: {},
    },
    v2http: {
      ...DEFAULT_V2_OPTIONS,
      platform: "gcfv2",
      entryPoint: "v2http",
      labels: {},
      httpsTrigger: {},
    },
    v2callable: {
      ...DEFAULT_V2_OPTIONS,
      platform: "gcfv2",
      entryPoint: "v2callable",
      labels: {},
      callableTrigger: {},
    },
  },
  requiredAPIs: [],
  specVersion: "v1alpha1",
};

interface Testcase {
  name: string;
  modulePath: string;
  expected: Record<string, any>;
}

async function retryUntil(
  fn: () => Promise<boolean>,
  timeoutMs: number,
  sleepMs: number = TIMEOUT_S
) {
  const sleep = () => {
    return new Promise<void>((resolve) => {
      setTimeout(() => resolve(), sleepMs);
    });
  };
  const timedOut = new Promise<never>((resolve, reject) => {
    setTimeout(() => {
      reject(new Error("retry timeout"));
    }, timeoutMs);
  });
  const retry = (async () => {
    for (;;) {
      if (await fn()) {
        break;
      }
      await sleep();
    }
  })();
  await Promise.race([retry, timedOut]);
}

async function startBin(
  tc: Testcase,
  debug?: boolean
): Promise<{ port: number; cleanup: () => Promise<void> }> {
  const getPort = promisify(portfinder.getPort) as () => Promise<number>;
  const port = await getPort();

  const proc = subprocess.spawn("npx", ["firebase-functions"], {
    cwd: path.resolve(tc.modulePath),
    env: {
      PATH: process.env.PATH,
      GLCOUD_PROJECT: "test-project",
      PORT: port.toString(),
      FUNCTIONS_CONTROL_API: "true",
    },
  });

  if (!proc) {
    throw new Error("Failed to start firebase functions");
  }

  await retryUntil(async () => {
    try {
      await fetch(`http://localhost:${port}/__/functions.yaml`);
    } catch (e) {
      if (e?.code === "ECONNREFUSED") {
        return false;
      }
      throw e;
    }
    return true;
  }, TIMEOUT_M);

  if (debug) {
    proc.stdout?.on("data", (data: unknown) => {
      console.log(`[${tc.name} stdout] ${data}`);
    });

    proc.stderr?.on("data", (data: unknown) => {
      console.log(`[${tc.name} stderr] ${data}`);
    });
  }

  return {
    port,
    cleanup: async () => {
      process.kill(proc.pid);
      await retryUntil(async () => {
        try {
          process.kill(proc.pid, 0);
        } catch {
          // process.kill w/ signal 0 will throw an error if the pid no longer exists.
          return Promise.resolve(true);
        }
        return Promise.resolve(false);
      }, TIMEOUT_M);
    },
  };
}

describe("functions.yaml", () => {
  function runTests(tc: Testcase) {
    let port: number;
    let cleanup: () => Promise<void>;

    before(async () => {
      const r = await startBin(tc);
      port = r.port;
      cleanup = r.cleanup;
    });

    after(async () => {
      await cleanup?.();
    });

    it("functions.yaml returns expected Manifest", async () => {
      const res = await fetch(`http://localhost:${port}/__/functions.yaml`);
      const text = await res.text();
      let parsed: any;
      try {
        parsed = yaml.load(text);
      } catch (err) {
        throw new Error(`Failed to parse functions.yaml: ${err}`);
      }
      expect(parsed).to.be.deep.equal(tc.expected);
    });
  }

  describe("commonjs", () => {
    const testcases: Testcase[] = [
      {
        name: "basic",
        modulePath: "./scripts/bin-test/sources/commonjs",
        expected: BASE_STACK,
      },
      {
        name: "has main",
        modulePath: "./scripts/bin-test/sources/commonjs-main",
        expected: BASE_STACK,
      },
      {
        name: "grouped",
        modulePath: "./scripts/bin-test/sources/commonjs-grouped",
        expected: {
          ...BASE_STACK,
          endpoints: {
            ...BASE_STACK.endpoints,
            "g1-groupedhttp": {
              ...DEFAULT_V1_OPTIONS,
              platform: "gcfv1",
              entryPoint: "g1.groupedhttp",
              httpsTrigger: {},
            },
            "g1-groupedcallable": {
              ...DEFAULT_V1_OPTIONS,
              platform: "gcfv1",
              entryPoint: "g1.groupedcallable",
              labels: {},
              callableTrigger: {},
            },
          },
        },
      },
      {
        name: "preserveChange",
        modulePath: "./scripts/bin-test/sources/commonjs-preserve",
        expected: {
          endpoints: {
            v1http: {
              ...DEFAULT_V1_OPTIONS,
              platform: "gcfv1",
              entryPoint: "v1http",
              httpsTrigger: {},
            },
            v1httpPreserve: {
              platform: "gcfv1",
              entryPoint: "v1httpPreserve",
              httpsTrigger: {},
            },
            v2http: {
              platform: "gcfv2",
              entryPoint: "v2http",
              labels: {},
              httpsTrigger: {},
            },
          },
          requiredAPIs: [],
          specVersion: "v1alpha1",
        },
      },
    ];

    for (const tc of testcases) {
      describe(tc.name, () => {
        runTests(tc);
      });
    }
  }).timeout(TIMEOUT_L);

  if (semver.gt(process.versions.node, "13.2.0")) {
    describe("esm", () => {
      const testcases: Testcase[] = [
        {
          name: "basic",
          modulePath: "./scripts/bin-test/sources/esm",
          expected: BASE_STACK,
        },
        {
          name: "with main",

          modulePath: "./scripts/bin-test/sources/esm-main",
          expected: BASE_STACK,
        },
        {
          name: "with .m extension",
          modulePath: "./scripts/bin-test/sources/esm-ext",
          expected: BASE_STACK,
        },
      ];

      for (const tc of testcases) {
        describe(tc.name, () => {
          runTests(tc);
        });
      }
    }).timeout(TIMEOUT_L);
  }
}).timeout(TIMEOUT_XL);
