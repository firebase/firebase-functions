#!/usr/bin/env node

/**
 * Unified Test Runner for Firebase Functions Integration Tests
 * Combines functionality from run-suite.sh and run-sequential.sh into a single JavaScript runner
 */

import { spawn } from "child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, renameSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import chalk from "chalk";
import { getSuitesByPattern, listAvailableSuites } from "./config-loader.js";
import { generateFunctions } from "./generate.js";

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = dirname(__dirname);

// Configuration paths
const V1_CONFIG_PATH = join(ROOT_DIR, "config", "v1", "suites.yaml");
const V2_CONFIG_PATH = join(ROOT_DIR, "config", "v2", "suites.yaml");
const ARTIFACTS_DIR = join(ROOT_DIR, ".test-artifacts");
const LOGS_DIR = join(ROOT_DIR, "logs");
const GENERATED_DIR = join(ROOT_DIR, "generated");
const SA_JSON_PATH = join(ROOT_DIR, "sa.json");

// Default configurations
const DEFAULT_REGION = "us-central1";
const MAX_DEPLOY_ATTEMPTS = 3;
const DEFAULT_BASE_DELAY = 5000; // Base delay in ms (5 seconds)
const DEFAULT_MAX_DELAY = 60000; // Max delay in ms (60 seconds)

class TestRunner {
  constructor(options = {}) {
    this.testRunId = options.testRunId || this.generateTestRunId();
    this.sequential = options.sequential || false;
    this.saveArtifact = options.saveArtifact || false;
    this.skipCleanup = options.skipCleanup || false;
    this.filter = options.filter || "";
    this.exclude = options.exclude || "";
    this.usePublishedSDK = options.usePublishedSDK || null;
    this.verbose = options.verbose || false;
    this.cleanupOrphaned = options.cleanupOrphaned || false;
    this.timestamp = new Date().toISOString().replace(/[:.]/g, "-").substring(0, 19);
    this.logFile = join(LOGS_DIR, `test-run-${this.timestamp}.log`);
    this.deploymentSuccess = false;
    this.results = { passed: [], failed: [] };
  }

  /**
   * Generate a unique test run ID
   */
  generateTestRunId() {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let id = "t";
    for (let i = 0; i < 8; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  }

  /**
   * Calculate exponential backoff delay with jitter
   * Based on util.sh exponential_backoff function
   */
  calculateBackoffDelay(attempt, baseDelay = DEFAULT_BASE_DELAY, maxDelay = DEFAULT_MAX_DELAY) {
    // Calculate delay: baseDelay * 2^(attempt-1)
    let delay = baseDelay * Math.pow(2, attempt - 1);

    // Cap at maxDelay
    if (delay > maxDelay) {
      delay = maxDelay;
    }

    // Add jitter (±25% random variation)
    const jitter = delay / 4;
    const randomJitter = Math.random() * jitter * 2 - jitter;
    delay = delay + randomJitter;

    // Ensure minimum delay of 1 second
    if (delay < 1000) {
      delay = 1000;
    }

    return Math.round(delay);
  }

  /**
   * Retry function with exponential backoff
   * Based on util.sh retry_with_backoff function
   */
  async retryWithBackoff(
    operation,
    maxAttempts = MAX_DEPLOY_ATTEMPTS,
    baseDelay = DEFAULT_BASE_DELAY,
    maxDelay = DEFAULT_MAX_DELAY
  ) {
    let attempt = 1;

    while (attempt <= maxAttempts) {
      this.log(`🔄 Attempt ${attempt} of ${maxAttempts}`, "warn");

      try {
        const result = await operation();
        this.log("✅ Operation succeeded", "success");
        return result;
      } catch (error) {
        if (attempt < maxAttempts) {
          const delay = this.calculateBackoffDelay(attempt, baseDelay, maxDelay);
          this.log(
            `⚠️  Operation failed. Retrying in ${Math.round(delay / 1000)} seconds...`,
            "warn"
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          this.log(`❌ Operation failed after ${maxAttempts} attempts`, "error");
          throw error;
        }
      }

      attempt++;
    }
  }

  /**
   * Log message to console and file
   */
  log(message, level = "info") {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;

    // Ensure logs directory exists
    if (!existsSync(LOGS_DIR)) {
      mkdirSync(LOGS_DIR, { recursive: true });
    }

    // Write to log file
    try {
      writeFileSync(this.logFile, logEntry + "\n", { flag: "a" });
    } catch (e) {
      // Ignore file write errors
    }

    // Console output with colors
    switch (level) {
      case "error":
        console.log(chalk.red(message));
        break;
      case "warn":
        console.log(chalk.yellow(message));
        break;
      case "success":
        console.log(chalk.green(message));
        break;
      case "info":
        console.log(chalk.blue(message));
        break;
      default:
        console.log(message);
    }
  }

  /**
   * Execute a shell command
   */
  async exec(command, options = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, {
        shell: true,
        cwd: options.cwd || ROOT_DIR,
        env: { ...process.env, ...options.env },
        stdio: options.silent ? "pipe" : ["inherit", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      // Always capture output for error reporting, even when not silent
      child.stdout.on("data", (data) => {
        const output = data.toString();
        stdout += output;
        if (!options.silent) {
          process.stdout.write(output);
        }
      });

      child.stderr.on("data", (data) => {
        const output = data.toString();
        stderr += output;
        if (!options.silent) {
          process.stderr.write(output);
        }
      });

      child.on("exit", (code) => {
        if (code === 0) {
          resolve({ stdout, stderr, code });
        } else {
          // Include both stdout and stderr in error message for better debugging
          const errorOutput = stderr || stdout || "No output captured";
          reject(new Error(`Command failed with code ${code}: ${command}\n${errorOutput}`));
        }
      });

      child.on("error", (error) => {
        reject(error);
      });
    });
  }

  /**
   * Get all available suites from configuration
   */
  getAllSuites() {
    const suites = [];

    // Get V1 suites
    if (existsSync(V1_CONFIG_PATH)) {
      try {
        const v1Suites = listAvailableSuites(V1_CONFIG_PATH);
        suites.push(...v1Suites);
      } catch (e) {
        this.log(`Warning: Could not load V1 suites: ${e.message}`, "warn");
      }
    }

    // Get V2 suites
    if (existsSync(V2_CONFIG_PATH)) {
      try {
        const v2Suites = listAvailableSuites(V2_CONFIG_PATH);
        suites.push(...v2Suites);
      } catch (e) {
        this.log(`Warning: Could not load V2 suites: ${e.message}`, "warn");
      }
    }

    return suites;
  }

  /**
   * Filter suites based on patterns and exclusions
   */
  filterSuites(suitePatterns) {
    let suites = [];

    // If patterns include wildcards, get matching suites
    for (const pattern of suitePatterns) {
      if (pattern.includes("*") || pattern.includes("?")) {
        // Check both v1 and v2 configs
        if (existsSync(V1_CONFIG_PATH)) {
          const v1Matches = getSuitesByPattern(pattern, V1_CONFIG_PATH);
          suites.push(...v1Matches.map((s) => s.name));
        }
        if (existsSync(V2_CONFIG_PATH)) {
          const v2Matches = getSuitesByPattern(pattern, V2_CONFIG_PATH);
          suites.push(...v2Matches.map((s) => s.name));
        }
      } else {
        // Direct suite name
        suites.push(pattern);
      }
    }

    // Remove duplicates
    suites = [...new Set(suites)];

    // Apply filter pattern if specified
    if (this.filter) {
      suites = suites.filter((suite) => suite.includes(this.filter));
    }

    // Apply exclusions
    if (this.exclude) {
      suites = suites.filter((suite) => !suite.match(new RegExp(this.exclude)));
    }

    return suites;
  }

  /**
   * Generate functions from templates
   */
  async generateFunctions(suiteNames) {
    this.log("📦 Generating functions...", "info");

    // Use SDK tarball (must be provided via --use-published-sdk or pre-packed)
    let sdkTarball;
    if (this.usePublishedSDK) {
      sdkTarball = this.usePublishedSDK;
      this.log(`   Using provided SDK: ${sdkTarball}`, "info");
    } else {
      // Default to local tarball (should be pre-packed by Cloud Build or manually)
      sdkTarball = `file:firebase-functions-local.tgz`;
      this.log(`   Using local SDK: firebase-functions-local.tgz`, "info");
    }

    try {
      // Call the generate function directly instead of spawning subprocess
      const metadata = await generateFunctions(suiteNames, {
        testRunId: this.testRunId,
        sdkTarball: sdkTarball,
        quiet: true, // Suppress console output since we have our own logging
      });

      // Store project info
      this.projectId = metadata.projectId;
      this.region = metadata.region || DEFAULT_REGION;

      this.log(
        `✓ Generated ${suiteNames.length} suite(s) for project: ${this.projectId}`,
        "success"
      );

      // Save artifact if requested
      if (this.saveArtifact) {
        this.saveTestArtifact(metadata);
      }

      return metadata;
    } catch (error) {
      throw new Error(`Failed to generate functions: ${error.message}`);
    }
  }

  /**
   * Build generated functions
   */
  async buildFunctions() {
    this.log("🔨 Building functions...", "info");

    const functionsDir = join(GENERATED_DIR, "functions");

    // Install and build
    await this.exec("npm install", { cwd: functionsDir });
    await this.exec("npm run build", { cwd: functionsDir });

    this.log("✓ Functions built successfully", "success");
  }

  /**
   * Deploy functions to Firebase with retry logic
   */
  async deployFunctions() {
    this.log("☁️  Deploying to Firebase...", "info");

    try {
      await this.retryWithBackoff(async () => {
        const result = await this.exec(
          `firebase deploy --only functions --project ${this.projectId} --force`,
          { cwd: GENERATED_DIR, silent: !this.verbose }
        );

        // Check for successful deployment or acceptable warnings
        const output = result.stdout + result.stderr;
        if (
          output.includes("Deploy complete!") ||
          output.includes("Functions successfully deployed but could not set up cleanup policy")
        ) {
          this.deploymentSuccess = true;
          this.log("✅ Deployment succeeded", "success");
          return result;
        } else {
          // Log output for debugging if deployment didn't match expected success patterns
          this.log("⚠️  Deployment output did not match success patterns", "warn");
          this.log(`Stdout: ${result.stdout.substring(0, 500)}...`, "warn");
          this.log(`Stderr: ${result.stderr.substring(0, 500)}...`, "warn");
          throw new Error("Deployment output did not match success patterns");
        }
      });
    } catch (error) {
      // Enhanced error logging with full details
      this.log(`❌ Deployment error: ${error.message}`, "error");

      // Try to extract more details from the error
      if (error.message.includes("Command failed with code 1")) {
        this.log("🔍 Full deployment command output:", "error");

        // Extract the actual Firebase CLI error from the error message
        const errorLines = error.message.split("\n");
        const firebaseError = errorLines.slice(1).join("\n").trim(); // Skip the first line which is our generic message

        if (firebaseError) {
          this.log("   Actual Firebase CLI error:", "error");
          this.log(`   ${firebaseError}`, "error");
        } else {
          this.log("   No detailed error output captured", "error");
        }

        this.log("   Common causes:", "error");
        this.log("   - Authentication issues (run: firebase login)", "error");
        this.log("   - Project permissions (check project access)", "error");
        this.log("   - Function code errors (check generated code)", "error");
        this.log("   - Resource limits (too many functions)", "error");
        this.log("   - Network issues", "error");
      }

      // On final failure, provide more detailed error information
      this.log("🔍 Final deployment attempt failed. Debugging information:", "error");
      this.log(`   Project: ${this.projectId}`, "error");
      this.log(`   Region: ${this.region}`, "error");
      this.log(`   Generated directory: ${GENERATED_DIR}`, "error");
      this.log("   Try running manually:", "error");
      this.log(
        `   cd ${GENERATED_DIR} && firebase deploy --only functions --project ${this.projectId}`,
        "error"
      );
      throw new Error(`Deployment failed after ${MAX_DEPLOY_ATTEMPTS} attempts: ${error.message}`);
    }
  }

  /**
   * Map suite name to test file path
   */
  getTestFile(suiteName) {
    const service = suiteName.split("_").slice(1).join("_");
    const version = suiteName.split("_")[0];

    // Special cases
    if (suiteName.startsWith("v1_auth")) {
      return "tests/v1/auth.test.ts";
    }
    if (suiteName === "v2_alerts") {
      return null; // Deployment only, no tests
    }

    // Map service names to test files
    const serviceMap = {
      firestore: `tests/${version}/firestore.test.ts`,
      database: `tests/${version}/database.test.ts`,
      pubsub: `tests/${version}/pubsub.test.ts`,
      storage: `tests/${version}/storage.test.ts`,
      tasks: `tests/${version}/tasks.test.ts`,
      remoteconfig:
        version === "v1" ? "tests/v1/remoteconfig.test.ts" : "tests/v2/remoteConfig.test.ts",
      testlab: version === "v1" ? "tests/v1/testlab.test.ts" : "tests/v2/testLab.test.ts",
      scheduler: "tests/v2/scheduler.test.ts",
      identity: "tests/v2/identity.test.ts",
      eventarc: "tests/v2/eventarc.test.ts",
    };

    return serviceMap[service] || null;
  }

  /**
   * Run tests for deployed functions
   */
  async runTests(suiteNames) {
    this.log("🧪 Running tests...", "info");

    // Check for service account
    if (!existsSync(SA_JSON_PATH)) {
      this.log(
        "⚠️  Warning: sa.json not found. Tests may fail without proper authentication.",
        "warn"
      );
    }

    // Collect test files for all suites
    const testFiles = [];
    const seenFiles = new Set();
    let deployedFunctions = [];

    for (const suiteName of suiteNames) {
      // Track deployed auth functions
      if (suiteName === "v1_auth_nonblocking") {
        deployedFunctions.push("onCreate", "onDelete");
      } else if (suiteName === "v1_auth_before_create") {
        deployedFunctions.push("beforeCreate");
      } else if (suiteName === "v1_auth_before_signin") {
        deployedFunctions.push("beforeSignIn");
      }

      const testFile = this.getTestFile(suiteName);
      if (testFile && !seenFiles.has(testFile)) {
        const fullPath = join(ROOT_DIR, testFile);
        if (existsSync(fullPath)) {
          testFiles.push(testFile);
          seenFiles.add(testFile);
        }
      }
    }

    if (testFiles.length === 0) {
      this.log("⚠️  No test files found for the generated suites.", "warn");
      this.log("   Skipping test execution (deployment-only suites).", "success");
      return;
    }

    // Run Jest tests
    const env = {
      TEST_RUN_ID: this.testRunId,
      PROJECT_ID: this.projectId,
      REGION: this.region,
      DEPLOYED_FUNCTIONS: deployedFunctions.join(","),
      ...process.env,
    };

    if (existsSync(SA_JSON_PATH)) {
      env.GOOGLE_APPLICATION_CREDENTIALS = SA_JSON_PATH;
    }

    this.log(`Running tests: ${testFiles.join(", ")}`, "info");
    this.log(`TEST_RUN_ID: ${this.testRunId}`, "info");

    await this.exec(`npm test -- ${testFiles.join(" ")}`, { env });
  }

  /**
   * Clean up deployed functions and test data
   */
  async cleanup() {
    this.log("🧹 Running cleanup...", "warn");

    const metadataPath = join(GENERATED_DIR, ".metadata.json");
    if (!existsSync(metadataPath)) {
      this.log("   No metadata found, skipping cleanup", "warn");
      return;
    }

    const metadata = JSON.parse(readFileSync(metadataPath, "utf8"));

    // Only delete functions if deployment was successful
    if (this.deploymentSuccess) {
      await this.cleanupFunctions(metadata);
    }

    // Clean up test data
    await this.cleanupTestData(metadata);

    // Clean up generated files
    this.log("   Cleaning up generated files...", "warn");
    if (existsSync(GENERATED_DIR)) {
      rmSync(GENERATED_DIR, { recursive: true, force: true });
      mkdirSync(GENERATED_DIR, { recursive: true });
    }
  }

  /**
   * Delete deployed functions
   */
  async cleanupFunctions(metadata) {
    this.log("   Deleting deployed functions...", "warn");

    // Extract function names from metadata
    const functions = [];
    for (const suite of metadata.suites || []) {
      for (const func of suite.functions || []) {
        functions.push(func);
      }
    }

    for (const functionName of functions) {
      try {
        await this.exec(
          `firebase functions:delete ${functionName} --project ${metadata.projectId} --region ${
            metadata.region || DEFAULT_REGION
          } --force`,
          { silent: true }
        );
        this.log(`   Deleted function: ${functionName}`);
      } catch (error) {
        // Try gcloud as fallback
        try {
          await this.exec(
            `gcloud functions delete ${functionName} --region=${
              metadata.region || DEFAULT_REGION
            } --project=${metadata.projectId} --quiet`,
            { silent: true }
          );
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    }
  }

  /**
   * Clean up test data from Firestore
   */
  async cleanupTestData(metadata) {
    this.log("   Cleaning up Firestore test data...", "warn");

    // Extract collection names from metadata
    const collections = new Set();

    for (const suite of metadata.suites || []) {
      for (const func of suite.functions || []) {
        if (func.collection) {
          collections.add(func.collection);
        }
        // Also add function name without TEST_RUN_ID as collection
        const baseName = func.name ? func.name.replace(this.testRunId, "") : null;
        if (baseName && baseName.includes("Tests")) {
          collections.add(baseName);
        }
      }
    }

    // Clean up each collection
    for (const collection of collections) {
      try {
        await this.exec(
          `firebase firestore:delete ${collection}/${this.testRunId} --project ${metadata.projectId} --yes`,
          { silent: true }
        );
      } catch (e) {
        // Ignore cleanup errors
      }
    }

    // Clean up auth users if auth tests were run
    if (metadata.suites.some((s) => s.name.includes("auth") || s.name.includes("identity"))) {
      this.log("   Cleaning up auth test users...", "warn");
      try {
        await this.exec(`node ${join(__dirname, "cleanup-auth-users.cjs")} ${this.testRunId}`, {
          silent: true,
        });
      } catch (e) {
        // Ignore cleanup errors
      }
    }

    // Clean up Cloud Tasks queues if tasks tests were run
    if (metadata.suites.some((s) => s.name.includes("tasks"))) {
      await this.cleanupCloudTasksQueues(metadata);
    }
  }

  /**
   * Clean up Cloud Tasks queues created by tests
   */
  async cleanupCloudTasksQueues(metadata) {
    this.log("   Cleaning up Cloud Tasks queues...", "warn");

    const region = metadata.region || DEFAULT_REGION;
    const projectId = metadata.projectId;

    // Extract queue names from metadata (function names become queue names in v1)
    const queueNames = new Set();
    for (const suite of metadata.suites || []) {
      if (suite.name.includes("tasks")) {
        for (const func of suite.functions || []) {
          if (func.name && func.name.includes("Tests")) {
            // Function name becomes the queue name in v1
            queueNames.add(func.name);
          }
        }
      }
    }

    // Delete each queue
    for (const queueName of queueNames) {
      try {
        this.log(`   Deleting Cloud Tasks queue: ${queueName}`, "warn");

        // Try gcloud command to delete the queue
        await this.exec(
          `gcloud tasks queues delete ${queueName} --location=${region} --project=${projectId} --quiet`,
          { silent: true }
        );
        this.log(`   ✅ Deleted Cloud Tasks queue: ${queueName}`);
      } catch (error) {
        // Queue might not exist or already deleted, ignore errors
        this.log(`   ⚠️  Could not delete queue ${queueName}: ${error.message}`, "warn");
      }
    }
  }

  /**
   * Save test artifact for future cleanup
   */
  saveTestArtifact(metadata) {
    if (!existsSync(ARTIFACTS_DIR)) {
      mkdirSync(ARTIFACTS_DIR, { recursive: true });
    }

    const artifactPath = join(ARTIFACTS_DIR, `${this.testRunId}.json`);
    writeFileSync(artifactPath, JSON.stringify(metadata, null, 2));
    this.log(`✓ Saved artifact for future cleanup: ${this.testRunId}.json`, "success");
  }

  /**
   * Get project IDs from configuration (YAML files are source of truth)
   */
  getProjectIds() {
    // Project IDs are read from the YAML configuration files
    // V1 tests use functions-integration-tests
    // V2 tests use functions-integration-tests-v2
    const v1ProjectId = "functions-integration-tests";
    const v2ProjectId = "functions-integration-tests-v2";

    this.log(`Using V1 Project ID: ${v1ProjectId}`, "info");
    this.log(`Using V2 Project ID: ${v2ProjectId}`, "info");

    return { v1ProjectId, v2ProjectId };
  }

  /**
   * Clean up existing test resources before running
   */
  async cleanupExistingResources() {
    this.log("🧹 Checking for existing test functions...", "warn");

    const { v1ProjectId, v2ProjectId } = this.getProjectIds();
    const projects = [v1ProjectId, v2ProjectId];

    for (const projectId of projects) {
      this.log(`   Checking project: ${projectId}`, "warn");

      try {
        // List functions and find test functions
        const result = await this.exec(`firebase functions:list --project ${projectId}`, {
          silent: true,
        });

        // Parse the table output from firebase functions:list
        const lines = result.stdout.split("\n");
        const testFunctions = [];

        for (const line of lines) {
          // Look for table rows with function names (containing │)
          if (line.includes("│") && line.includes("Test")) {
            const parts = line.split("│");
            if (parts.length >= 2) {
              const functionName = parts[1].trim();
              // Check if it's a test function (contains Test + test run ID pattern)
              if (functionName.match(/Test.*t[a-z0-9]{7,10}/)) {
                testFunctions.push(functionName);
              }
            }
          }
        }

        if (testFunctions.length > 0) {
          this.log(
            `   Found ${testFunctions.length} test function(s) in ${projectId}. Cleaning up...`,
            "warn"
          );

          for (const func of testFunctions) {
            try {
              // Function names from firebase functions:list are just the name, no region suffix
              const functionName = func.trim();
              const region = DEFAULT_REGION;

              this.log(`   Deleting function: ${functionName} in region: ${region}`, "warn");

              // Try Firebase CLI first
              try {
                await this.exec(
                  `firebase functions:delete ${functionName} --project ${projectId} --region ${region} --force`,
                  { silent: true }
                );
                this.log(`   ✅ Deleted via Firebase CLI: ${functionName}`);
              } catch (firebaseError) {
                // If Firebase CLI fails, try gcloud as fallback
                this.log(`   Firebase CLI failed, trying gcloud for: ${functionName}`, "warn");
                try {
                  await this.exec(
                    `gcloud functions delete ${functionName} --region=${region} --project=${projectId} --quiet`,
                    { silent: true }
                  );
                  this.log(`   ✅ Deleted via gcloud: ${functionName}`);
                } catch (gcloudError) {
                  this.log(`   ❌ Failed to delete: ${functionName}`, "error");
                  this.log(`   Firebase error: ${firebaseError.message}`, "error");
                  this.log(`   Gcloud error: ${gcloudError.message}`, "error");
                }
              }
            } catch (e) {
              this.log(`   ❌ Unexpected error deleting ${func}: ${e.message}`, "error");
            }
          }
        } else {
          this.log(`   ✅ No test functions found in ${projectId}`, "success");
        }
      } catch (e) {
        // Project might not be accessible
      }
    }

    // Clean up orphaned Cloud Tasks queues
    await this.cleanupOrphanedCloudTasksQueues();

    // Clean up generated directory
    if (existsSync(GENERATED_DIR)) {
      this.log("   Cleaning up generated directory...", "warn");
      rmSync(GENERATED_DIR, { recursive: true, force: true });
    }
  }

  /**
   * Clean up orphaned Cloud Tasks queues from previous test runs
   */
  async cleanupOrphanedCloudTasksQueues() {
    this.log("   Checking for orphaned Cloud Tasks queues...", "warn");

    const { v1ProjectId, v2ProjectId } = this.getProjectIds();
    const projects = [v1ProjectId, v2ProjectId];
    const region = DEFAULT_REGION;

    for (const projectId of projects) {
      this.log(`   Checking Cloud Tasks queues in project: ${projectId}`, "warn");

      try {
        // List all queues in the project
        const result = await this.exec(
          `gcloud tasks queues list --location=${region} --project=${projectId} --format="value(name)"`,
          { silent: true }
        );

        const queueNames = result.stdout
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0);

        // Find test queues (containing "Tests" and test run ID pattern)
        const testQueues = queueNames.filter((queueName) => {
          const queueId = queueName.split("/").pop(); // Extract queue ID from full path
          return queueId && queueId.match(/Tests.*t[a-z0-9]{7,10}/);
        });

        if (testQueues.length > 0) {
          this.log(
            `   Found ${testQueues.length} orphaned test queue(s) in ${projectId}. Cleaning up...`,
            "warn"
          );

          for (const queuePath of testQueues) {
            try {
              const queueId = queuePath.split("/").pop();
              this.log(`   Deleting orphaned queue: ${queueId}`, "warn");

              await this.exec(
                `gcloud tasks queues delete ${queueId} --location=${region} --project=${projectId} --quiet`,
                { silent: true }
              );
              this.log(`   ✅ Deleted orphaned queue: ${queueId}`);
            } catch (error) {
              this.log(`   ⚠️  Could not delete queue ${queuePath}: ${error.message}`, "warn");
            }
          }
        } else {
          this.log(`   ✅ No orphaned test queues found in ${projectId}`, "success");
        }
      } catch (e) {
        // Project might not be accessible or Cloud Tasks API not enabled
        this.log(`   ⚠️  Could not check queues in ${projectId}: ${e.message}`, "warn");
      }
    }
  }

  /**
   * Run a single suite
   */
  async runSuite(suiteName) {
    this.log("═══════════════════════════════════════════════════════════", "info");
    this.log(`🚀 Running suite: ${suiteName}`, "success");
    this.log("═══════════════════════════════════════════════════════════", "info");

    try {
      // Generate functions
      const metadata = await this.generateFunctions([suiteName]);

      // Find this suite's specific projectId and region
      const suiteMetadata = metadata.suites.find((s) => s.name === suiteName);
      if (suiteMetadata) {
        this.projectId = suiteMetadata.projectId || metadata.projectId;
        this.region = suiteMetadata.region || metadata.region || DEFAULT_REGION;
        this.log(`   Using project: ${this.projectId}, region: ${this.region}`, "info");
      }

      // Build functions
      await this.buildFunctions();

      // Deploy functions
      await this.deployFunctions();

      // Run tests
      await this.runTests([suiteName]);

      this.results.passed.push(suiteName);
      this.log(`✅ Suite ${suiteName} completed successfully`, "success");
      return true;
    } catch (error) {
      this.results.failed.push(suiteName);
      this.log(`❌ Suite ${suiteName} failed: ${error.message}`, "error");
      return false;
    } finally {
      // Always run cleanup
      await this.cleanup();
    }
  }

  /**
   * Run multiple suites sequentially
   */
  async runSequential(suiteNames) {
    this.log("═══════════════════════════════════════════════════════════", "info");
    this.log("🚀 Starting Sequential Test Suite Execution", "success");
    this.log("═══════════════════════════════════════════════════════════", "info");
    this.log(`📋 Test Run ID: ${this.testRunId}`, "success");
    this.log(`📝 Main log: ${this.logFile}`, "warn");
    this.log(`📁 Logs directory: ${LOGS_DIR}`, "warn");
    this.log("");

    this.log(`📋 Running ${suiteNames.length} suite(s) sequentially:`, "success");
    for (const suite of suiteNames) {
      this.log(`   - ${suite}`);
    }
    this.log("");

    // Clean up existing resources unless skipped
    if (!this.skipCleanup) {
      await this.cleanupExistingResources();
    }

    // SDK should be pre-packed (by Cloud Build or manually)
    if (!this.usePublishedSDK) {
      this.log("📦 Using pre-packed SDK for all suites...", "info");
    }

    // Run each suite
    for (const suite of suiteNames) {
      await this.runSuite(suite);
      this.log("");
    }

    // Final summary
    this.printSummary();
  }

  /**
   * Run multiple suites in parallel
   */
  async runParallel(suiteNames) {
    this.log("═══════════════════════════════════════════════════════════", "info");
    this.log("🚀 Running Test Suite(s)", "success");
    this.log("═══════════════════════════════════════════════════════════", "info");
    this.log(`📋 Test Run ID: ${this.testRunId}`, "success");
    this.log("");

    // First, generate functions to get metadata with projectIds
    const metadata = await this.generateFunctions(suiteNames);

    // Group suites by projectId
    const suitesByProject = {};
    for (const suite of metadata.suites) {
      const projectId = suite.projectId || metadata.projectId;
      if (!suitesByProject[projectId]) {
        suitesByProject[projectId] = [];
      }
      suitesByProject[projectId].push(suite.name);
    }

    const projectCount = Object.keys(suitesByProject).length;
    if (projectCount > 1) {
      this.log(
        `📊 Found ${projectCount} different projects. Running each group separately:`,
        "warn"
      );
      for (const [projectId, suites] of Object.entries(suitesByProject)) {
        this.log(`   - ${projectId}: ${suites.join(", ")}`);
      }
      this.log("");

      // Run each project group separately
      for (const [projectId, projectSuites] of Object.entries(suitesByProject)) {
        this.log(`🚀 Running suites for project: ${projectId}`, "info");

        // Set project context for this group
        this.projectId = projectId;
        const suiteMetadata = metadata.suites.find((s) => projectSuites.includes(s.name));
        this.region = suiteMetadata?.region || metadata.region || DEFAULT_REGION;

        try {
          // Build functions (already generated)
          await this.buildFunctions();

          // Deploy functions
          await this.deployFunctions();

          // Run tests for this project's suites
          await this.runTests(projectSuites);

          this.results.passed.push(...projectSuites);
        } catch (error) {
          this.results.failed.push(...projectSuites);
          this.log(`❌ Tests failed for ${projectId}: ${error.message}`, "error");
        }

        // Cleanup after each project group
        await this.cleanup();
      }
    } else {
      // All suites use the same project, run normally
      try {
        // Build functions
        await this.buildFunctions();

        // Deploy functions
        await this.deployFunctions();

        // Run tests
        await this.runTests(suiteNames);

        this.results.passed = suiteNames;
        this.log("✅ All tests passed!", "success");
      } catch (error) {
        this.results.failed = suiteNames;
        this.log(`❌ Tests failed: ${error.message}`, "error");
        throw error;
      } finally {
        // Always run cleanup
        await this.cleanup();
      }
    }
  }

  /**
   * Print test results summary
   */
  printSummary() {
    this.log("═══════════════════════════════════════════════════════════", "info");
    this.log("📊 Test Suite Summary", "success");
    this.log("═══════════════════════════════════════════════════════════", "info");
    this.log(`✅ Passed: ${this.results.passed.length} suite(s)`, "success");
    this.log(`❌ Failed: ${this.results.failed.length} suite(s)`, "error");

    if (this.results.failed.length > 0) {
      this.log(`Failed suites: ${this.results.failed.join(", ")}`, "error");
      this.log(`📝 Check main log: ${this.logFile}`, "warn");
    } else {
      this.log("🎉 All suites passed!", "success");
    }
  }
}

/**
 * Main CLI handler
 */
async function main() {
  const args = process.argv.slice(2);

  // Parse command line arguments
  const options = {
    sequential: false,
    saveArtifact: false,
    skipCleanup: false,
    filter: "",
    exclude: "",
    testRunId: null,
    usePublishedSDK: null,
    verbose: false,
    cleanupOrphaned: false,
    list: false,
    help: false,
  };

  const suitePatterns = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--list") {
      options.list = true;
    } else if (arg === "--sequential") {
      options.sequential = true;
    } else if (arg === "--save-artifact") {
      options.saveArtifact = true;
    } else if (arg === "--skip-cleanup") {
      options.skipCleanup = true;
    } else if (arg === "--verbose" || arg === "-v") {
      options.verbose = true;
    } else if (arg === "--cleanup-orphaned") {
      options.cleanupOrphaned = true;
    } else if (arg.startsWith("--filter=")) {
      options.filter = arg.split("=")[1];
    } else if (arg.startsWith("--exclude=")) {
      options.exclude = arg.split("=")[1];
    } else if (arg.startsWith("--test-run-id=")) {
      options.testRunId = arg.split("=")[1];
    } else if (arg.startsWith("--use-published-sdk=")) {
      options.usePublishedSDK = arg.split("=")[1];
    } else if (!arg.startsWith("-")) {
      suitePatterns.push(arg);
    }
  }

  // Show help
  if (options.help || (args.length === 0 && !options.list)) {
    console.log(chalk.blue("Usage: node run-tests.js [suites...] [options]"));
    console.log("");
    console.log("Examples:");
    console.log("  node run-tests.js v1_firestore                    # Single suite");
    console.log("  node run-tests.js v1_firestore v2_database       # Multiple suites");
    console.log('  node run-tests.js "v1_*"                         # All v1 suites (pattern)');
    console.log('  node run-tests.js --sequential "v2_*"            # Sequential execution');
    console.log("  node run-tests.js --filter=v2 --exclude=auth     # Filter suites");
    console.log("  node run-tests.js --list                         # List available suites");
    console.log("");
    console.log("Options:");
    console.log("  --sequential              Run suites sequentially instead of in parallel");
    console.log("  --filter=PATTERN          Only run suites matching pattern");
    console.log("  --exclude=PATTERN         Skip suites matching pattern");
    console.log("  --test-run-id=ID          Use specific TEST_RUN_ID");
    console.log(
      "  --use-published-sdk=VER   Use published SDK version instead of local (default: use pre-packed local)"
    );
    console.log("  --save-artifact           Save test metadata for future cleanup");
    console.log("  --skip-cleanup            Skip pre-run cleanup (sequential mode only)");
    console.log("  --verbose, -v             Show detailed Firebase CLI output during deployment");
    console.log("  --cleanup-orphaned        Clean up orphaned test functions and exit");
    console.log("  --list                    List all available suites");
    console.log("  --help, -h                Show this help message");
    process.exit(0);
  }

  // List suites
  if (options.list) {
    const runner = new TestRunner();
    const allSuites = runner.getAllSuites();

    console.log(chalk.blue("\nAvailable test suites:"));
    console.log(chalk.blue("─────────────────────"));

    const v1Suites = allSuites.filter((s) => s.startsWith("v1_"));
    const v2Suites = allSuites.filter((s) => s.startsWith("v2_"));

    if (v1Suites.length > 0) {
      console.log(chalk.green("\n📁 V1 Suites:"));
      v1Suites.forEach((suite) => console.log(`  - ${suite}`));
    }

    if (v2Suites.length > 0) {
      console.log(chalk.green("\n📁 V2 Suites:"));
      v2Suites.forEach((suite) => console.log(`  - ${suite}`));
    }

    process.exit(0);
  }

  // Create runner instance
  const runner = new TestRunner(options);

  // Handle cleanup-orphaned option
  if (options.cleanupOrphaned) {
    console.log(chalk.blue("🧹 Cleaning up orphaned test functions..."));
    await runner.cleanupExistingResources();
    console.log(chalk.green("✅ Orphaned function cleanup completed"));
    process.exit(0);
  }

  // Get filtered suite list
  let suites;
  if (suitePatterns.length === 0 && options.sequential) {
    // No patterns specified in sequential mode, run all suites
    suites = runner.getAllSuites();
    if (options.filter) {
      suites = suites.filter((s) => s.includes(options.filter));
    }
    if (options.exclude) {
      suites = suites.filter((s) => !s.match(new RegExp(options.exclude)));
    }
  } else {
    suites = runner.filterSuites(suitePatterns);
  }

  if (suites.length === 0) {
    console.log(chalk.red("❌ No test suites found matching criteria"));
    process.exit(1);
  }

  try {
    // Run tests
    if (options.sequential) {
      await runner.runSequential(suites);
    } else {
      await runner.runParallel(suites);
    }

    // Exit with appropriate code
    process.exit(runner.results.failed.length > 0 ? 1 : 0);
  } catch (error) {
    console.error(chalk.red(`❌ Test execution failed: ${error.message}`));
    if (error.stack) {
      console.error(chalk.gray(error.stack));
    }
    process.exit(1);
  }
}

// Handle uncaught errors
process.on("unhandledRejection", (error) => {
  console.error(chalk.red("❌ Unhandled error:"), error);
  process.exit(1);
});

// Run main function
main();
