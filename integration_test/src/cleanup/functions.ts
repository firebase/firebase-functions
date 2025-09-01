/**
 * Deployed functions cleanup functionality
 */

import { FirebaseClient } from "../utils/types.js";
import { logger } from "../utils/logger.js";
import { postCleanup } from "../../deployment-utils.js";

/**
 * Clean up deployed test functions
 */
export async function cleanupDeployedFunctions(
  client: FirebaseClient,
  testRunId: string
): Promise<void> {
  try {
    await postCleanup(client, testRunId);
  } catch (err) {
    logger.error("Error during function cleanup:", err as Error);
    // Don't throw here to ensure files are still cleaned
  }
}
