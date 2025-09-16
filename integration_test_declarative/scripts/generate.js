#!/usr/bin/env node

import Handlebars from "handlebars";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { parse } from "yaml";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

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

// Get command line arguments (can now be multiple suites)
const suiteNames = process.argv.slice(2);
if (suiteNames.length === 0) {
  console.error("Usage: node generate.js <suite-name> [<suite-name> ...]");
  console.error("Example: node generate.js v1_firestore");
  console.error("Example: node generate.js v1_firestore v1_database v1_storage");
  process.exit(1);
}

// Generate unique TEST_RUN_ID if not provided (short to avoid 63-char function name limit)
// Note: Use hyphens for Cloud Tasks compatibility, but we need underscores for valid JS identifiers
// So we'll use a different format: just letters and numbers
const testRunId = process.env.TEST_RUN_ID || `t${Math.random().toString(36).substring(2, 10)}`;

console.log(`🚀 Generating ${suiteNames.length} suite(s): ${suiteNames.join(", ")}`);
console.log(`   TEST_RUN_ID: ${testRunId}`);

// Load all suite configurations
const suites = [];
let projectId, region;

for (const suiteName of suiteNames) {
  const configPath = join(ROOT_DIR, "config", "suites", `${suiteName}.yaml`);
  if (!existsSync(configPath)) {
    console.error(`❌ Suite configuration not found: ${configPath}`);
    process.exit(1);
  }

  const suiteConfig = parse(readFileSync(configPath, "utf8"));

  // Use first suite's project settings as defaults
  if (!projectId) {
    projectId = suiteConfig.suite.projectId || process.env.PROJECT_ID || "demo-test";
    region = suiteConfig.suite.region || process.env.REGION || "us-central1";
  }

  suites.push({
    name: suiteName,
    config: suiteConfig,
    service: suiteConfig.suite.service || "firestore",
    version: suiteConfig.suite.version || "v1",
  });
}

console.log(`   PROJECT_ID: ${projectId}`);
console.log(`   REGION: ${region}`);

const sdkTarball = process.env.SDK_TARBALL || "latest";

// Helper function to generate from template
function generateFromTemplate(templatePath, outputPath, context) {
  const templateContent = readFileSync(join(ROOT_DIR, "templates", templatePath), "utf8");
  const template = Handlebars.compile(templateContent);
  const output = template(context);

  const outputFullPath = join(ROOT_DIR, "generated", outputPath);
  mkdirSync(dirname(outputFullPath), { recursive: true });
  writeFileSync(outputFullPath, output);
  console.log(`   ✅ Generated: ${outputPath}`);
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
};

console.log("\n📁 Generating functions...");

// Collect all dependencies from all suites
const allDependencies = {};
const allDevDependencies = {};

// Generate test files for each suite
const generatedSuites = [];
for (const suite of suites) {
  const { name, config, service, version } = suite;

  // Select the appropriate template
  const templatePath = templateMap[service]?.[version];
  if (!templatePath) {
    console.error(`❌ No template found for service '${service}' version '${version}'`);
    console.error(`Available templates:`);
    Object.entries(templateMap).forEach(([svc, versions]) => {
      Object.keys(versions).forEach((ver) => {
        console.error(`  - ${svc} ${ver}`);
      });
    });
    process.exit(1);
  }

  console.log(`   📋 ${name}: Using service: ${service}, version: ${version}`);

  // Create context for this suite's template
  const context = {
    ...config.suite,
    service,
    version,
    testRunId,
    sdkTarball,
    projectId,
    region,
    timestamp: new Date().toISOString(),
  };

  // Generate the test file for this suite
  generateFromTemplate(templatePath, `functions/src/${version}/${service}-tests.ts`, context);

  // Collect dependencies
  Object.assign(allDependencies, config.suite.dependencies || {});
  Object.assign(allDevDependencies, config.suite.devDependencies || {});

  // Track generated suite info for index.ts
  generatedSuites.push({
    name,
    service,
    version,
    functions: config.suite.functions.map((f) => `${f.name}${testRunId}`),
  });
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
const packageContext = {
  ...sharedContext,
  dependencies: {
    ...allDependencies,
    // Replace SDK tarball placeholder
    "firebase-functions": sdkTarball,
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
console.log("\n✨ Generation complete!");
console.log("\nNext steps:");
console.log("  1. cd generated/functions && npm install");
console.log("  2. npm run build");
console.log("  3. firebase deploy --project", projectId);
