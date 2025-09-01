/**
 * Main orchestrator for integration tests
 */

import * as dotenv from "dotenv";
import client from "firebase-tools";
import { FirebaseClient } from "./utils/types.js";
import { logger } from "./utils/logger.js";
import {
  loadTestConfig,
  createFirebaseConfig,
  createFirebaseProjectConfig,
  createEnvironmentConfig,
} from "./config/index.js";
import { setup } from "./setup/index.js";
import { discoverAndModifyEndpoints, deployModifiedFunctions } from "./deployment/index.js";
import { runTests } from "./testing/index.js";
import { handleCleanUp, gracefulShutdown } from "./cleanup/index.js";

/**
 * Main function to run integration tests
 */
export async function runIntegrationTests(): Promise<void> {
  // Load environment variables
  dotenv.config();

  // Load and validate configuration
  const config = loadTestConfig();

  logger.info("Starting integration tests");
  logger.info(`Test Run ID: ${config.testRunId}`);
  logger.info(`Runtime: ${config.runtime}`);
  logger.info(`Project ID: ${config.projectId}`);

  // Setup SDK and functions
  setup(config.runtime, config.testRunId, config.nodeVersion, config.firebaseAdmin);

  // Create Firebase configurations
  const firebaseConfig = createFirebaseConfig(config);
  const firebaseProjectConfig = createFirebaseProjectConfig(config);
  const environmentConfig = createEnvironmentConfig(config, firebaseConfig);

  // Configure Firebase client
  logger.info("Configuring Firebase client with project ID:", config.projectId);
  const firebaseClient = client as FirebaseClient;

  logger.debug("Firebase config created:");
  logger.debug(JSON.stringify(firebaseProjectConfig, null, 2));

  // Set up graceful shutdown handler
  const cleanupFn = () => handleCleanUp(firebaseClient, config.testRunId);
  process.on("SIGINT", () => gracefulShutdown(cleanupFn));

  try {
    // Skip pre-cleanup for now to test if the main flow works
    logger.info("Skipping pre-cleanup for testing...");

    // Discover and modify endpoints
    const { killServer, modifiedYaml } = await discoverAndModifyEndpoints(
      firebaseProjectConfig,
      environmentConfig,
      config.testRunId
    );

    // Deploy functions
    await deployModifiedFunctions(firebaseClient, modifiedYaml, config.testRunId);

    // Kill the admin server
    killServer();

    // Run tests
    const testResult = await runTests(config.testRunId, config.runtime);

    if (!testResult.passed) {
      throw new Error("Some tests failed");
    }
  } catch (err) {
    logger.error("Error occurred during integration tests:", err as Error);
    throw err;
  } finally {
    await cleanupFn();
  }
}

// Export for use in run.ts
export default runIntegrationTests;
