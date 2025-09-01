/**
 * Function deployment with rate limiting and retry logic
 */

import { FirebaseClient, ModifiedYaml } from "../utils/types.js";
import { logger } from "../utils/logger.js";
import { deployFunctionsWithRetry } from "../../deployment-utils.js";

/**
 * Deploy modified functions to Firebase
 */
export async function deployModifiedFunctions(
  client: FirebaseClient,
  modifiedYaml: ModifiedYaml,
  testRunId: string
): Promise<void> {
  logger.deployment(`Deploying functions with id: ${testRunId}`);

  try {
    // Get the function names that will be deployed
    const functionNames = modifiedYaml ? Object.keys(modifiedYaml.endpoints) : [];

    logger.deployment(`Functions to deploy: ${functionNames.join(", ")}`);
    logger.deployment(`Total functions to deploy: ${functionNames.length}`);

    // Deploy with rate limiting and retry logic
    await deployFunctionsWithRetry(client, functionNames);

    logger.success("Functions have been deployed successfully.");
    logger.info("You can view your deployed functions in the Firebase Console:");
    logger.info(
      `   https://console.firebase.google.com/project/${process.env.PROJECT_ID}/functions`
    );
  } catch (err) {
    logger.error("Error deploying functions", err as Error);
    throw err;
  }
}
