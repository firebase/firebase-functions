import * as subprocess from "child_process";
import * as path from "path";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as os from "os";

import { expect } from "chai";
import * as yaml from "js-yaml";
import fetch from "node-fetch";
import * as portfinder from "portfinder";

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

const BASE_EXTENSIONS = {
  extRef1: {
    params: {
      COLLECTION_PATH: "collection1",
      INPUT_FIELD_NAME: "input1",
      LANGUAGES: "de,es",
      OUTPUT_FIELD_NAME: "translated",
      _EVENT_ARC_REGION: "us-central1",
      "firebaseextensions.v1beta.function/location": "us-central1",
    },
    ref: "firebase/firestore-translate-text@0.1.18",
    events: ["firebase.extensions.firestore-translate-text.v1.onStart"],
  },
  extLocal2: {
    params: {
      DO_BACKFILL: "False",
      LOCATION: "us-central1",
    },
    localPath: "./functions/generated/extensions/local/backfill/0.0.2/src",
    events: [],
  },
};

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
    ttOnStart: {
      ...DEFAULT_V2_OPTIONS,
      platform: "gcfv2",
      entryPoint: "ttOnStart",
      labels: {},
      region: ["us-central1"],
      eventTrigger: {
        eventType: "firebase.extensions.firestore-translate-text.v1.onStart",
        eventFilters: {},
        retry: false,
        channel: "projects/locations/us-central1/channels/firebase",
      },
    },
  },
  requiredAPIs: [
    {
      api: "eventarcpublishing.googleapis.com",
      reason: "Needed for custom event functions",
    },
  ],
  specVersion: "v1alpha1",
  extensions: BASE_EXTENSIONS,
};

interface Testcase {
  name: string;
  modulePath: string;
  expected: Record<string, unknown>;
}

interface DiscoveryResult {
  success: boolean;
  manifest?: Record<string, unknown>;
  error?: string;
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

async function runHttpDiscovery(modulePath: string): Promise<DiscoveryResult> {
  const getPort = promisify(portfinder.getPort) as () => Promise<number>;
  const port = await getPort();

  const proc = subprocess.spawn("npx", ["firebase-functions"], {
    cwd: path.resolve(modulePath),
    env: {
      PATH: process.env.PATH,
      GCLOUD_PROJECT: "test-project",
      PORT: port.toString(),
      FUNCTIONS_CONTROL_API: "true",
    },
  });

  try {
    // Wait for server to be ready
    await retryUntil(async () => {
      try {
        await fetch(`http://localhost:${port}/__/functions.yaml`);
        return true;
      } catch (e: unknown) {
        const error = e as { code?: string };
        if (error.code === "ECONNREFUSED") {
          // This is an expected error during server startup, so we should retry.
          return false;
        }
        // Any other error is unexpected and should fail the test immediately.
        throw e;
      }
    }, TIMEOUT_L);

    const res = await fetch(`http://localhost:${port}/__/functions.yaml`);
    const body = await res.text();

    if (res.status === 200) {
      const manifest = yaml.load(body) as Record<string, unknown>;
      return { success: true, manifest };
    } else {
      return { success: false, error: body };
    }
  } finally {
    if (proc.pid) {
      proc.kill(9);
      await new Promise<void>((resolve) => proc.on("exit", resolve));
    }
  }
}

async function runFileDiscovery(modulePath: string): Promise<DiscoveryResult> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "firebase-functions-test-"));
  const outputPath = path.join(tempDir, "manifest.json");

  return new Promise((resolve, reject) => {
    const proc = subprocess.spawn("npx", ["firebase-functions"], {
      cwd: path.resolve(modulePath),
      env: {
        PATH: process.env.PATH,
        GCLOUD_PROJECT: "test-project",
        FUNCTIONS_MANIFEST_OUTPUT_PATH: outputPath,
      },
    });

    let stderr = "";

    proc.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    const timeoutId = setTimeout(() => {
      proc.kill(9);
      resolve({ success: false, error: `File discovery timed out after ${TIMEOUT_M}ms` });
    }, TIMEOUT_M);

    proc.on("close", async (code) => {
      clearTimeout(timeoutId);

      if (code === 0) {
        try {
          const manifestJson = await fs.readFile(outputPath, "utf8");
          const manifest = JSON.parse(manifestJson) as Record<string, unknown>;
          await fs.rm(tempDir, { recursive: true }).catch(() => {
            // Ignore errors
          });
          resolve({ success: true, manifest });
        } catch (e) {
          resolve({ success: false, error: `Failed to read manifest file: ${e}` });
        }
      } else {
        const errorLines = stderr.split("\n").filter((line) => line.trim());
        const errorMessage = errorLines.join(" ") || "No error message found";
        resolve({ success: false, error: errorMessage });
      }
    });

    proc.on("error", (err) => {
      clearTimeout(timeoutId);
      // Clean up temp directory on error
      fs.rm(tempDir, { recursive: true }).catch(() => {
        // Ignore errors
      });
      reject(err);
    });
  });
}

describe("functions.yaml", function () {
  // eslint-disable-next-line @typescript-eslint/no-invalid-this
  this.timeout(TIMEOUT_XL);

  const discoveryMethods = [
    { name: "http", fn: runHttpDiscovery },
    { name: "file", fn: runFileDiscovery },
  ];

  function runDiscoveryTests(
    tc: Testcase,
    discoveryFn: (path: string) => Promise<DiscoveryResult>
  ) {
    it("returns expected manifest", async function () {
      // eslint-disable-next-line @typescript-eslint/no-invalid-this
      this.timeout(TIMEOUT_M);

      const result = await discoveryFn(tc.modulePath);
      expect(result.success).to.be.true;
      expect(result.manifest).to.deep.equal(tc.expected);
    });
  }

  describe("commonjs", function () {
    // eslint-disable-next-line @typescript-eslint/no-invalid-this
    this.timeout(TIMEOUT_L);

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
            ttOnStart: {
              platform: "gcfv2",
              entryPoint: "ttOnStart",
              labels: {},
              region: ["us-central1"],
              eventTrigger: {
                eventType: "firebase.extensions.firestore-translate-text.v1.onStart",
                eventFilters: {},
                retry: false,
                channel: "projects/locations/us-central1/channels/firebase",
              },
            },
          },
          requiredAPIs: [
            {
              api: "eventarcpublishing.googleapis.com",
              reason: "Needed for custom event functions",
            },
          ],
          specVersion: "v1alpha1",
          extensions: BASE_EXTENSIONS,
        },
      },
    ];

    for (const tc of testcases) {
      describe(tc.name, () => {
        for (const discovery of discoveryMethods) {
          describe(`${discovery.name} discovery`, () => {
            runDiscoveryTests(tc, discovery.fn);
          });
        }
      });
    }
  });

  describe("esm", function () {
    // eslint-disable-next-line @typescript-eslint/no-invalid-this
    this.timeout(TIMEOUT_L);

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
        for (const discovery of discoveryMethods) {
          describe(`${discovery.name} discovery`, () => {
            runDiscoveryTests(tc, discovery.fn);
          });
        }
      });
    }
  });

  describe("error handling", () => {
    const errorTestcases = [
      {
        name: "broken syntax",
        modulePath: "./scripts/bin-test/sources/broken-syntax",
        expectedError: "missing ) after argument list",
      },
    ];

    for (const tc of errorTestcases) {
      describe(tc.name, () => {
        for (const discovery of discoveryMethods) {
          it(`${discovery.name} discovery handles error correctly`, async () => {
            const result = await discovery.fn(tc.modulePath);
            expect(result.success).to.be.false;
            expect(result.error).to.include(tc.expectedError);
          });
        }
      });
    }
  });
});
