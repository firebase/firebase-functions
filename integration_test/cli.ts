#!/usr/bin/env node

import { spawn } from "child_process";
import { promises as fs } from "fs";
import { join } from "path";

const runId = `ff${Math.random().toString(36).substring(2, 15)}`;

console.log(`Running tests for run ID: ${runId}`);

const integrationTestDir = __dirname;
const functionsDir = join(integrationTestDir, "functions");
const rootDir = join(integrationTestDir, "..");
const firebaseJsonPath = join(integrationTestDir, "firebase.json");

async function execCommand(
  command: string,
  args: string[],
  env: Record<string, string> = {},
  cwd?: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: "inherit",
      env: { ...process.env, ...env },
      cwd: cwd || process.cwd(),
      shell: true,
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    proc.on("error", (error) => {
      reject(error);
    });
  });
}

async function buildAndPackSDK(): Promise<void> {
  console.log("Building root SDK...");
  await execCommand("npm", ["run", "build"], {}, rootDir);
  console.log("Root SDK built successfully");

  console.log("Packing SDK for functions...");
  const tarballPath = join(functionsDir, "firebase-functions-local.tgz");
  // Remove old tarball if it exists
  try {
    await fs.unlink(tarballPath);
  } catch {
    // Ignore if it doesn't exist
  }

  // Pack the SDK
  await execCommand("npm", ["pack", "--pack-destination", functionsDir], {}, rootDir);

  // Rename the tarball
  const files = await fs.readdir(functionsDir);
  const tarballFile = files.find((f) => f.startsWith("firebase-functions-") && f.endsWith(".tgz"));
  if (tarballFile) {
    await fs.rename(join(functionsDir, tarballFile), tarballPath);
    console.log("SDK packed successfully");
  } else {
    throw new Error("Failed to find packed tarball");
  }
}

async function writeFirebaseJson(codebase: string): Promise<void> {
  console.log(`Writing firebase.json with codebase: ${codebase}`);
  const firebaseJson = {
    functions: [
      {
        source: "functions",
        codebase: codebase,
        disallowLegacyRuntimeConfig: true,
        ignore: [
          "node_modules",
          ".git",
          "firebase-debug.log",
          "firebase-debug.*.log",
          "*.local",
          "**/*.test.ts",
        ],
        predeploy: ['npm --prefix "$RESOURCE_DIR" run build'],
      },
    ],
  };

  await fs.writeFile(firebaseJsonPath, JSON.stringify(firebaseJson, null, 2), "utf-8");
  console.log("firebase.json written successfully");
}

async function deployFunctions(runId: string): Promise<void> {
  console.log(`Deploying functions with RUN_ID: ${runId}...`);
  await execCommand(
    "firebase",
    ["deploy", "--only", "functions"],
    { RUN_ID: runId },
    integrationTestDir
  );
  console.log("Functions deployed successfully");
}

async function writeEnvFile(runId: string): Promise<void> {
  console.log(`Writing .env with RUN_ID: ${runId}...`);
  await fs.writeFile(join(functionsDir, ".env"), `RUN_ID=${runId}`, "utf-8");
  console.log(".env.test written successfully");
}

async function runTests(runId: string): Promise<void> {
  console.log(`Running tests with RUN_ID: ${runId}...`);
  await execCommand("vitest", ["run"], { RUN_ID: runId }, integrationTestDir);
  console.log("Tests completed successfully");
}

async function cleanupFunctions(codebase: string): Promise<void> {
  console.log(`Cleaning up functions with RUN_ID: ${runId}...`);
  await execCommand("firebase", ["functions:delete", runId, "--force"], {}, integrationTestDir);
  console.log("Functions cleaned up successfully");
}

async function main(): Promise<void> {
  let success = false;
  try {
    // Step 1: Generate run ID (already done)
    // Step 2: Build and pack the SDK tarball
    await buildAndPackSDK();

    // Step 3: Write firebase.json with codebase
    await writeFirebaseJson(runId);

    await writeEnvFile(runId);

    // Step 4: Deploy functions
    await deployFunctions(runId);

    // Step 5: Wait (deployment already waits)
    // Step 6: Run tests
    await runTests(runId);

    success = true;
  } catch (error) {
    console.error("Error during test execution:", error);
    throw error;
  } finally {
    // Step 7: Clean up codebase on success or error
    await cleanupFunctions(runId);
  }

  if (success) {
    console.log("All tests passed!");
    process.exit(0);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
