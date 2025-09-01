import fs from "fs";
import yaml from "js-yaml";
import { spawn } from "child_process";
import portfinder from "portfinder";
import client from "firebase-tools";
import { getRuntimeDelegate } from "firebase-tools/lib/deploy/functions/runtimes/index.js";
import { detectFromPort } from "firebase-tools/lib/deploy/functions/runtimes/discovery/index.js";
import setup from "./setup.js";
import * as dotenv from "dotenv";
import { deployFunctionsWithRetry, postCleanup } from "./deployment-utils.js";
import { logger } from "./src/utils/logger.js";

dotenv.config();

let {
  DEBUG,
  NODE_VERSION = "18",
  FIREBASE_ADMIN,
  PROJECT_ID,
  DATABASE_URL,
  STORAGE_BUCKET,
  FIREBASE_APP_ID,
  FIREBASE_MEASUREMENT_ID,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_API_KEY,
  // GOOGLE_ANALYTICS_API_SECRET,
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
  // !GOOGLE_ANALYTICS_API_SECRET ||
  !TEST_RUNTIME
) {
  logger.error("Required environment variables are not set. Exiting...");
  process.exit(1);
}

if (!["node", "python"].includes(TEST_RUNTIME)) {
  logger.error("Invalid TEST_RUNTIME. Must be either 'node' or 'python'. Exiting...");
  process.exit(1);
}

// TypeScript type guard to ensure TEST_RUNTIME is the correct type
const validRuntimes = ["node", "python"] as const;
type ValidRuntime = (typeof validRuntimes)[number];
const runtime: ValidRuntime = TEST_RUNTIME as ValidRuntime;

if (!FIREBASE_ADMIN && runtime === "node") {
  FIREBASE_ADMIN = "^12.0.0";
} else if (!FIREBASE_ADMIN && runtime === "python") {
  FIREBASE_ADMIN = "6.5.0";
} else if (!FIREBASE_ADMIN) {
  throw new Error("FIREBASE_ADMIN is not set");
}

setup(runtime, TEST_RUN_ID, NODE_VERSION, FIREBASE_ADMIN);

// Configure Firebase client with project ID
logger.info("Configuring Firebase client with project ID:", PROJECT_ID);
const firebaseClient = client;

const config = {
  projectId: PROJECT_ID,
  projectDir: process.cwd(),
  sourceDir: `${process.cwd()}/functions`,
  runtime: runtime === "node" ? "nodejs18" : "python311",
};

logger.debug("Firebase config created: ");
logger.debug(JSON.stringify(config, null, 2));

const firebaseConfig = {
  databaseURL: DATABASE_URL,
  projectId: PROJECT_ID,
  storageBucket: STORAGE_BUCKET,
};

const env = {
  DEBUG,
  FIRESTORE_PREFER_REST: "true",
  GCLOUD_PROJECT: config.projectId,
  FIREBASE_CONFIG: JSON.stringify(firebaseConfig),
  REGION,
  STORAGE_REGION,
};

interface EndpointConfig {
  project?: string;
  runtime?: string;
  [key: string]: unknown;
}

interface ModifiedYaml {
  endpoints: Record<string, EndpointConfig>;
  specVersion: string;
}

let modifiedYaml: ModifiedYaml | undefined;

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
  logger.info("Discovering endpoints...");
  try {
    const port = await portfinder.getPortPromise({ port: 9000 });
    const delegate = await getRuntimeDelegate(config);
    const killServer = await delegate.serveAdmin(port.toString(), {}, env);

    logger.info("Started on port", port);
    const originalYaml = (await detectFromPort(
      port,
      config.projectId,
      config.runtime,
      10000
    )) as ModifiedYaml;

    modifiedYaml = {
      ...originalYaml,
      endpoints: Object.fromEntries(
        Object.entries(originalYaml.endpoints).map(([key, value]) => {
          const modifiedKey = generateUniqueHash(key);
          const modifiedValue: EndpointConfig = { ...value };
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
    logger.error("Error discovering endpoints. Exiting.", err);
    process.exit(1);
  }
}

function writeFunctionsYaml(filePath: string, data: any): void {
  try {
    fs.writeFileSync(filePath, yaml.dump(data));
  } catch (err) {
    logger.error("Error writing functions.yaml. Exiting.", err);
    process.exit(1);
  }
}

async function deployModifiedFunctions(): Promise<void> {
  logger.deployment(`Deploying functions with id: ${TEST_RUN_ID}`);
  try {
    // Get the function names that will be deployed
    const functionNames = modifiedYaml ? Object.keys(modifiedYaml.endpoints) : [];

    logger.deployment("Functions to deploy:", functionNames);
    logger.deployment(`Total functions to deploy: ${functionNames.length}`);

    // Deploy with rate limiting and retry logic
    await deployFunctionsWithRetry(firebaseClient, functionNames);

    logger.success("Functions have been deployed successfully.");
    logger.info("You can view your deployed functions in the Firebase Console:");
    logger.info(`   https://console.firebase.google.com/project/${PROJECT_ID}/functions`);
  } catch (err) {
    logger.error("Error deploying functions. Exiting.", err);
    throw err;
  }
}

function cleanFiles(): void {
  logger.cleanup("Cleaning files...");
  const functionsDir = "functions";
  process.chdir(functionsDir); // go to functions
  try {
    const files = fs.readdirSync(".");
    const deletedFiles: string[] = [];

    files.forEach((file) => {
      // For Node
      if (file.match(`firebase-functions-${TEST_RUN_ID}.tgz`)) {
        fs.rmSync(file);
        deletedFiles.push(file);
      }
      // For Python
      if (file.match(`firebase_functions.tar.gz`)) {
        fs.rmSync(file);
        deletedFiles.push(file);
      }
      if (file.match("package.json")) {
        fs.rmSync(file);
        deletedFiles.push(file);
      }
      if (file.match("requirements.txt")) {
        fs.rmSync(file);
        deletedFiles.push(file);
      }
      if (file.match("firebase-debug.log")) {
        fs.rmSync(file);
        deletedFiles.push(file);
      }
      if (file.match("functions.yaml")) {
        fs.rmSync(file);
        deletedFiles.push(file);
      }
    });

    // Check and delete directories
    if (fs.existsSync("lib")) {
      fs.rmSync("lib", { recursive: true, force: true });
      deletedFiles.push("lib/ (directory)");
    }
    if (fs.existsSync("venv")) {
      fs.rmSync("venv", { recursive: true, force: true });
      deletedFiles.push("venv/ (directory)");
    }

    if (deletedFiles.length > 0) {
      logger.cleanup(`Deleted ${deletedFiles.length} files/directories:`);
      deletedFiles.forEach((file, index) => {
        logger.debug(`  ${index + 1}. ${file}`);
      });
    } else {
      logger.info("No files to clean up");
    }
  } catch (error) {
    logger.error("Error occurred while cleaning files:", error);
  }

  process.chdir("../"); // go back to integration_test
}

const spawnAsync = (command: string, args: string[], options: any): Promise<string> => {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);

    let output = "";
    let errorOutput = "";

    if (child.stdout) {
      child.stdout.on("data", (data) => {
        output += data.toString();
      });
    }

    if (child.stderr) {
      child.stderr.on("data", (data) => {
        errorOutput += data.toString();
      });
    }

    child.on("error", reject);

    child.on("close", (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        const errorMessage = `Command failed with exit code ${code}`;
        const fullError = errorOutput ? `${errorMessage}\n\nSTDERR:\n${errorOutput}` : errorMessage;
        reject(new Error(fullError));
      }
    });

    // Add timeout to prevent hanging
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error(`Command timed out after 5 minutes: ${command} ${args.join(" ")}`));
    }, 5 * 60 * 1000); // 5 minutes

    child.on("close", () => {
      clearTimeout(timeout);
    });
  });
};

async function runTests(): Promise<void> {
  const humanReadableRuntime = TEST_RUNTIME === "node" ? "Node.js" : "Python";
  try {
    logger.info(`Starting ${humanReadableRuntime} Tests...`);
    logger.info("Running all integration tests");

    // Run all tests
    const output = await spawnAsync("npx", ["jest", "--verbose"], {
      env: {
        ...process.env,
        TEST_RUN_ID,
      },
    });

    logger.info("Test output received:");
    logger.debug(output);

    // Check if tests passed
    if (output.includes("PASS") && !output.includes("FAIL")) {
      logger.success("All tests completed successfully!");
      logger.success("All function triggers are working correctly.");
    } else {
      logger.warning("Some tests may have failed. Check the output above.");
    }

    logger.info(`${humanReadableRuntime} Tests Completed.`);
  } catch (error) {
    logger.error("Error during testing:", error);
    throw error;
  }
}

async function handleCleanUp(): Promise<void> {
  logger.cleanup("Cleaning up...");
  try {
    // Use our new post-cleanup utility with rate limiting
    await postCleanup(firebaseClient, TEST_RUN_ID);
  } catch (err) {
    logger.error("Error during post-cleanup:", err);
    // Don't throw here to ensure files are still cleaned
  }
  cleanFiles();
}

async function gracefulShutdown(): Promise<void> {
  logger.info("SIGINT received...");
  await handleCleanUp();
  process.exit(1);
}

async function runIntegrationTests(): Promise<void> {
  process.on("SIGINT", gracefulShutdown);

  try {
    // Skip pre-cleanup for now to test if the main flow works
    logger.info("Skipping pre-cleanup for testing...");

    const killServer = await discoverAndModifyEndpoints();
    await deployModifiedFunctions();
    await killServer();
    await runTests();
  } catch (err) {
    logger.error("Error occurred during integration tests:", err);
    // Re-throw the original error instead of wrapping it
    throw err;
  } finally {
    await handleCleanUp();
  }
}

runIntegrationTests()
  .then(() => {
    logger.success("Integration tests completed");
    process.exit(0);
  })
  .catch((error) => {
    logger.error("An error occurred during integration tests", error);
    process.exit(1);
  });
