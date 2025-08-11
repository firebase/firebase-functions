import fs from "fs";
import { logError, logCleanup } from "./logger.js";

export function cleanFiles(testRunId: string): void {
  logCleanup("Cleaning files...");
  const functionsDir = "functions";
  process.chdir(functionsDir); // go to functions
  try {
    const files = fs.readdirSync(".");
    files.forEach((file) => {
      // For Node
      if (file.match(`firebase-functions-${testRunId}.tgz`)) {
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
    logError("Error occurred while cleaning files:", error as Error);
  }

  process.chdir("../"); // go back to integration_test
}

export async function handleCleanUp(client: any, testRunId: string): Promise<void> {
  logCleanup("Cleaning up...");
  try {
    // Import postCleanup from deployment-utils
    const { postCleanup } = await import("../deployment-utils.js");
    await postCleanup(client, testRunId);
  } catch (err) {
    logError("Error during post-cleanup:", err as Error);
    // Don't throw here to ensure files are still cleaned
  }
  cleanFiles(testRunId);
}

export function gracefulShutdown(cleanupFn: () => Promise<void>): void {
  console.log("SIGINT received...");
  cleanupFn()
    .then(() => {
      process.exit(1);
    })
    .catch((error) => {
      logError("Error during graceful shutdown:", error);
      process.exit(1);
    });
}
