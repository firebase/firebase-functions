import * as dotenv from "dotenv";
import client from "firebase-tools";
import setup from "../setup.js";
import {
  validateEnvironment,
  loadConfig,
  createFirebaseConfig,
  createEnvironmentConfig,
} from "./config";
import { logInfo, logError } from "./logger";
import { handleCleanUp, gracefulShutdown } from "./cleanup";
import { discoverAndModifyEndpoints, deployModifiedFunctions } from "./deployment.js";
import { runTests } from "./process";

export async function runIntegrationTests(): Promise<void> {
  // Load environment variables
  dotenv.config();

  // Validate environment
  validateEnvironment();

  // Load configuration
  const config = loadConfig();

  // Setup SDK and functions
  setup(config.runtime, config.testRunId, config.nodeVersion, config.firebaseAdmin);

  // Create Firebase and environment configs
  const firebaseConfig = createFirebaseConfig(config);
  const env = createEnvironmentConfig(config);

  logInfo("Firebase config created: ");
  logInfo(JSON.stringify(firebaseConfig, null, 2));

  // Set up graceful shutdown
  const cleanupFn = () => handleCleanUp(client, config.testRunId);
  process.on("SIGINT", () => gracefulShutdown(cleanupFn));

  try {
    // Skip pre-cleanup for now to test if the main flow works
    logInfo("⏭️ Skipping pre-cleanup for testing...");

    const { killServer, modifiedYaml } = await discoverAndModifyEndpoints(
      config,
      firebaseConfig,
      env
    );
    await deployModifiedFunctions(client, modifiedYaml, config.testRunId);
    killServer();
    await runTests(config.testRunId);
  } catch (err) {
    logError("Error occurred during integration tests:", err as Error);
    // Re-throw the original error instead of wrapping it
    throw err;
  } finally {
    await cleanupFn();
  }
}

// Export the main function for use in run.ts
export { runIntegrationTests as default };
