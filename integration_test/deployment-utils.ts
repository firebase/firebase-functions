import pRetry from "p-retry";
import pLimit from "p-limit";

interface FirebaseClient {
  functions: {
    list: () => Promise<{ name: string }[]>;
    delete(names: string[], options: any): Promise<void>;
  };
  deploy: (options: { only: string; force: boolean }) => Promise<void>;
}

// Configuration constants
const BATCH_SIZE = 3; // Reduced to 3 functions at a time for better rate limiting
const DELAY_BETWEEN_BATCHES = 5000; // Increased from 2 to 5 seconds between batches
const MAX_RETRIES = 3; // Retry failed deployments
const CLEANUP_DELAY = 1000; // 1 second between cleanup operations
// Rate limiter for deployment operations
const deploymentLimiter = pLimit(1); // Only one deployment operation at a time
const cleanupLimiter = pLimit(2); // Allow 2 cleanup operations concurrently

/**
 * Sleep utility function
 */
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Get all deployed functions for the current project
 */
export async function getDeployedFunctions(client: FirebaseClient): Promise<string[]> {
  try {
    const functions = await client.functions.list();
    return functions.map((fn: { name: string }) => fn.name);
  } catch (error) {
    console.log("Could not list functions, assuming none deployed:", error);
    return [];
  }
}

/**
 * Delete a single function with retry logic
 */
async function deleteFunctionWithRetry(
  client: FirebaseClient,
  functionName: string
): Promise<void> {
  return pRetry(
    async () => {
      try {
        await client.functions.delete([functionName], {
          force: true,
          project: process.env.PROJECT_ID,
          config: "./firebase.json",
          debug: true,
          nonInteractive: true,
        });
        console.log(`✅ Deleted function: ${functionName}`);
      } catch (error: unknown) {
        if (
          error &&
          typeof error === "object" &&
          "message" in error &&
          typeof error.message === "string" &&
          error.message.includes("not found")
        ) {
          console.log(`ℹ️ Function not found (already deleted): ${functionName}`);
          return; // Not an error, function was already deleted
        }
        throw error;
      }
    },
    {
      retries: MAX_RETRIES,
      onFailedAttempt: (error) => {
        console.log(
          `❌ Failed to delete ${functionName} (attempt ${error.attemptNumber}/${
            MAX_RETRIES + 1
          }):`,
          error.message
        );
      },
    }
  );
}

/**
 * Pre-cleanup: Remove all existing functions before deployment
 */
export async function preCleanup(client: FirebaseClient): Promise<void> {
  console.log("🧹 Starting pre-cleanup...");

  try {
    const deployedFunctions = await getDeployedFunctions(client);

    if (deployedFunctions.length === 0) {
      console.log("ℹ️ No functions to clean up");
      return;
    }

    console.log(`Found ${deployedFunctions.length} functions to clean up`);

    // Delete functions in batches with rate limiting
    const batches: string[][] = [];
    for (let i = 0; i < deployedFunctions.length; i += BATCH_SIZE) {
      batches.push(deployedFunctions.slice(i, i + BATCH_SIZE));
    }

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`Cleaning up batch ${i + 1}/${batches.length} (${batch.length} functions)`);

      // Delete functions in parallel within the batch
      const deletePromises = batch.map((functionName) =>
        cleanupLimiter(() => deleteFunctionWithRetry(client, functionName))
      );

      await Promise.all(deletePromises);

      // Add delay between batches
      if (i < batches.length - 1) {
        console.log(`Waiting ${CLEANUP_DELAY}ms before next batch...`);
        await sleep(CLEANUP_DELAY);
      }
    }

    console.log("✅ Pre-cleanup completed");
  } catch (error) {
    console.error("❌ Pre-cleanup failed:", error);
    throw error;
  }
}

/**
 * Deploy functions with rate limiting and retry logic
 */
export async function deployFunctionsWithRetry(
  client: any,
  functionsToDeploy: string[]
): Promise<void> {
  console.log(`🚀 Deploying ${functionsToDeploy.length} functions with rate limiting...`);

  // Deploy functions in batches
  const batches = [];
  for (let i = 0; i < functionsToDeploy.length; i += BATCH_SIZE) {
    batches.push(functionsToDeploy.slice(i, i + BATCH_SIZE));
  }

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`Deploying batch ${i + 1}/${batches.length} (${batch.length} functions)`);

    try {
      await pRetry(
        async () => {
          await deploymentLimiter(async () => {
            await client.deploy({
              only: "functions",
              force: true,
            });
          });
        },
        {
          retries: MAX_RETRIES,
          onFailedAttempt: (error: any) => {
            console.log(
              `❌ Deployment failed (attempt ${error.attemptNumber}/${MAX_RETRIES + 1}):`,
              error.message
            );
            // Log detailed error information during retries
            if (error.children && error.children.length > 0) {
              console.log("📋 Detailed deployment errors:");
              error.children.forEach((child: any, index: number) => {
                console.log(`  ${index + 1}. ${child.message || child}`);
                if (child.original) {
                  console.log(
                    `     Original error message: ${child.original.message || "No message"}`
                  );
                  console.log(`     Original error code: ${child.original.code || "No code"}`);
                  console.log(
                    `     Original error status: ${child.original.status || "No status"}`
                  );
                }
              });
            }
            // Log the full error structure for debugging
            console.log("🔍 Error details:");
            console.log(`  - Message: ${error.message}`);
            console.log(`  - Status: ${error.status}`);
            console.log(`  - Exit code: ${error.exit}`);
            console.log(`  - Attempt: ${error.attemptNumber}`);
            console.log(`  - Retries left: ${error.retriesLeft}`);
          },
        }
      );

      console.log(`✅ Batch ${i + 1} deployed successfully`);

      // Add delay between batches
      if (i < batches.length - 1) {
        console.log(`Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
        await sleep(DELAY_BETWEEN_BATCHES);
      }
    } catch (error: any) {
      console.error(`❌ Failed to deploy batch ${i + 1}:`, error);
      // Log detailed error information
      if (error.children && error.children.length > 0) {
        console.log("📋 Detailed deployment errors:");
        error.children.forEach((child: any, index: number) => {
          console.log(`  ${index + 1}. ${child.message || child}`);
          if (child.original) {
            console.log(`     Original error message: ${child.original.message || "No message"}`);
            console.log(`     Original error code: ${child.original.code || "No code"}`);
            console.log(`     Original error status: ${child.original.status || "No status"}`);
          }
        });
      }
      // Log the full error structure for debugging
      console.log("🔍 Error details:");
      console.log(`  - Message: ${error.message}`);
      console.log(`  - Status: ${error.status}`);
      console.log(`  - Exit code: ${error.exit}`);
      console.log(`  - Attempt: ${error.attemptNumber}`);
      console.log(`  - Retries left: ${error.retriesLeft}`);
      throw error;
    }
  }

  console.log("✅ All functions deployed successfully");
}

/**
 * Post-cleanup: Remove deployed functions after tests
 */
export async function postCleanup(client: any, testRunId: string): Promise<void> {
  console.log("🧹 Starting post-cleanup...");

  try {
    const deployedFunctions = await getDeployedFunctions(client);
    const testFunctions = deployedFunctions.filter((name) => name && name.includes(testRunId));

    if (testFunctions.length === 0) {
      console.log("ℹ️ No test functions to clean up");
      return;
    }

    console.log(`Found ${testFunctions.length} test functions to clean up`);

    // Delete test functions in batches with rate limiting
    const batches = [];
    for (let i = 0; i < testFunctions.length; i += BATCH_SIZE) {
      batches.push(testFunctions.slice(i, i + BATCH_SIZE));
    }

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`Cleaning up batch ${i + 1}/${batches.length} (${batch.length} functions)`);

      // Delete functions in parallel within the batch
      const deletePromises = batch.map((functionName) =>
        cleanupLimiter(() => deleteFunctionWithRetry(client, functionName))
      );

      await Promise.all(deletePromises);

      // Add delay between batches
      if (i < batches.length - 1) {
        console.log(`Waiting ${CLEANUP_DELAY}ms before next batch...`);
        await sleep(CLEANUP_DELAY);
      }
    }

    console.log("✅ Post-cleanup completed");
  } catch (error) {
    console.error("❌ Post-cleanup failed:", error);
    throw error;
  }
}
