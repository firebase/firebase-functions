import pRetry from "p-retry";
import pLimit from "p-limit";
import { logger } from "./src/logger.js";

interface FirebaseClient {
  functions: {
    list: (options?: any) => Promise<{ name: string }[]>;
    delete(names: string[], options: any): Promise<void>;
  };
  deploy: (options: any) => Promise<void>;
}

// Configuration constants
const BATCH_SIZE = 3; // Reduced to 3 functions at a time for better rate limiting
const DELAY_BETWEEN_BATCHES = 5000; // Increased from 2 to 5 seconds between batches
const MAX_RETRIES = 1; // Retry failed deployments
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
    logger.debug("Attempting to list functions...");
    logger.debug("Project ID:", process.env.PROJECT_ID);
    logger.debug("Working directory:", process.cwd());
    logger.debug("Config file:", "./firebase.json");
    
    // Check if PROJECT_ID is set
    if (!process.env.PROJECT_ID) {
      logger.error("PROJECT_ID environment variable is not set");
      return [];
    }
    
    // Try to list functions with explicit project ID
    const functions = await client.functions.list({
      project: process.env.PROJECT_ID,
      config: "./firebase.json",
      nonInteractive: true,
      cwd: process.cwd(),
    });
    
    logger.success(`Successfully listed functions: ${functions.length}`);
    return functions.map((fn: { name: string }) => fn.name);
  } catch (error) {
    logger.warning("Could not list functions, assuming none deployed:", error);
    
    // Provide more detailed error information
    if (error && typeof error === 'object' && 'message' in error) {
      const errorMessage = String(error.message);
      logger.debug("   Error message:", errorMessage);
      if ('status' in error) logger.debug("   Error status:", error.status);
      if ('exit' in error) logger.debug("   Error exit code:", error.exit);
      
      // Check if it's an authentication error
      if (errorMessage.includes("not logged in") || errorMessage.includes("authentication")) {
        logger.warning("This might be an authentication issue. Try running 'firebase login' first.");
      }
      
      // Check if it's a project access error
      if (errorMessage.includes("not found") || errorMessage.includes("access")) {
        logger.warning("This might be a project access issue. Check if the project ID is correct and you have access to it.");
      }
    }
    
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
          cwd: process.cwd(),
        });
        logger.success(`Deleted function: ${functionName}`);
      } catch (error: unknown) {
        if (
          error &&
          typeof error === "object" &&
          "message" in error &&
          typeof error.message === "string" &&
          error.message.includes("not found")
        ) {
          logger.info(`Function not found (already deleted): ${functionName}`);
          return; // Not an error, function was already deleted
        }
        throw error;
      }
    },
    {
      retries: MAX_RETRIES,
      onFailedAttempt: (error) => {
        logger.error(
          `Failed to delete ${functionName} (attempt ${error.attemptNumber}/${
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
  logger.cleanup("Starting pre-cleanup...");

  try {
    const deployedFunctions = await getDeployedFunctions(client);

    if (deployedFunctions.length === 0) {
      logger.info("No functions to clean up");
      return;
    }

    logger.info(`Found ${deployedFunctions.length} functions to clean up`);

    // Delete functions in batches with rate limiting
    const batches: string[][] = [];
    for (let i = 0; i < deployedFunctions.length; i += BATCH_SIZE) {
      batches.push(deployedFunctions.slice(i, i + BATCH_SIZE));
    }

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      logger.cleanup(`Cleaning up batch ${i + 1}/${batches.length} (${batch.length} functions)`);

      // Delete functions in parallel within the batch
      const deletePromises = batch.map((functionName) =>
        cleanupLimiter(() => deleteFunctionWithRetry(client, functionName))
      );

      await Promise.all(deletePromises);

      // Add delay between batches
      if (i < batches.length - 1) {
        logger.debug(`Waiting ${CLEANUP_DELAY}ms before next batch...`);
        await sleep(CLEANUP_DELAY);
      }
    }

    logger.success("Pre-cleanup completed");
  } catch (error) {
    logger.error("Pre-cleanup failed:", error);
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
  logger.deployment(`Deploying ${functionsToDeploy.length} functions with rate limiting...`);
  logger.deployment(`Functions to deploy:`, functionsToDeploy);
  logger.deployment(`Project ID: ${process.env.PROJECT_ID}`);
  logger.deployment(`Region: ${process.env.REGION || 'us-central1'}`);
  logger.deployment(`Runtime: ${process.env.TEST_RUNTIME}`);
  
  // Pre-deployment checks
  logger.group("Pre-deployment checks");
  logger.debug(`- Project ID set: ${!!process.env.PROJECT_ID}`);
  logger.debug(`- Working directory: ${process.cwd()}`);
  
  // Import fs dynamically for ES modules
  const fs = await import('fs');
  
  logger.debug(`- Functions directory exists: ${fs.existsSync('./functions')}`);
  logger.debug(`- Functions.yaml exists: ${fs.existsSync('./functions/functions.yaml')}`);
  logger.debug(`- Package.json exists: ${fs.existsSync('./functions/package.json')}`);
  
  if (!process.env.PROJECT_ID) {
    throw new Error("PROJECT_ID environment variable is not set");
  }
  
  if (!fs.existsSync('./functions')) {
    throw new Error("Functions directory does not exist");
  }
  
  if (!fs.existsSync('./functions/functions.yaml')) {
    throw new Error("functions.yaml file does not exist in functions directory");
  }
  
  // Check functions.yaml content
  try {
    const functionsYaml = fs.readFileSync('./functions/functions.yaml', 'utf8');
    logger.debug(`   - Functions.yaml content preview:`);
    logger.debug(`     ${functionsYaml.substring(0, 200)}...`);
  } catch (error: any) {
    logger.warning(`   - Error reading functions.yaml: ${error.message}`);
  }
  
  // Set up Firebase project configuration
  logger.debug(`   - Setting up Firebase project configuration...`);
  process.env.FIREBASE_PROJECT = process.env.PROJECT_ID;
  process.env.GCLOUD_PROJECT = process.env.PROJECT_ID;
  logger.debug(`   - FIREBASE_PROJECT: ${process.env.FIREBASE_PROJECT}`);
  logger.debug(`   - GCLOUD_PROJECT: ${process.env.GCLOUD_PROJECT}`);

  // Deploy functions in batches
  const batches = [];
  for (let i = 0; i < functionsToDeploy.length; i += BATCH_SIZE) {
    batches.push(functionsToDeploy.slice(i, i + BATCH_SIZE));
  }

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    logger.deployment(`Deploying batch ${i + 1}/${batches.length} (${batch.length} functions)`);
    logger.deployment(`Batch functions:`, batch);

    try {
      await pRetry(
        async () => {
          await deploymentLimiter(async () => {
            logger.deployment(`Starting deployment attempt...`);
            logger.deployment(`Project ID: ${process.env.PROJECT_ID}`);
            logger.deployment(`Working directory: ${process.cwd()}`);
            logger.deployment(`Functions source: ${process.cwd()}/functions`);
            
            const deployOptions = {
              only: "functions",
              force: true,
              project: process.env.PROJECT_ID,
              debug: true,
              nonInteractive: true,
              cwd: process.cwd(),
            };
            
            logger.debug(`Deploy options:`, JSON.stringify(deployOptions, null, 2));
            
            try {
              await client.deploy(deployOptions);
              logger.success(`Deployment command completed successfully`);
            } catch (deployError: any) {
              logger.error(`Deployment command failed with error:`);
              logger.error(`   Error type: ${deployError.constructor.name}`);
              logger.error(`   Error message: ${deployError.message}`);
              logger.error(`   Error stack: ${deployError.stack}`);
              
              // Log all properties of the error object
              logger.debug(`   Error properties:`);
              Object.keys(deployError).forEach(key => {
                try {
                  const value = deployError[key];
                  if (typeof value === 'object' && value !== null) {
                    logger.debug(`     ${key}: ${JSON.stringify(value, null, 4)}`);
                  } else {
                    logger.debug(`     ${key}: ${value}`);
                  }
                } catch (e) {
                  logger.debug(`     ${key}: [Error serializing property]`);
                }
              });
              
              throw deployError;
            }
          });
        },
        {
          retries: MAX_RETRIES,
          onFailedAttempt: (error: any) => {
            logger.error(`Deployment failed (attempt ${error.attemptNumber}/${MAX_RETRIES + 1}):`);
            logger.error(`   Error message: ${error.message}`);
            logger.error(`   Error type: ${error.constructor.name}`);
            
            // Log detailed error information during retries
            if (error.children && error.children.length > 0) {
              logger.debug("Detailed deployment errors:");
              error.children.forEach((child: any, index: number) => {
                logger.debug(`  ${index + 1}. ${child.message || child}`);
                if (child.original) {
                  logger.debug(
                    `     Original error message: ${child.original.message || "No message"}`
                  );
                  logger.debug(`     Original error code: ${child.original.code || "No code"}`);
                  logger.debug(
                    `     Original error status: ${child.original.status || "No status"}`
                  );
                }
              });
            }
            
            // Log the full error structure for debugging
            logger.debug("Full error details:");
            logger.debug(`  - Message: ${error.message}`);
            logger.debug(`  - Status: ${error.status}`);
            logger.debug(`  - Exit code: ${error.exit}`);
            logger.debug(`  - Attempt: ${error.attemptNumber}`);
            logger.debug(`  - Retries left: ${error.retriesLeft}`);
            
            // Log error context if available
            if (error.context) {
              logger.debug(`  - Context: ${JSON.stringify(error.context, null, 2)}`);
            }
            
            // Log error body if available
            if (error.body) {
              logger.debug(`  - Body: ${JSON.stringify(error.body, null, 2)}`);
            }
          },
        }
      );

      logger.success(`Batch ${i + 1} deployed successfully`);

      // Add delay between batches
      if (i < batches.length - 1) {
        logger.debug(`Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
        await sleep(DELAY_BETWEEN_BATCHES);
      }
    } catch (error: any) {
      logger.error(`FINAL FAILURE: Failed to deploy batch ${i + 1} after all retries`);
      logger.error(`   Error type: ${error.constructor.name}`);
      logger.error(`   Error message: ${error.message}`);
      logger.error(`   Error stack: ${error.stack}`);
      
      // Log detailed error information
      if (error.children && error.children.length > 0) {
        logger.debug("Detailed deployment errors:");
        error.children.forEach((child: any, index: number) => {
          logger.debug(`  ${index + 1}. ${child.message || child}`);
          if (child.original) {
            logger.debug(`     Original error message: ${child.original.message || "No message"}`);
            logger.debug(`     Original error code: ${child.original.code || "No code"}`);
            logger.debug(`     Original error status: ${child.original.status || "No status"}`);
          }
        });
      }
      
      // Log the full error structure for debugging
      logger.debug("Final error details:");
      logger.debug(`  - Message: ${error.message}`);
      logger.debug(`  - Status: ${error.status}`);
      logger.debug(`  - Exit code: ${error.exit}`);
      logger.debug(`  - Attempt: ${error.attemptNumber}`);
      logger.debug(`  - Retries left: ${error.retriesLeft}`);
      
      // Log error context if available
      if (error.context) {
        logger.debug(`  - Context: ${JSON.stringify(error.context, null, 2)}`);
      }
      
      // Log error body if available
      if (error.body) {
        logger.debug(`  - Body: ${JSON.stringify(error.body, null, 2)}`);
      }
      
      // Log all error properties
      logger.debug(`  - All error properties:`);
      Object.keys(error).forEach(key => {
        try {
          const value = error[key];
          if (typeof value === 'object' && value !== null) {
            logger.debug(`     ${key}: ${JSON.stringify(value, null, 4)}`);
          } else {
            logger.debug(`     ${key}: ${value}`);
          }
        } catch (e) {
          logger.debug(`     ${key}: [Error serializing property]`);
        }
      });
      
      throw error;
    }
  }

  logger.success("All functions deployed successfully");
  logger.groupEnd();
}

/**
 * Post-cleanup: Remove deployed functions after tests
 */
export async function postCleanup(client: any, testRunId: string): Promise<void> {
  logger.cleanup("Starting post-cleanup...");

  try {
    const deployedFunctions = await getDeployedFunctions(client);
    // print the deployed functions
    logger.debug("Deployed functions:", deployedFunctions);
    const testFunctions = deployedFunctions.filter((name) => name && name.includes(testRunId));

    if (testFunctions.length === 0) {
      logger.info("No test functions to clean up");
      return;
    }

    logger.info(`Found ${testFunctions.length} test functions to clean up:`);
    testFunctions.forEach((funcName, index) => {
      logger.debug(`  ${index + 1}. ${funcName}`);
    });

    // Delete test functions in batches with rate limiting
    const batches = [];
    for (let i = 0; i < testFunctions.length; i += BATCH_SIZE) {
      batches.push(testFunctions.slice(i, i + BATCH_SIZE));
    }

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      logger.cleanup(`Cleaning up batch ${i + 1}/${batches.length} (${batch.length} functions)`);

      // Delete functions in parallel within the batch
      const deletePromises = batch.map((functionName) =>
        cleanupLimiter(async () => {
          logger.cleanup(`Deleting function: ${functionName}`);
          await deleteFunctionWithRetry(client, functionName);
          logger.success(`Successfully deleted: ${functionName}`);
        })
      );

      await Promise.all(deletePromises);

      // Add delay between batches
      if (i < batches.length - 1) {
        logger.debug(`Waiting ${CLEANUP_DELAY}ms before next batch...`);
        await sleep(CLEANUP_DELAY);
      }
    }

    logger.success("Post-cleanup completed");
  } catch (error) {
    logger.error("Post-cleanup failed:", error);
    throw error;
  }
}
