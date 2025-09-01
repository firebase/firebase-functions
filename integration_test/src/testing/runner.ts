/**
 * Test execution functionality
 */

import { spawn } from "child_process";
import { TestResult } from "../utils/types.js";
import { logger } from "../utils/logger.js";

/**
 * Spawn a command asynchronously with timeout support
 */
export function spawnAsync(command: string, args: string[], options: any): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);

    let output = "";
    let errorOutput = "";

    if (child.stdout) {
      child.stdout.on("data", (data) => {
        output += data.toString();
      });
    }

    if (child.stderr) {
      child.stderr.on("data", (data) => {
        errorOutput += data.toString();
      });
    }

    child.on("error", reject);

    child.on("close", (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        const errorMessage = `Command failed with exit code ${code}`;
        const fullError = errorOutput ? `${errorMessage}\n\nSTDERR:\n${errorOutput}` : errorMessage;
        reject(new Error(fullError));
      }
    });

    // Add timeout to prevent hanging (5 minutes)
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error(`Command timed out after 5 minutes: ${command} ${args.join(" ")}`));
    }, 5 * 60 * 1000);

    child.on("close", () => {
      clearTimeout(timeout);
    });
  });
}

/**
 * Run integration tests using Jest
 */
export async function runTests(testRunId: string, runtime: string): Promise<TestResult> {
  const humanReadableRuntime = runtime === "node" ? "Node.js" : "Python";

  try {
    logger.info(`Starting ${humanReadableRuntime} Tests...`);
    logger.info("Running all integration tests");

    // Run all tests with Jest
    const output = await spawnAsync("npx", ["jest", "--verbose"], {
      env: {
        ...process.env,
        TEST_RUN_ID: testRunId,
      },
    });

    logger.info("Test output received:");
    logger.debug(output);

    // Check if tests passed
    const passed = output.includes("PASS") && !output.includes("FAIL");

    if (passed) {
      logger.success("All tests completed successfully!");
      logger.success("All function triggers are working correctly.");
    } else {
      logger.warning("Some tests may have failed. Check the output above.");
    }

    logger.info(`${humanReadableRuntime} Tests Completed.`);

    return {
      passed,
      output,
    };
  } catch (error) {
    logger.error("Error during testing:", error as Error);
    return {
      passed: false,
      output: "",
      error: error as Error,
    };
  }
}
