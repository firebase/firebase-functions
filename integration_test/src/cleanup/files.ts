/**
 * File system cleanup functionality
 */

import fs from "fs";
import { logger } from "../utils/logger.js";

/**
 * Clean up generated files and directories
 */
export function cleanFiles(testRunId: string): void {
  logger.cleanup("Cleaning files...");
  const functionsDir = "functions";

  process.chdir(functionsDir); // go to functions

  try {
    const files = fs.readdirSync(".");
    const deletedFiles: string[] = [];

    files.forEach((file) => {
      // For Node.js
      if (file.match(`firebase-functions-${testRunId}.tgz`)) {
        fs.rmSync(file);
        deletedFiles.push(file);
      }
      // For Python
      if (file.match("firebase_functions.tar.gz")) {
        fs.rmSync(file);
        deletedFiles.push(file);
      }
      if (file.match("package.json")) {
        fs.rmSync(file);
        deletedFiles.push(file);
      }
      if (file.match("requirements.txt")) {
        fs.rmSync(file);
        deletedFiles.push(file);
      }
      if (file.match("firebase-debug.log")) {
        fs.rmSync(file);
        deletedFiles.push(file);
      }
      if (file.match("functions.yaml")) {
        fs.rmSync(file);
        deletedFiles.push(file);
      }
    });

    // Check and delete directories
    if (fs.existsSync("lib")) {
      fs.rmSync("lib", { recursive: true, force: true });
      deletedFiles.push("lib/ (directory)");
    }
    if (fs.existsSync("venv")) {
      fs.rmSync("venv", { recursive: true, force: true });
      deletedFiles.push("venv/ (directory)");
    }

    if (deletedFiles.length > 0) {
      logger.cleanup(`Deleted ${deletedFiles.length} files/directories:`);
      deletedFiles.forEach((file, index) => {
        logger.debug(`  ${index + 1}. ${file}`);
      });
    } else {
      logger.info("No files to clean up");
    }
  } catch (error) {
    logger.error("Error occurred while cleaning files:", error as Error);
  }

  process.chdir("../"); // go back to integration_test
}
