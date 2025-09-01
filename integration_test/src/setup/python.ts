/**
 * Python specific setup functions
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { logger } from "../utils/logger.js";

/**
 * Build Python SDK package
 */
export function buildPythonSdk(): void {
  logger.info("Building Python SDK...");
  const currentDir = process.cwd();

  process.chdir(path.join(currentDir, "..")); // go up to root

  // Remove existing build
  fs.rmSync("dist", { recursive: true, force: true });

  // Remove existing venv
  fs.rmSync("venv", { recursive: true, force: true });

  // Make virtual environment for building
  execSync("python3 -m venv venv", { stdio: "inherit" });

  // Build the package
  execSync("source venv/bin/activate && python -m pip install --upgrade build", {
    stdio: "inherit",
    shell: "bash",
  });

  execSync("source venv/bin/activate && python -m build -s", {
    stdio: "inherit",
    shell: "bash",
  });

  // Move the generated tarball package to functions
  const generatedFile = fs
    .readdirSync("dist")
    .find((file) => file.match(/^firebase_functions-.*\.tar\.gz$/));

  if (generatedFile) {
    const targetPath = path.join("integration_test", "functions", "firebase_functions.tar.gz");
    fs.renameSync(path.join("dist", generatedFile), targetPath);
    logger.success(`SDK moved to ${targetPath}`);
  }

  process.chdir(currentDir); // go back to integration_test
}

/**
 * Create requirements.txt from template
 */
export function createRequirementsTxt(firebaseAdmin: string): void {
  logger.info("Creating requirements.txt...");
  const currentDir = process.cwd();
  const requirementsTemplatePath = `${currentDir}/requirements.txt.template`;
  const requirementsPath = `${currentDir}/functions/requirements.txt`;

  fs.copyFileSync(requirementsTemplatePath, requirementsPath);

  let requirementsContent = fs.readFileSync(requirementsPath, "utf8");
  requirementsContent = requirementsContent.replace(
    /__LOCAL_FIREBASE_FUNCTIONS__/g,
    "firebase_functions.tar.gz"
  );
  requirementsContent = requirementsContent.replace(/__FIREBASE_ADMIN__/g, firebaseAdmin);

  fs.writeFileSync(requirementsPath, requirementsContent);
}

/**
 * Install Python dependencies
 */
export function installPythonDependencies(): void {
  logger.info("Installing Python dependencies...");
  const functionsDir = "functions";

  process.chdir(functionsDir); // go to functions

  const venvPath = path.join("venv");
  if (fs.existsSync(venvPath)) {
    execSync(`rm -rf ${venvPath}`, { stdio: "inherit" });
  }

  execSync("python3 -m venv venv", { stdio: "inherit" });

  execSync("source venv/bin/activate && python3 -m pip install -r requirements.txt", {
    stdio: "inherit",
    shell: "bash",
  });

  process.chdir("../"); // go back to integration_test
}
