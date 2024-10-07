import fs from "fs";
import yaml from "js-yaml";
import { spawn } from "child_process";
import portfinder from "portfinder";
import client from "firebase-tools";
import { getRuntimeDelegate } from "firebase-tools/lib/deploy/functions/runtimes/index.js";
import { detectFromPort } from "firebase-tools/lib/deploy/functions/runtimes/discovery/index.js";
import setup from "./setup.js";
import { loadEnv } from "./utils.js";

loadEnv();

let {
  NODE_VERSION = "18",
  FIREBASE_ADMIN,
  PROJECT_ID,
  DATABASE_URL,
  STORAGE_BUCKET,
  FIREBASE_APP_ID,
  FIREBASE_MEASUREMENT_ID,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_API_KEY,
  GOOGLE_ANALYTICS_API_SECRET,
  TEST_RUNTIME,
  REGION = "us-central1",
  STORAGE_REGION = "us-central1",
} = process.env;
const TEST_RUN_ID = `t${Date.now()}`;

if (
  !PROJECT_ID ||
  !DATABASE_URL ||
  !STORAGE_BUCKET ||
  !FIREBASE_APP_ID ||
  !FIREBASE_MEASUREMENT_ID ||
  !FIREBASE_AUTH_DOMAIN ||
  !FIREBASE_API_KEY ||
  !GOOGLE_ANALYTICS_API_SECRET ||
  !TEST_RUNTIME
) {
  console.error("Required environment variables are not set. Exiting...");
  process.exit(1);
}

if (!["node", "python"].includes(TEST_RUNTIME)) {
  console.error("Invalid TEST_RUNTIME. Must be either 'node' or 'python'. Exiting...");
  process.exit(1);
}

if (!FIREBASE_ADMIN && TEST_RUNTIME === "node") {
  FIREBASE_ADMIN = "^12.0.0";
}

if (!FIREBASE_ADMIN && TEST_RUNTIME === "python") {
  FIREBASE_ADMIN = "6.5.0";
}

setup(TEST_RUNTIME as "node" | "python", TEST_RUN_ID, NODE_VERSION, FIREBASE_ADMIN!);

const config = {
  projectId: PROJECT_ID,
  projectDir: process.cwd(),
  sourceDir: `${process.cwd()}/functions`,
  runtime: TEST_RUNTIME === "node" ? "nodejs18" : "python",
};

console.log("Firebase config created: ");
console.log(JSON.stringify(config, null, 2));

const firebaseConfig = {
  databaseURL: DATABASE_URL,
  projectId: PROJECT_ID,
  storageBucket: STORAGE_BUCKET,
};

const env = {
  FIRESTORE_PREFER_REST: "true",
  GCLOUD_PROJECT: config.projectId,
  FIREBASE_CONFIG: JSON.stringify(firebaseConfig),
  REGION,
  STORAGE_REGION,
};

let modifiedYaml: any;

function generateUniqueHash(originalName: string): string {
  // Function name can only contain letters, numbers and hyphens and be less than 100 chars.
  const modifiedName = `${TEST_RUN_ID}-${originalName}`;
  if (modifiedName.length > 100) {
    throw new Error(
      `Function name is too long. Original=${originalName}, Modified=${modifiedName}`
    );
  }
  return modifiedName;
}

/**
 * Discovers endpoints and modifies functions.yaml file.
 * @returns A promise that resolves with a function to kill the server.
 */
async function discoverAndModifyEndpoints() {
  console.log("Discovering endpoints...");
  try {
    const port = await portfinder.getPortPromise({ port: 9000 });
    const delegate = await getRuntimeDelegate(config);
    const killServer = await delegate.serveAdmin(port.toString(), {}, env);

    console.log("Started on port", port);
    const originalYaml = await detectFromPort(port, config.projectId, config.runtime, 10000);

    modifiedYaml = {
      ...originalYaml,
      endpoints: Object.fromEntries(
        Object.entries(originalYaml.endpoints).map(([key, value]) => {
          const modifiedKey = generateUniqueHash(key);
          const modifiedValue: any = value;
          delete modifiedValue.project;
          delete modifiedValue.runtime;
          return [modifiedKey, modifiedValue];
        })
      ),
      specVersion: "v1alpha1",
    };

    writeFunctionsYaml("./functions/functions.yaml", modifiedYaml);

    return killServer;
  } catch (err) {
    console.error("Error discovering endpoints. Exiting.", err);
    process.exit(1);
  }
}

function writeFunctionsYaml(filePath: string, data: any): void {
  try {
    fs.writeFileSync(filePath, yaml.dump(data));
  } catch (err) {
    console.error("Error writing functions.yaml. Exiting.", err);
    process.exit(1);
  }
}

async function deployModifiedFunctions(): Promise<void> {
  console.log("Deploying functions with id:", TEST_RUN_ID);
  try {
    const targetNames = ["functions", "database", "firestore"];
    const options = {
      targetNames,
      project: config.projectId,
      config: "./firebase.json",
      debug: true,
      nonInteractive: true,
      force: true,
    };

    await client.deploy(options);

    console.log("Functions have been deployed successfully.");
  } catch (err) {
    console.error("Error deploying functions. Exiting.", err);
    throw err;
  }
}

async function removeDeployedFunctions(functionNames: string[]): Promise<void> {
  console.log("Removing deployed functions...");

  try {
    const options = {
      project: config.projectId,
      config: "./firebase.json",
      debug: true,
      nonInteractive: true,
      force: true,
    };

    console.log("Removing functions with id:", TEST_RUN_ID);
    await client.functions.delete(functionNames, options);

    console.log("Deployed functions have been removed.");
  } catch (err) {
    console.error("Error removing deployed functions. Exiting.", err);
    process.exit(1);
  }
}

function cleanFiles(): void {
  console.log("Cleaning files...");
  const functionsDir = "functions";
  process.chdir(functionsDir); // go to functions
  try {
    const files = fs.readdirSync(".");
    files.forEach((file) => {
      // For Node
      if (file.match(`firebase-functions-${TEST_RUN_ID}.tgz`)) {
        fs.rmSync(file);
      }
      // For Python
      if (file.match(`firebase_functions.tar.gz`)) {
        fs.rmSync(file);
      }
      if (file.match("package.json")) {
        fs.rmSync(file);
      }
      if (file.match("requirements.txt")) {
        fs.rmSync(file);
      }
      if (file.match("firebase-debug.log")) {
        fs.rmSync(file);
      }
      if (file.match("functions.yaml")) {
        fs.rmSync(file);
      }
    });

    fs.rmSync("lib", { recursive: true, force: true });
    fs.rmSync("venv", { recursive: true, force: true });
  } catch (error) {
    console.error("Error occurred while cleaning files:", error);
  }

  process.chdir("../"); // go back to integration_test
}

const spawnAsync = (command: string, args: string[], options: any): Promise<string> => {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);

    let output = "";
    if (child.stdout) {
      child.stdout.on("data", (data) => {
        output += data.toString();
      });
    }

    child.on("error", reject);

    child.on("close", (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
  });
};

async function runTests(): Promise<void> {
  const humanReadableRuntime = TEST_RUNTIME === "node" ? "Node.js" : "Python";
  try {
    console.log(`Starting ${humanReadableRuntime} Tests...`);
    const output = await spawnAsync("npm", ["test"], {
      env: {
        ...process.env,
        TEST_RUN_ID,
      },
      stdio: "inherit",
    });
    console.log(output);
    console.log(`${humanReadableRuntime} Tests Completed.`);
  } catch (error) {
    console.error("Error during testing:", error);
    throw error;
  }
}

async function handleCleanUp(): Promise<void> {
  console.log("Cleaning up...");
  if (modifiedYaml) {
    const endpoints = Object.keys(modifiedYaml.endpoints);
    await removeDeployedFunctions(endpoints);
  }
  cleanFiles();
}

async function gracefulShutdown(): Promise<void> {
  console.log("SIGINT received...");
  await handleCleanUp();
  process.exit(1);
}

async function runIntegrationTests(): Promise<void> {
  process.on("SIGINT", gracefulShutdown);

  try {
    const killServer = await discoverAndModifyEndpoints();
    await deployModifiedFunctions();
    await killServer();
    await runTests();
  } catch (err) {
    console.error("Error occurred during integration tests", err);
    throw new Error("Integration tests failed");
  } finally {
    await handleCleanUp();
  }
}

runIntegrationTests()
  .then(() => {
    console.log("Integration tests completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("An error occurred during integration tests", error);
    process.exit(1);
  });
