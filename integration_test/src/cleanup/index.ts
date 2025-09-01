/**
 * Cleanup module orchestration
 */

import { FirebaseClient } from "../utils/types.js";
import { logger } from "../utils/logger.js";
import { cleanFiles } from "./files.js";
import { cleanupDeployedFunctions } from "./functions.js";

/**
 * Handle all cleanup operations
 */
export async function handleCleanUp(client: FirebaseClient, testRunId: string): Promise<void> {
  logger.cleanup("Starting cleanup...");

  // Clean up deployed functions first
  await cleanupDeployedFunctions(client, testRunId);

  // Then clean up local files
  cleanFiles(testRunId);

  logger.success("Cleanup completed");
}

/**
 * Graceful shutdown handler
 */
export async function gracefulShutdown(cleanupFn: () => Promise<void>): Promise<void> {
  logger.info("SIGINT received, initiating graceful shutdown...");
  await cleanupFn();
  process.exit(1);
}

export { cleanFiles } from "./files.js";
export { cleanupDeployedFunctions } from "./functions.js";
