import pRetry from "p-retry";
import pLimit from "p-limit";

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
    console.log("🔍 Attempting to list functions...");
    console.log("   Project ID:", process.env.PROJECT_ID);
    console.log("   Working directory:", process.cwd());
    console.log("   Config file:", "./firebase.json");
    
    // Check if PROJECT_ID is set
    if (!process.env.PROJECT_ID) {
      console.log("   ❌ PROJECT_ID environment variable is not set");
      return [];
    }
    
    // Try to list functions with explicit project ID
    const functions = await client.functions.list({
      project: process.env.PROJECT_ID,
      config: "./firebase.json",
      nonInteractive: true,
      cwd: process.cwd(),
    });
    
    console.log("✅ Successfully listed functions:", functions.length);
    return functions.map((fn: { name: string }) => fn.name);
  } catch (error) {
    console.log("Could not list functions, assuming none deployed:", error);
    
    // Provide more detailed error information
    if (error && typeof error === 'object' && 'message' in error) {
      const errorMessage = String(error.message);
      console.log("   Error message:", errorMessage);
      if ('status' in error) console.log("   Error status:", error.status);
      if ('exit' in error) console.log("   Error exit code:", error.exit);
      
      // Check if it's an authentication error
      if (errorMessage.includes("not logged in") || errorMessage.includes("authentication")) {
        console.log("   💡 This might be an authentication issue. Try running 'firebase login' first.");
      }
      
      // Check if it's a project access error
      if (errorMessage.includes("not found") || errorMessage.includes("access")) {
        console.log("   💡 This might be a project access issue. Check if the project ID is correct and you have access to it.");
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
  console.log(`📋 Functions to deploy:`, functionsToDeploy);
  console.log(`🔧 Project ID: ${process.env.PROJECT_ID}`);
  console.log(`🔧 Region: ${process.env.REGION || 'us-central1'}`);
  console.log(`🔧 Runtime: ${process.env.TEST_RUNTIME}`);
  
  // Pre-deployment checks
  console.log(`\n🔍 Pre-deployment checks:`);
  console.log(`   - Project ID set: ${!!process.env.PROJECT_ID}`);
  console.log(`   - Working directory: ${process.cwd()}`);
  
  // Import fs dynamically for ES modules
  const fs = await import('fs');
  
  console.log(`   - Functions directory exists: ${fs.existsSync('./functions')}`);
  console.log(`   - Functions.yaml exists: ${fs.existsSync('./functions/functions.yaml')}`);
  console.log(`   - Package.json exists: ${fs.existsSync('./functions/package.json')}`);
  
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
    console.log(`   - Functions.yaml content preview:`);
    console.log(`     ${functionsYaml.substring(0, 200)}...`);
  } catch (error: any) {
    console.log(`   - Error reading functions.yaml: ${error.message}`);
  }
  
  // Set up Firebase project configuration
  console.log(`   - Setting up Firebase project configuration...`);
  process.env.FIREBASE_PROJECT = process.env.PROJECT_ID;
  process.env.GCLOUD_PROJECT = process.env.PROJECT_ID;
  console.log(`   - FIREBASE_PROJECT: ${process.env.FIREBASE_PROJECT}`);
  console.log(`   - GCLOUD_PROJECT: ${process.env.GCLOUD_PROJECT}`);

  // Deploy functions in batches
  const batches = [];
  for (let i = 0; i < functionsToDeploy.length; i += BATCH_SIZE) {
    batches.push(functionsToDeploy.slice(i, i + BATCH_SIZE));
  }

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`\n📦 Deploying batch ${i + 1}/${batches.length} (${batch.length} functions)`);
    console.log(`📋 Batch functions:`, batch);

    try {
      await pRetry(
        async () => {
          await deploymentLimiter(async () => {
            console.log(`\n🔧 Starting deployment attempt...`);
            console.log(`🔧 Project ID: ${process.env.PROJECT_ID}`);
            console.log(`🔧 Working directory: ${process.cwd()}`);
            console.log(`🔧 Functions source: ${process.cwd()}/functions`);
            
            const deployOptions = {
              only: "functions",
              force: true,
              project: process.env.PROJECT_ID,
              debug: true,
              nonInteractive: true,
              cwd: process.cwd(),
            };
            

            
            console.log(`🔧 Deploy options:`, JSON.stringify(deployOptions, null, 2));
            
            try {
              await client.deploy(deployOptions);
              console.log(`✅ Deployment command completed successfully`);
            } catch (deployError: any) {
              console.log(`❌ Deployment command failed with error:`);
              console.log(`   Error type: ${deployError.constructor.name}`);
              console.log(`   Error message: ${deployError.message}`);
              console.log(`   Error stack: ${deployError.stack}`);
              
              // Log all properties of the error object
              console.log(`   Error properties:`);
              Object.keys(deployError).forEach(key => {
                try {
                  const value = deployError[key];
                  if (typeof value === 'object' && value !== null) {
                    console.log(`     ${key}: ${JSON.stringify(value, null, 4)}`);
                  } else {
                    console.log(`     ${key}: ${value}`);
                  }
                } catch (e) {
                  console.log(`     ${key}: [Error serializing property]`);
                }
              });
              
              throw deployError;
            }
          });
        },
        {
          retries: MAX_RETRIES,
          onFailedAttempt: (error: any) => {
            console.log(`\n❌ Deployment failed (attempt ${error.attemptNumber}/${MAX_RETRIES + 1}):`);
            console.log(`   Error message: ${error.message}`);
            console.log(`   Error type: ${error.constructor.name}`);
            
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
            console.log("🔍 Full error details:");
            console.log(`  - Message: ${error.message}`);
            console.log(`  - Status: ${error.status}`);
            console.log(`  - Exit code: ${error.exit}`);
            console.log(`  - Attempt: ${error.attemptNumber}`);
            console.log(`  - Retries left: ${error.retriesLeft}`);
            
            // Log error context if available
            if (error.context) {
              console.log(`  - Context: ${JSON.stringify(error.context, null, 2)}`);
            }
            
            // Log error body if available
            if (error.body) {
              console.log(`  - Body: ${JSON.stringify(error.body, null, 2)}`);
            }
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
      console.error(`\n❌ FINAL FAILURE: Failed to deploy batch ${i + 1} after all retries`);
      console.error(`   Error type: ${error.constructor.name}`);
      console.error(`   Error message: ${error.message}`);
      console.error(`   Error stack: ${error.stack}`);
      
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
      console.log("🔍 Final error details:");
      console.log(`  - Message: ${error.message}`);
      console.log(`  - Status: ${error.status}`);
      console.log(`  - Exit code: ${error.exit}`);
      console.log(`  - Attempt: ${error.attemptNumber}`);
      console.log(`  - Retries left: ${error.retriesLeft}`);
      
      // Log error context if available
      if (error.context) {
        console.log(`  - Context: ${JSON.stringify(error.context, null, 2)}`);
      }
      
      // Log error body if available
      if (error.body) {
        console.log(`  - Body: ${JSON.stringify(error.body, null, 2)}`);
      }
      
      // Log all error properties
      console.log(`  - All error properties:`);
      Object.keys(error).forEach(key => {
        try {
          const value = error[key];
          if (typeof value === 'object' && value !== null) {
            console.log(`     ${key}: ${JSON.stringify(value, null, 4)}`);
          } else {
            console.log(`     ${key}: ${value}`);
          }
        } catch (e) {
          console.log(`     ${key}: [Error serializing property]`);
        }
      });
      
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
    // print the deployed functions
    console.log("🔍 Deployed functions:", deployedFunctions);
    const testFunctions = deployedFunctions.filter((name) => name && name.includes(testRunId));

    if (testFunctions.length === 0) {
      console.log("ℹ️ No test functions to clean up");
      return;
    }

    console.log(`Found ${testFunctions.length} test functions to clean up:`);
    testFunctions.forEach((funcName, index) => {
      console.log(`  ${index + 1}. ${funcName}`);
    });

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
        cleanupLimiter(async () => {
          console.log(`🗑️ Deleting function: ${functionName}`);
          await deleteFunctionWithRetry(client, functionName);
          console.log(`✅ Successfully deleted: ${functionName}`);
        })
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
