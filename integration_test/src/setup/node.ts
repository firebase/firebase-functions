/**
 * Node.js specific setup functions
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { logger } from "../utils/logger.js";

/**
 * Build Node.js SDK package
 */
export function buildNodeSdk(testRunId: string): void {
  logger.info("Building Node.js SDK...");
  const currentDir = process.cwd();

  process.chdir(path.join(currentDir, "..")); // go up to root

  // Remove existing firebase-functions-*.tgz files
  const files = fs.readdirSync(".");
  files.forEach((file) => {
    if (file.match(/^firebase-functions-.*\.tgz$/)) {
      fs.rmSync(file);
    }
  });

  // Build the package
  execSync("npm run build:pack", { stdio: "inherit" });

  // Move the generated tarball package to functions
  const generatedFile = fs
    .readdirSync(".")
    .find((file) => file.match(/^firebase-functions-.*\.tgz$/));

  if (generatedFile) {
    const targetPath = path.join(
      "integration_test",
      "functions",
      `firebase-functions-${testRunId}.tgz`
    );
    fs.renameSync(generatedFile, targetPath);
    logger.success(`SDK moved to ${targetPath}`);
  }

  process.chdir(currentDir); // go back to integration_test
}

/**
 * Create package.json from template
 */
export function createPackageJson(
  testRunId: string,
  nodeVersion: string,
  firebaseAdmin: string
): void {
  logger.info("Creating package.json...");
  const currentDir = process.cwd();
  const packageJsonTemplatePath = `${currentDir}/package.json.template`;
  const packageJsonPath = `${currentDir}/functions/package.json`;

  fs.copyFileSync(packageJsonTemplatePath, packageJsonPath);

  let packageJsonContent = fs.readFileSync(packageJsonPath, "utf8");
  packageJsonContent = packageJsonContent.replace(
    /__SDK_TARBALL__/g,
    `firebase-functions-${testRunId}.tgz`
  );
  packageJsonContent = packageJsonContent.replace(/__NODE_VERSION__/g, nodeVersion);
  packageJsonContent = packageJsonContent.replace(/__FIREBASE_ADMIN__/g, firebaseAdmin);

  fs.writeFileSync(packageJsonPath, packageJsonContent);
}

/**
 * Install Node.js dependencies
 */
export function installNodeDependencies(): void {
  logger.info("Installing Node.js dependencies...");
  const functionsDir = "functions";

  process.chdir(functionsDir); // go to functions

  const modulePath = path.join("node_modules", "firebase-functions");
  if (fs.existsSync(modulePath)) {
    execSync(`rm -rf ${modulePath}`, { stdio: "inherit" });
  }

  execSync("npm install", { stdio: "inherit" });
  process.chdir("../"); // go back to integration_test
}

/**
 * Build Node.js functions
 */
export function buildNodeFunctions(): void {
  logger.info("Building Node.js functions...");
  const currentDir = process.cwd();

  process.chdir(path.join(currentDir, "functions")); // go to functions
  execSync("npm run build", { stdio: "inherit" });
  process.chdir(currentDir); // go back to integration_test
}
