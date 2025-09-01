/**
 * Setup orchestration module
 */

import { ValidRuntime } from "../utils/types.js";
import {
  buildNodeSdk,
  createPackageJson,
  installNodeDependencies,
  buildNodeFunctions,
} from "./node.js";
import { buildPythonSdk, createRequirementsTxt, installPythonDependencies } from "./python.js";

/**
 * Main setup function that orchestrates SDK building and function setup
 */
export function setup(
  testRuntime: ValidRuntime,
  testRunId: string,
  nodeVersion: string,
  firebaseAdmin: string
): void {
  if (testRuntime === "node") {
    setupNode(testRunId, nodeVersion, firebaseAdmin);
  } else if (testRuntime === "python") {
    setupPython(firebaseAdmin);
  }
}

/**
 * Setup for Node.js runtime
 */
function setupNode(testRunId: string, nodeVersion: string, firebaseAdmin: string): void {
  buildNodeSdk(testRunId);
  createPackageJson(testRunId, nodeVersion, firebaseAdmin);
  installNodeDependencies();
  buildNodeFunctions();
}

/**
 * Setup for Python runtime
 */
function setupPython(firebaseAdmin: string): void {
  buildPythonSdk();
  createRequirementsTxt(firebaseAdmin);
  installPythonDependencies();
}

export default setup;
