#!/usr/bin/env node

/**
 * Function Generator Script
 * Generates Firebase Functions from unified YAML configuration using templates
 */

import Handlebars from "handlebars";
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { getSuiteConfig, getSuitesByPattern, listAvailableSuites } from "./config-loader.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = dirname(__dirname);

// Register Handlebars helpers
Handlebars.registerHelper("eq", (a, b) => a === b);
Handlebars.registerHelper("or", (a, b) => a || b);
Handlebars.registerHelper("unless", function (conditional, options) {
  if (!conditional) {
    return options.fn(this);
  }
  return options.inverse(this);
});

/**
 * Generate Firebase Functions from templates
 * @param {string[]} suitePatterns - Array of suite names or patterns
 * @param {Object} options - Generation options
 * @param {string} [options.testRunId] - Test run ID to use
 * @param {string} [options.configPath] - Path to config file
 * @param {string} [options.projectId] - Override project ID
 * @param {string} [options.region] - Override region
 * @param {string} [options.sdkTarball] - Path to SDK tarball
 * @param {boolean} [options.quiet] - Suppress console output
 * @returns {Promise<Object>} - Metadata about generated functions
 */
export async function generateFunctions(suitePatterns, options = {}) {
  const {
    testRunId = `t${Math.random().toString(36).substring(2, 10)}`,
    configPath: initialConfigPath = null,
    projectId: overrideProjectId = process.env.PROJECT_ID,
    region: overrideRegion = process.env.REGION,
    sdkTarball = process.env.SDK_TARBALL || "file:firebase-functions-local.tgz",
    quiet = false,
  } = options;

  const log = quiet ? () => {} : console.log.bind(console);
  const error = quiet ? () => {} : console.error.bind(console);

  log(`🚀 Generating suites: ${suitePatterns.join(", ")}`);
  log(`   TEST_RUN_ID: ${testRunId}`);

  // Load suite configurations
  const suites = [];
  let projectId, region;
  let configPath = initialConfigPath;

  for (const pattern of suitePatterns) {
    try {
      let suitesToAdd = [];

      // Check if it's a pattern (contains * or ?)
      if (pattern.includes("*") || pattern.includes("?")) {
        // If no config path specified, try to auto-detect based on pattern
        if (!configPath) {
          if (pattern.startsWith("v1")) {
            configPath = join(ROOT_DIR, "config", "v1", "suites.yaml");
          } else if (pattern.startsWith("v2")) {
            configPath = join(ROOT_DIR, "config", "v2", "suites.yaml");
          } else {
            throw new Error(
              `Cannot auto-detect config file for pattern '${pattern}'. Use --config option.`
            );
          }
        }
        suitesToAdd = getSuitesByPattern(pattern, configPath);
      } else {
        // Single suite name
        if (!configPath) {
          // Auto-detect config based on suite name
          if (pattern.startsWith("v1_")) {
            configPath = join(ROOT_DIR, "config", "v1", "suites.yaml");
          } else if (pattern.startsWith("v2_")) {
            configPath = join(ROOT_DIR, "config", "v2", "suites.yaml");
          } else {
            throw new Error(
              `Cannot auto-detect config file for suite '${pattern}'. Use --config option.`
            );
          }
        }
        suitesToAdd = [getSuiteConfig(pattern, configPath)];
      }

      // Add suites and extract project/region from first suite
      for (const suite of suitesToAdd) {
        if (!projectId) {
          projectId = suite.projectId || overrideProjectId || "demo-test";
          region = suite.region || overrideRegion || "us-central1";
        }
        suites.push(suite);
      }

      // Reset configPath for next pattern (allows mixing v1 and v2)
      if (!initialConfigPath) {
        configPath = null;
      }
    } catch (err) {
      error(`❌ Error loading suite(s) '${pattern}': ${err.message}`);
      throw err;
    }
  }

  if (suites.length === 0) {
    throw new Error("No suites found to generate");
  }

  log(`   PROJECT_ID: ${projectId}`);
  log(`   REGION: ${region}`);
  log(`   Loaded ${suites.length} suite(s)`);

  // Helper function to generate from template
  function generateFromTemplate(templatePath, outputPath, context) {
    const fullTemplatePath = join(ROOT_DIR, "templates", templatePath);
    if (!existsSync(fullTemplatePath)) {
      error(`❌ Template not found: ${fullTemplatePath}`);
      return false;
    }

    const templateContent = readFileSync(fullTemplatePath, "utf8");
    const template = Handlebars.compile(templateContent);
    const output = template(context);

    const outputFullPath = join(ROOT_DIR, "generated", outputPath);
    mkdirSync(dirname(outputFullPath), { recursive: true });
    writeFileSync(outputFullPath, output);
    log(`   ✅ Generated: ${outputPath}`);
    return true;
  }

  // Template mapping for service types and versions
  const templateMap = {
    firestore: {
      v1: "functions/src/v1/firestore-tests.ts.hbs",
      v2: "functions/src/v2/firestore-tests.ts.hbs",
    },
    database: {
      v1: "functions/src/v1/database-tests.ts.hbs",
      v2: "functions/src/v2/database-tests.ts.hbs",
    },
    pubsub: {
      v1: "functions/src/v1/pubsub-tests.ts.hbs",
      v2: "functions/src/v2/pubsub-tests.ts.hbs",
    },
    storage: {
      v1: "functions/src/v1/storage-tests.ts.hbs",
      v2: "functions/src/v2/storage-tests.ts.hbs",
    },
    auth: {
      v1: "functions/src/v1/auth-tests.ts.hbs",
      v2: "functions/src/v2/auth-tests.ts.hbs",
    },
    tasks: {
      v1: "functions/src/v1/tasks-tests.ts.hbs",
      v2: "functions/src/v2/tasks-tests.ts.hbs",
    },
    remoteconfig: {
      v1: "functions/src/v1/remoteconfig-tests.ts.hbs",
      v2: "functions/src/v2/remoteconfig-tests.ts.hbs",
    },
    testlab: {
      v1: "functions/src/v1/testlab-tests.ts.hbs",
      v2: "functions/src/v2/testlab-tests.ts.hbs",
    },
    scheduler: {
      v2: "functions/src/v2/scheduler-tests.ts.hbs",
    },
    identity: {
      v2: "functions/src/v2/identity-tests.ts.hbs",
    },
    eventarc: {
      v2: "functions/src/v2/eventarc-tests.ts.hbs",
    },
    alerts: {
      v2: "functions/src/v2/alerts-tests.ts.hbs",
    },
  };

  log("\n📁 Generating functions...");

  // Collect all dependencies from all suites
  const allDependencies = {};
  const allDevDependencies = {};

  // Generate test files for each suite
  const generatedSuites = [];
  for (const suite of suites) {
    const { name, service, version } = suite;

    // Select the appropriate template
    const templatePath = templateMap[service]?.[version];
    if (!templatePath) {
      error(`❌ No template found for service '${service}' version '${version}'`);
      error(`Available templates:`);
      Object.entries(templateMap).forEach(([svc, versions]) => {
        Object.keys(versions).forEach((ver) => {
          error(`  - ${svc} ${ver}`);
        });
      });
      continue; // Skip this suite but continue with others
    }

    log(`   📋 ${name}: Using service: ${service}, version: ${version}`);

    // Create context for this suite's template
    // The suite already has defaults applied from config-loader
    const context = {
      ...suite,
      testRunId,
      sdkTarball,
      timestamp: new Date().toISOString(),
      v1ProjectId: process.env.PROJECT_ID || "functions-integration-tests",
      v2ProjectId: process.env.PROJECT_ID || "functions-integration-tests",
    };

    // Generate the test file for this suite
    if (
      generateFromTemplate(templatePath, `functions/src/${version}/${service}-tests.ts`, context)
    ) {
      // Collect dependencies
      Object.assign(allDependencies, suite.dependencies || {});
      Object.assign(allDevDependencies, suite.devDependencies || {});

      // Track generated suite info for index.ts
      generatedSuites.push({
        name,
        service,
        version,
        projectId: suite.projectId, // Store projectId per suite
        region: suite.region, // Store region per suite
        functions: suite.functions.map((f) => `${f.name}${testRunId}`),
      });
    }
  }

  if (generatedSuites.length === 0) {
    throw new Error("No functions were generated");
  }

  // Generate shared files (only once)
  const sharedContext = {
    projectId,
    region,
    testRunId,
    sdkTarball,
    timestamp: new Date().toISOString(),
    dependencies: allDependencies,
    devDependencies: allDevDependencies,
  };

  // Generate utils.ts
  generateFromTemplate("functions/src/utils.ts.hbs", "functions/src/utils.ts", sharedContext);

  // Generate index.ts with all suites
  const indexContext = {
    projectId,
    suites: generatedSuites.map((s) => ({
      name: s.name,
      service: s.service,
      version: s.version,
    })),
  };

  generateFromTemplate("functions/src/index.ts.hbs", "functions/src/index.ts", indexContext);

  // Generate package.json with merged dependencies
  // Replace {{sdkTarball}} placeholder in all dependencies
  const processedDependencies = {};
  for (const [key, value] of Object.entries(allDependencies)) {
    if (typeof value === "string" && value.includes("{{sdkTarball}}")) {
      processedDependencies[key] = value.replace("{{sdkTarball}}", sdkTarball);
    } else {
      processedDependencies[key] = value;
    }
  }

  const packageContext = {
    ...sharedContext,
    dependencies: {
      ...processedDependencies,
      // Ensure we have the required dependencies
      "firebase-functions": processedDependencies["firebase-functions"] || sdkTarball,
      "firebase-admin": processedDependencies["firebase-admin"] || "^12.0.0",
    },
    devDependencies: allDevDependencies,
  };

  generateFromTemplate("functions/package.json.hbs", "functions/package.json", packageContext);

  // Generate tsconfig.json
  generateFromTemplate("functions/tsconfig.json.hbs", "functions/tsconfig.json", sharedContext);

  // Generate firebase.json
  generateFromTemplate("firebase.json.hbs", "firebase.json", sharedContext);

  // Write metadata for cleanup and reference
  const metadata = {
    projectId,
    region,
    testRunId,
    generatedAt: new Date().toISOString(),
    suites: generatedSuites,
  };

  writeFileSync(join(ROOT_DIR, "generated", ".metadata.json"), JSON.stringify(metadata, null, 2));

  // Copy the SDK tarball into the functions directory if using local SDK
  if (sdkTarball.startsWith("file:")) {
    const tarballSourcePath = join(ROOT_DIR, "firebase-functions-local.tgz");
    const tarballDestPath = join(
      ROOT_DIR,
      "generated",
      "functions",
      "firebase-functions-local.tgz"
    );

    if (existsSync(tarballSourcePath)) {
      copyFileSync(tarballSourcePath, tarballDestPath);
      log("   ✅ Copied SDK tarball to functions directory");
    } else {
      error(`   ⚠️  Warning: SDK tarball not found at ${tarballSourcePath}`);
      error(`      Run 'npm run pack-for-integration-tests' from the root directory first`);
    }
  }

  log("\n✨ Generation complete!");
  log(
    `   Generated ${generatedSuites.length} suite(s) with ${generatedSuites.reduce(
      (acc, s) => acc + s.functions.length,
      0
    )} function(s)`
  );
  log("\nNext steps:");
  log("  1. cd generated/functions && npm install");
  log("  2. npm run build");
  log(`  3. firebase deploy --project ${projectId}`);

  return metadata;
}

// CLI interface when run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  // Handle help
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log("Usage: node generate.js <suite-names...> [options]");
    console.log("\nExamples:");
    console.log("  node generate.js v1_firestore                     # Single suite");
    console.log("  node generate.js v1_firestore v1_database         # Multiple suites");
    console.log("  node generate.js 'v1_*'                          # All v1 suites (pattern)");
    console.log("  node generate.js 'v2_*'                          # All v2 suites (pattern)");
    console.log("  node generate.js --list                          # List available suites");
    console.log("  node generate.js --config config/v1/suites.yaml v1_firestore");
    console.log("\nOptions:");
    console.log("  --config <path>    Path to configuration file (default: auto-detect)");
    console.log("  --list            List all available suites");
    console.log("  --help, -h        Show this help message");
    console.log("\nEnvironment variables:");
    console.log("  TEST_RUN_ID       Override test run ID (default: auto-generated)");
    console.log("  PROJECT_ID        Override project ID from config");
    console.log("  REGION           Override region from config");
    console.log("  SDK_TARBALL      Path to Firebase Functions SDK tarball");
    process.exit(0);
  }

  // Handle --list option
  if (args.includes("--list")) {
    // Determine config path - check both v1 and v2
    const v1ConfigPath = join(ROOT_DIR, "config", "v1", "suites.yaml");
    const v2ConfigPath = join(ROOT_DIR, "config", "v2", "suites.yaml");

    console.log("\nAvailable test suites:");

    if (existsSync(v1ConfigPath)) {
      console.log("\n📁 V1 Suites (config/v1/suites.yaml):");
      const v1Suites = listAvailableSuites(v1ConfigPath);
      v1Suites.forEach((suite) => console.log(`  - ${suite}`));
    }

    if (existsSync(v2ConfigPath)) {
      console.log("\n📁 V2 Suites (config/v2/suites.yaml):");
      const v2Suites = listAvailableSuites(v2ConfigPath);
      v2Suites.forEach((suite) => console.log(`  - ${suite}`));
    }

    process.exit(0);
  }

  // Parse config path if provided
  let configPath = null;
  let usePublishedSDK = null;
  const configIndex = args.indexOf("--config");
  if (configIndex !== -1 && configIndex < args.length - 1) {
    configPath = args[configIndex + 1];
    args.splice(configIndex, 2); // Remove --config and path from args
  }

  // Check for --use-published-sdk
  const sdkIndex = args.findIndex((arg) => arg.startsWith("--use-published-sdk="));
  if (sdkIndex !== -1) {
    usePublishedSDK = args[sdkIndex].split("=")[1];
    args.splice(sdkIndex, 1);
  }

  // Remaining args are suite names/patterns
  const suitePatterns = args;

  // Determine SDK to use
  let sdkTarball = process.env.SDK_TARBALL;
  if (!sdkTarball) {
    if (usePublishedSDK) {
      sdkTarball = usePublishedSDK;
      console.log(`Using published SDK: ${sdkTarball}`);
    } else {
      // Default to local tarball
      sdkTarball = "file:firebase-functions-local.tgz";
      console.log("Using local firebase-functions tarball (default)");
    }
  }

  // Call the main function
  generateFunctions(suitePatterns, {
    testRunId: process.env.TEST_RUN_ID,
    configPath,
    projectId: process.env.PROJECT_ID,
    region: process.env.REGION,
    sdkTarball,
  })
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(`❌ ${error.message}`);
      process.exit(1);
    });
}
