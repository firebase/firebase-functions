import path from "path";
import fs from "fs";
import yaml from "js-yaml";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import portfinder from "portfinder";
import client from "firebase-tools";
import { getRuntimeDelegate } from "firebase-tools/lib/deploy/functions/runtimes/index.js";
import { detectFromPort } from "firebase-tools/lib/deploy/functions/runtimes/discovery/index.js";
import setup from "./setup.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv(): void {
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    console.log("Loading .env file from", envPath);
    const envFileContent = fs.readFileSync(envPath, "utf-8");
    envFileContent.split("\n").forEach((variable) => {
      const [key, value] = variable.split("=");
      if (key && value) process.env[key.trim()] = value.trim();
    });
  } catch (error: any) {
    console.error("Error loading .env file:", error.message);
  }
}

loadEnv();

const {
  NODE_VERSION = "18",
  FIREBASE_ADMIN = "^10.0.0",
  PROJECT_ID,
  DATABASE_URL,
  STORAGE_BUCKET,
  FIREBASE_APP_ID,
  FIREBASE_MEASUREMENT_ID,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_API_KEY,
  GOOGLE_ANALYTICS_API_SECRET,
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
  !GOOGLE_ANALYTICS_API_SECRET
) {
  console.error("Required environment variables are not set. Exiting...");
  process.exit(1);
}

setup(TEST_RUN_ID, NODE_VERSION, FIREBASE_ADMIN);

const config = {
  projectId: PROJECT_ID,
  projectDir: process.cwd(),
  sourceDir: `${process.cwd()}/functions`,
  runtime: "nodejs18",
};

const firebaseConfig = {
  databaseURL: DATABASE_URL,
  projectId: PROJECT_ID,
  storageBucket: STORAGE_BUCKET,
};
const env = {
  FIRESTORE_PREFER_REST: "true",
  GCLOUD_PROJECT: config.projectId,
  FIREBASE_CONFIG: JSON.stringify(firebaseConfig),
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
      if (file.match(`firebase-functions-${TEST_RUN_ID}.tgz`)) {
        fs.rmSync(file);
      }
      if (file.match("package.json")) {
        fs.rmSync(file);
      }
      if (file.match("firebase-debug.log")) {
        fs.rmSync(file);
      }
      if (file.match("functions.yaml")) {
        fs.rmSync(file);
      }
    });

    fs.rmSync("lib", { recursive: true });
    // fs.existsSync("node_modules") && fs.rmSync("node_modules", { recursive: true });
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
  try {
    console.log("Starting Node.js Tests...");
    const output = await spawnAsync("npm", ["test"], {
      env: {
        ...process.env,
        GOOGLE_APPLICATION_CREDENTIALS: path.join(__dirname, "serviceAccount.json"),
        TEST_RUN_ID,
      },
      stdio: "inherit",
    });
    console.log(output);
    console.log("Node.js Tests Completed.");
  } catch (error) {
    console.error("Error during testing:", error);
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
  } finally {
    await handleCleanUp();
  }
}

runIntegrationTests()
  .then(() => {
    console.log("Integration tests completed");
    process.exit(0);
  })
  .catch((error) => console.error("An error occurred during integration tests", error));
