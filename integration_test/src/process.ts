import { spawn } from "child_process";
import { logError, logDebug } from "./logger.js";

export const spawnAsync = (command: string, args: string[], options: any): Promise<string> => {
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

    // Add timeout to prevent hanging
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error(`Command timed out after 5 minutes: ${command} ${args.join(" ")}`));
    }, 5 * 60 * 1000); // 5 minutes

    child.on("close", () => {
      clearTimeout(timeout);
    });
  });
};

export async function runTests(testRunId: string): Promise<void> {
  const humanReadableRuntime = process.env.TEST_RUNTIME === "node" ? "Node.js" : "Python";
  try {
    console.log(`Starting ${humanReadableRuntime} Tests...`);
    logDebug("About to run: npm test");

    const output = await spawnAsync("npm", ["test"], {
      env: {
        ...process.env,
        TEST_RUN_ID: testRunId,
      },
    });

    console.log("📋 Test output received:");
    console.log(output);
    console.log(`${humanReadableRuntime} Tests Completed.`);
  } catch (error) {
    logError("❌ Error during testing:", error as Error);
    throw error;
  }
}
