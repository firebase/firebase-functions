#!/usr/bin/env node

/**
 * Unified Test Runner for Firebase Functions Integration Tests
 * Combines functionality from run-suite.sh and run-sequential.sh into a single JavaScript runner
 */

import { spawn } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, renameSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { getSuitesByPattern, listAvailableSuites } from './config-loader.js';
import { generateFunctions } from './generate.js';

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = dirname(__dirname);

// Configuration paths
const V1_CONFIG_PATH = join(ROOT_DIR, 'config', 'v1', 'suites.yaml');
const V2_CONFIG_PATH = join(ROOT_DIR, 'config', 'v2', 'suites.yaml');
const ARTIFACTS_DIR = join(ROOT_DIR, '.test-artifacts');
const LOGS_DIR = join(ROOT_DIR, 'logs');
const GENERATED_DIR = join(ROOT_DIR, 'generated');
const SA_JSON_PATH = join(ROOT_DIR, 'sa.json');

// Default configurations
const DEFAULT_REGION = 'us-central1';
const MAX_DEPLOY_ATTEMPTS = 3;
const DEPLOY_RETRY_DELAY = 20000; // Base delay in ms

class TestRunner {
  constructor(options = {}) {
    this.testRunId = options.testRunId || this.generateTestRunId();
    this.sequential = options.sequential || false;
    this.saveArtifact = options.saveArtifact || false;
    this.skipCleanup = options.skipCleanup || false;
    this.filter = options.filter || '';
    this.exclude = options.exclude || '';
    this.usePublishedSDK = options.usePublishedSDK || null;
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    this.logFile = join(LOGS_DIR, `test-run-${this.timestamp}.log`);
    this.deploymentSuccess = false;
    this.results = { passed: [], failed: [] };
    this.sdkTarballPath = null; // Store the SDK tarball path to avoid repacking
  }

  /**
   * Generate a unique test run ID
   */
  generateTestRunId() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let id = 't';
    for (let i = 0; i < 8; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  }

  /**
   * Log message to console and file
   */
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;

    // Ensure logs directory exists
    if (!existsSync(LOGS_DIR)) {
      mkdirSync(LOGS_DIR, { recursive: true });
    }

    // Write to log file
    try {
      writeFileSync(this.logFile, logEntry + '\n', { flag: 'a' });
    } catch (e) {
      // Ignore file write errors
    }

    // Console output with colors
    switch(level) {
      case 'error':
        console.log(chalk.red(message));
        break;
      case 'warn':
        console.log(chalk.yellow(message));
        break;
      case 'success':
        console.log(chalk.green(message));
        break;
      case 'info':
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
        stdio: options.silent ? 'pipe' : 'inherit'
      });

      let stdout = '';
      let stderr = '';

      if (options.silent) {
        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });
        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });
      }

      child.on('exit', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr, code });
        } else {
          reject(new Error(`Command failed with code ${code}: ${command}\n${stderr}`));
        }
      });

      child.on('error', (error) => {
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
        this.log(`Warning: Could not load V1 suites: ${e.message}`, 'warn');
      }
    }

    // Get V2 suites
    if (existsSync(V2_CONFIG_PATH)) {
      try {
        const v2Suites = listAvailableSuites(V2_CONFIG_PATH);
        suites.push(...v2Suites);
      } catch (e) {
        this.log(`Warning: Could not load V2 suites: ${e.message}`, 'warn');
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
      if (pattern.includes('*') || pattern.includes('?')) {
        // Check both v1 and v2 configs
        if (existsSync(V1_CONFIG_PATH)) {
          const v1Matches = getSuitesByPattern(pattern, V1_CONFIG_PATH);
          suites.push(...v1Matches.map(s => s.name));
        }
        if (existsSync(V2_CONFIG_PATH)) {
          const v2Matches = getSuitesByPattern(pattern, V2_CONFIG_PATH);
          suites.push(...v2Matches.map(s => s.name));
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
      suites = suites.filter(suite => suite.includes(this.filter));
    }

    // Apply exclusions
    if (this.exclude) {
      suites = suites.filter(suite => !suite.match(new RegExp(this.exclude)));
    }

    return suites;
  }

  /**
   * Pack the local Firebase Functions SDK
   */
  async packLocalSDK() {
    this.log('📦 Packing local firebase-functions SDK...', 'info');

    const parentDir = join(ROOT_DIR, '..');
    const targetPath = join(ROOT_DIR, 'firebase-functions-local.tgz');

    try {
      // Run npm pack in parent directory
      const result = await this.exec('npm pack', { cwd: parentDir, silent: true });

      // Find the generated tarball name (last line of output)
      const tarballName = result.stdout.trim().split('\n').pop();

      // Move to expected location
      const sourcePath = join(parentDir, tarballName);

      if (existsSync(sourcePath)) {
        // Remove old tarball if exists
        if (existsSync(targetPath)) {
          rmSync(targetPath);
        }

        // Move new tarball
        renameSync(sourcePath, targetPath);
        this.log('✓ Local SDK packed successfully', 'success');
        return targetPath;
      } else {
        throw new Error(`Tarball not found at ${sourcePath}`);
      }
    } catch (error) {
      throw new Error(`Failed to pack local SDK: ${error.message}`);
    }
  }

  /**
   * Generate functions from templates
   */
  async generateFunctions(suiteNames) {
    this.log('📦 Generating functions...', 'info');

    // Pack local SDK unless using published version
    let sdkTarball;
    if (this.usePublishedSDK) {
      sdkTarball = this.usePublishedSDK;
      this.log(`   Using published SDK: ${sdkTarball}`, 'info');
    } else if (this.sdkTarballPath) {
      // Use already packed SDK
      sdkTarball = `file:firebase-functions-local.tgz`;
      this.log(`   Using already packed SDK: ${this.sdkTarballPath}`, 'info');
    } else {
      // Pack the local SDK for the first time
      this.sdkTarballPath = await this.packLocalSDK();
      sdkTarball = `file:firebase-functions-local.tgz`;
      this.log(`   Using local SDK: ${this.sdkTarballPath}`, 'info');
    }

    try {
      // Call the generate function directly instead of spawning subprocess
      const metadata = await generateFunctions(suiteNames, {
        testRunId: this.testRunId,
        sdkTarball: sdkTarball,
        quiet: true  // Suppress console output since we have our own logging
      });

      // Store project info
      this.projectId = metadata.projectId;
      this.region = metadata.region || DEFAULT_REGION;

      this.log(`✓ Generated ${suiteNames.length} suite(s) for project: ${this.projectId}`, 'success');

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
    this.log('🔨 Building functions...', 'info');

    const functionsDir = join(GENERATED_DIR, 'functions');

    // Install and build
    await this.exec('npm install', { cwd: functionsDir });
    await this.exec('npm run build', { cwd: functionsDir });

    this.log('✓ Functions built successfully', 'success');
  }

  /**
   * Deploy functions to Firebase with retry logic
   */
  async deployFunctions() {
    this.log('☁️  Deploying to Firebase...', 'info');

    let attempt = 1;
    let deployed = false;

    while (attempt <= MAX_DEPLOY_ATTEMPTS && !deployed) {
      this.log(`🔄 Attempt ${attempt} of ${MAX_DEPLOY_ATTEMPTS}`, 'warn');

      try {
        const result = await this.exec(
          `firebase deploy --only functions --project ${this.projectId}`,
          { cwd: GENERATED_DIR, silent: true }
        );

        // Check for successful deployment or acceptable warnings
        const output = result.stdout + result.stderr;
        if (output.includes('Deploy complete!') ||
            output.includes('Functions successfully deployed but could not set up cleanup policy')) {
          deployed = true;
          this.deploymentSuccess = true;
          this.log('✅ Deployment succeeded', 'success');
        } else {
          // Log output for debugging if deployment didn't match expected success patterns
          this.log('⚠️  Deployment output did not match success patterns', 'warn');
          this.log(`Stdout: ${result.stdout.substring(0, 500)}...`, 'warn');
          this.log(`Stderr: ${result.stderr.substring(0, 500)}...`, 'warn');
        }
      } catch (error) {
        // Log the actual error details for debugging
        this.log(`❌ Deployment error: ${error.message}`, 'error');

        if (attempt < MAX_DEPLOY_ATTEMPTS) {
          const delay = DEPLOY_RETRY_DELAY + Math.random() * 20000;
          this.log(`⚠️  Deployment failed. Retrying in ${Math.round(delay/1000)} seconds...`, 'warn');
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw new Error(`Deployment failed after ${MAX_DEPLOY_ATTEMPTS} attempts: ${error.message}`);
        }
      }

      attempt++;
    }

    if (!deployed) {
      throw new Error('Deployment failed');
    }
  }

  /**
   * Map suite name to test file path
   */
  getTestFile(suiteName) {
    const service = suiteName.split('_').slice(1).join('_');
    const version = suiteName.split('_')[0];

    // Special cases
    if (suiteName.startsWith('v1_auth')) {
      return 'tests/v1/auth.test.ts';
    }
    if (suiteName === 'v2_alerts') {
      return null; // Deployment only, no tests
    }

    // Map service names to test files
    const serviceMap = {
      firestore: `tests/${version}/firestore.test.ts`,
      database: `tests/${version}/database.test.ts`,
      pubsub: `tests/${version}/pubsub.test.ts`,
      storage: `tests/${version}/storage.test.ts`,
      tasks: `tests/${version}/tasks.test.ts`,
      remoteconfig: version === 'v1' ? 'tests/v1/remoteconfig.test.ts' : 'tests/v2/remoteConfig.test.ts',
      testlab: version === 'v1' ? 'tests/v1/testlab.test.ts' : 'tests/v2/testLab.test.ts',
      scheduler: 'tests/v2/scheduler.test.ts',
      identity: 'tests/v2/identity.test.ts',
      eventarc: 'tests/v2/eventarc.test.ts'
    };

    return serviceMap[service] || null;
  }

  /**
   * Run tests for deployed functions
   */
  async runTests(suiteNames) {
    this.log('🧪 Running tests...', 'info');

    // Check for service account
    if (!existsSync(SA_JSON_PATH)) {
      this.log('⚠️  Warning: sa.json not found. Tests may fail without proper authentication.', 'warn');
    }

    // Collect test files for all suites
    const testFiles = [];
    const seenFiles = new Set();
    let deployedFunctions = [];

    for (const suiteName of suiteNames) {
      // Track deployed auth functions
      if (suiteName === 'v1_auth_nonblocking') {
        deployedFunctions.push('onCreate', 'onDelete');
      } else if (suiteName === 'v1_auth_before_create') {
        deployedFunctions.push('beforeCreate');
      } else if (suiteName === 'v1_auth_before_signin') {
        deployedFunctions.push('beforeSignIn');
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
      this.log('⚠️  No test files found for the generated suites.', 'warn');
      this.log('   Skipping test execution (deployment-only suites).', 'success');
      return;
    }

    // Run Jest tests
    const env = {
      TEST_RUN_ID: this.testRunId,
      PROJECT_ID: this.projectId,
      REGION: this.region,
      DEPLOYED_FUNCTIONS: deployedFunctions.join(','),
      ...process.env
    };

    if (existsSync(SA_JSON_PATH)) {
      env.GOOGLE_APPLICATION_CREDENTIALS = SA_JSON_PATH;
    }

    this.log(`Running tests: ${testFiles.join(', ')}`, 'info');
    this.log(`TEST_RUN_ID: ${this.testRunId}`, 'info');

    await this.exec(`npm test -- ${testFiles.join(' ')}`, { env });
  }

  /**
   * Clean up deployed functions and test data
   */
  async cleanup() {
    this.log('🧹 Running cleanup...', 'warn');

    const metadataPath = join(GENERATED_DIR, '.metadata.json');
    if (!existsSync(metadataPath)) {
      this.log('   No metadata found, skipping cleanup', 'warn');
      return;
    }

    const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));

    // Only delete functions if deployment was successful
    if (this.deploymentSuccess) {
      await this.cleanupFunctions(metadata);
    }

    // Clean up test data
    await this.cleanupTestData(metadata);

    // Clean up generated files
    this.log('   Cleaning up generated files...', 'warn');
    if (existsSync(GENERATED_DIR)) {
      rmSync(GENERATED_DIR, { recursive: true, force: true });
      mkdirSync(GENERATED_DIR, { recursive: true });
    }
  }

  /**
   * Delete deployed functions
   */
  async cleanupFunctions(metadata) {
    this.log('   Deleting deployed functions...', 'warn');

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
          `firebase functions:delete ${functionName} --project ${metadata.projectId} --region ${metadata.region || DEFAULT_REGION} --force`,
          { silent: true }
        );
        this.log(`   Deleted function: ${functionName}`);
      } catch (error) {
        // Try gcloud as fallback
        try {
          await this.exec(
            `gcloud functions delete ${functionName} --region=${metadata.region || DEFAULT_REGION} --project=${metadata.projectId} --quiet`,
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
    this.log('   Cleaning up Firestore test data...', 'warn');

    // Extract collection names from metadata
    const collections = new Set();

    for (const suite of metadata.suites || []) {
      for (const func of suite.functions || []) {
        if (func.collection) {
          collections.add(func.collection);
        }
        // Also add function name without TEST_RUN_ID as collection
        const baseName = func.name ? func.name.replace(this.testRunId, '') : null;
        if (baseName && baseName.includes('Tests')) {
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
    if (metadata.suites.some(s => s.name.includes('auth') || s.name.includes('identity'))) {
      this.log('   Cleaning up auth test users...', 'warn');
      try {
        await this.exec(
          `node ${join(__dirname, 'cleanup-auth-users.cjs')} ${this.testRunId}`,
          { silent: true }
        );
      } catch (e) {
        // Ignore cleanup errors
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
    this.log(`✓ Saved artifact for future cleanup: ${this.testRunId}.json`, 'success');
  }

  /**
   * Clean up existing test resources before running
   */
  async cleanupExistingResources() {
    this.log('🧹 Checking for existing test functions...', 'warn');

    const projects = ['functions-integration-tests', 'functions-integration-tests-v2'];

    for (const projectId of projects) {
      this.log(`   Checking project: ${projectId}`, 'warn');

      try {
        // List functions and find test functions
        const result = await this.exec(
          `firebase functions:list --project ${projectId}`,
          { silent: true }
        );

        const testFunctions = result.stdout
          .split('\n')
          .filter(line => line.match(/Test.*t[a-z0-9]{8,9}/))
          .map(line => line.split(/\s+/)[0])
          .filter(Boolean);

        if (testFunctions.length > 0) {
          this.log(`   Found ${testFunctions.length} test function(s) in ${projectId}. Cleaning up...`, 'warn');

          for (const func of testFunctions) {
            try {
              await this.exec(
                `firebase functions:delete ${func} --project ${projectId} --region ${DEFAULT_REGION} --force`,
                { silent: true }
              );
              this.log(`   Deleted: ${func}`);
            } catch (e) {
              // Try gcloud as fallback
              try {
                await this.exec(
                  `gcloud functions delete ${func} --project ${projectId} --region ${DEFAULT_REGION} --quiet`,
                  { silent: true }
                );
              } catch (err) {
                // Ignore
              }
            }
          }
        } else {
          this.log(`   ✅ No test functions found in ${projectId}`, 'success');
        }
      } catch (e) {
        // Project might not be accessible
      }
    }

    // Clean up generated directory
    if (existsSync(GENERATED_DIR)) {
      this.log('   Cleaning up generated directory...', 'warn');
      rmSync(GENERATED_DIR, { recursive: true, force: true });
    }
  }

  /**
   * Run a single suite
   */
  async runSuite(suiteName) {
    const suiteLog = join(LOGS_DIR, `${suiteName}-${this.timestamp}.log`);

    this.log('═══════════════════════════════════════════════════════════', 'info');
    this.log(`🚀 Running suite: ${suiteName}`, 'success');
    this.log('═══════════════════════════════════════════════════════════', 'info');
    this.log(`📝 Suite log: ${suiteLog}`, 'warn');

    try {
      // Generate functions
      const metadata = await this.generateFunctions([suiteName]);

      // Find this suite's specific projectId and region
      const suiteMetadata = metadata.suites.find(s => s.name === suiteName);
      if (suiteMetadata) {
        this.projectId = suiteMetadata.projectId || metadata.projectId;
        this.region = suiteMetadata.region || metadata.region || DEFAULT_REGION;
        this.log(`   Using project: ${this.projectId}, region: ${this.region}`, 'info');
      }

      // Build functions
      await this.buildFunctions();

      // Deploy functions
      await this.deployFunctions();

      // Run tests
      await this.runTests([suiteName]);

      this.results.passed.push(suiteName);
      this.log(`✅ Suite ${suiteName} completed successfully`, 'success');
      return true;
    } catch (error) {
      this.results.failed.push(suiteName);
      this.log(`❌ Suite ${suiteName} failed: ${error.message}`, 'error');
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
    this.log('═══════════════════════════════════════════════════════════', 'info');
    this.log('🚀 Starting Sequential Test Suite Execution', 'success');
    this.log('═══════════════════════════════════════════════════════════', 'info');
    this.log(`📋 Test Run ID: ${this.testRunId}`, 'success');
    this.log(`📝 Main log: ${this.logFile}`, 'warn');
    this.log(`📁 Logs directory: ${LOGS_DIR}`, 'warn');
    this.log('');

    this.log(`📋 Running ${suiteNames.length} suite(s) sequentially:`, 'success');
    for (const suite of suiteNames) {
      this.log(`   - ${suite}`);
    }
    this.log('');

    // Clean up existing resources unless skipped
    if (!this.skipCleanup) {
      await this.cleanupExistingResources();
    }

    // Pack the SDK once for all suites (unless using published SDK)
    if (!this.usePublishedSDK && !this.sdkTarballPath) {
      this.log('📦 Packing SDK once for all suites...', 'info');
      this.sdkTarballPath = await this.packLocalSDK();
      this.log(`✓ SDK packed and will be reused for all suites`, 'success');
    }

    // Run each suite
    for (const suite of suiteNames) {
      await this.runSuite(suite);
      this.log('');
    }

    // Final summary
    this.printSummary();
  }

  /**
   * Run multiple suites in parallel
   */
  async runParallel(suiteNames) {
    this.log('═══════════════════════════════════════════════════════════', 'info');
    this.log('🚀 Running Test Suite(s)', 'success');
    this.log('═══════════════════════════════════════════════════════════', 'info');
    this.log(`📋 Test Run ID: ${this.testRunId}`, 'success');
    this.log('');

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
      this.log(`📊 Found ${projectCount} different projects. Running each group separately:`, 'warn');
      for (const [projectId, suites] of Object.entries(suitesByProject)) {
        this.log(`   - ${projectId}: ${suites.join(', ')}`);
      }
      this.log('');

      // Run each project group separately
      for (const [projectId, projectSuites] of Object.entries(suitesByProject)) {
        this.log(`🚀 Running suites for project: ${projectId}`, 'info');

        // Set project context for this group
        this.projectId = projectId;
        const suiteMetadata = metadata.suites.find(s => projectSuites.includes(s.name));
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
          this.log(`❌ Tests failed for ${projectId}: ${error.message}`, 'error');
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
        this.log('✅ All tests passed!', 'success');
      } catch (error) {
        this.results.failed = suiteNames;
        this.log(`❌ Tests failed: ${error.message}`, 'error');
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
    this.log('═══════════════════════════════════════════════════════════', 'info');
    this.log('📊 Test Suite Summary', 'success');
    this.log('═══════════════════════════════════════════════════════════', 'info');
    this.log(`✅ Passed: ${this.results.passed.length} suite(s)`, 'success');
    this.log(`❌ Failed: ${this.results.failed.length} suite(s)`, 'error');

    if (this.results.failed.length > 0) {
      this.log(`Failed suites: ${this.results.failed.join(', ')}`, 'error');
      this.log(`📝 Check individual suite logs in: ${LOGS_DIR}`, 'warn');
    } else {
      this.log('🎉 All suites passed!', 'success');
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
    filter: '',
    exclude: '',
    testRunId: null,
    usePublishedSDK: null,
    list: false,
    help: false
  };

  const suitePatterns = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--list') {
      options.list = true;
    } else if (arg === '--sequential') {
      options.sequential = true;
    } else if (arg === '--save-artifact') {
      options.saveArtifact = true;
    } else if (arg === '--skip-cleanup') {
      options.skipCleanup = true;
    } else if (arg.startsWith('--filter=')) {
      options.filter = arg.split('=')[1];
    } else if (arg.startsWith('--exclude=')) {
      options.exclude = arg.split('=')[1];
    } else if (arg.startsWith('--test-run-id=')) {
      options.testRunId = arg.split('=')[1];
    } else if (arg.startsWith('--use-published-sdk=')) {
      options.usePublishedSDK = arg.split('=')[1];
    } else if (!arg.startsWith('-')) {
      suitePatterns.push(arg);
    }
  }

  // Show help
  if (options.help || (args.length === 0 && !options.list)) {
    console.log(chalk.blue('Usage: node run-tests.js [suites...] [options]'));
    console.log('');
    console.log('Examples:');
    console.log('  node run-tests.js v1_firestore                    # Single suite');
    console.log('  node run-tests.js v1_firestore v2_database       # Multiple suites');
    console.log('  node run-tests.js "v1_*"                         # All v1 suites (pattern)');
    console.log('  node run-tests.js --sequential "v2_*"            # Sequential execution');
    console.log('  node run-tests.js --filter=v2 --exclude=auth     # Filter suites');
    console.log('  node run-tests.js --list                         # List available suites');
    console.log('');
    console.log('Options:');
    console.log('  --sequential              Run suites sequentially instead of in parallel');
    console.log('  --filter=PATTERN          Only run suites matching pattern');
    console.log('  --exclude=PATTERN         Skip suites matching pattern');
    console.log('  --test-run-id=ID          Use specific TEST_RUN_ID');
    console.log('  --use-published-sdk=VER   Use published SDK version instead of local (default: pack local)');
    console.log('  --save-artifact           Save test metadata for future cleanup');
    console.log('  --skip-cleanup            Skip pre-run cleanup (sequential mode only)');
    console.log('  --list                    List all available suites');
    console.log('  --help, -h                Show this help message');
    process.exit(0);
  }

  // List suites
  if (options.list) {
    const runner = new TestRunner();
    const allSuites = runner.getAllSuites();

    console.log(chalk.blue('\nAvailable test suites:'));
    console.log(chalk.blue('─────────────────────'));

    const v1Suites = allSuites.filter(s => s.startsWith('v1_'));
    const v2Suites = allSuites.filter(s => s.startsWith('v2_'));

    if (v1Suites.length > 0) {
      console.log(chalk.green('\n📁 V1 Suites:'));
      v1Suites.forEach(suite => console.log(`  - ${suite}`));
    }

    if (v2Suites.length > 0) {
      console.log(chalk.green('\n📁 V2 Suites:'));
      v2Suites.forEach(suite => console.log(`  - ${suite}`));
    }

    process.exit(0);
  }

  // Create runner instance
  const runner = new TestRunner(options);

  // Get filtered suite list
  let suites;
  if (suitePatterns.length === 0 && options.sequential) {
    // No patterns specified in sequential mode, run all suites
    suites = runner.getAllSuites();
    if (options.filter) {
      suites = suites.filter(s => s.includes(options.filter));
    }
    if (options.exclude) {
      suites = suites.filter(s => !s.match(new RegExp(options.exclude)));
    }
  } else {
    suites = runner.filterSuites(suitePatterns);
  }

  if (suites.length === 0) {
    console.log(chalk.red('❌ No test suites found matching criteria'));
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
process.on('unhandledRejection', (error) => {
  console.error(chalk.red('❌ Unhandled error:'), error);
  process.exit(1);
});

// Run main function
main();