#!/usr/bin/env node

import Handlebars from 'handlebars';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { parse } from 'yaml';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = dirname(__dirname);

// Register Handlebars helpers
Handlebars.registerHelper('eq', (a, b) => a === b);
Handlebars.registerHelper('unless', function(conditional, options) {
  if (!conditional) {
    return options.fn(this);
  }
  return options.inverse(this);
});

// Get command line arguments
const suiteName = process.argv[2];
if (!suiteName) {
  console.error('Usage: node generate.js <suite-name>');
  console.error('Example: node generate.js v1_firestore');
  process.exit(1);
}

// Load suite configuration first to get project settings
const configPath = join(ROOT_DIR, 'config', 'suites', `${suiteName}.yaml`);
if (!existsSync(configPath)) {
  console.error(`❌ Suite configuration not found: ${configPath}`);
  process.exit(1);
}

const suiteConfig = parse(readFileSync(configPath, 'utf8'));

// Generate unique TEST_RUN_ID if not provided (short to avoid 63-char function name limit)
const testRunId = process.env.TEST_RUN_ID ||
  `t_${Math.random().toString(36).substring(2, 10)}`;

// Use projectId from suite config, then env var, then default
const projectId = suiteConfig.suite.projectId || process.env.PROJECT_ID || 'demo-test';
const region = suiteConfig.suite.region || process.env.REGION || 'us-central1';
const sdkTarball = process.env.SDK_TARBALL || 'file:../../firebase-functions-local.tgz';

console.log(`🚀 Generating suite: ${suiteName}`);
console.log(`   TEST_RUN_ID: ${testRunId}`);
console.log(`   PROJECT_ID: ${projectId} ${suiteConfig.suite.projectId ? '(from suite config)' : '(from env/default)'}`);
console.log(`   REGION: ${region} ${suiteConfig.suite.region ? '(from suite config)' : '(from env/default)'}`)

// Process dependencies to replace {{sdkTarball}} placeholder
const dependencies = { ...suiteConfig.suite.dependencies };
if (dependencies['firebase-functions'] === '{{sdkTarball}}') {
  dependencies['firebase-functions'] = sdkTarball;
}

// Prepare context for templates
const context = {
  ...suiteConfig.suite,
  dependencies,
  testRunId,
  projectId,
  region,
  sdkTarball,
  timestamp: new Date().toISOString()
};

// Helper function to generate from template
function generateFromTemplate(templatePath, outputPath, context) {
  const templateContent = readFileSync(
    join(ROOT_DIR, 'templates', templatePath),
    'utf8'
  );
  const template = Handlebars.compile(templateContent);
  const output = template(context);

  const outputFullPath = join(ROOT_DIR, 'generated', outputPath);
  mkdirSync(dirname(outputFullPath), { recursive: true });
  writeFileSync(outputFullPath, output);
  console.log(`   ✅ Generated: ${outputPath}`);
}

console.log('\n📁 Generating functions...');

// Generate function files
generateFromTemplate(
  'functions/src/v1/firestore-tests.ts.hbs',
  'functions/src/v1/firestore-tests.ts',
  context
);

// Generate utils (no templating needed, just copy)
generateFromTemplate(
  'functions/src/utils.ts.hbs',
  'functions/src/utils.ts',
  context
);

// Generate index.ts
generateFromTemplate(
  'functions/src/index.ts.hbs',
  'functions/src/index.ts',
  context
);

// Generate package.json
generateFromTemplate(
  'functions/package.json.hbs',
  'functions/package.json',
  context
);

// Generate tsconfig.json
generateFromTemplate(
  'functions/tsconfig.json.hbs',
  'functions/tsconfig.json',
  context
);

// Generate firebase.json
generateFromTemplate(
  'firebase.json.hbs',
  'firebase.json',
  context
);

// Write a metadata file for reference
const metadata = {
  suite: suiteName,
  testRunId,
  timestamp: Date.now(),  // Keep full timestamp here for tracking
  projectId,
  region,
  generatedAt: new Date().toISOString(),
  functions: suiteConfig.suite.functions.map(f => `${f.name}_${testRunId}`)
};

writeFileSync(
  join(ROOT_DIR, 'generated', '.metadata.json'),
  JSON.stringify(metadata, null, 2)
);

console.log('\n✨ Generation complete!');
console.log('\nNext steps:');
console.log('  1. cd generated/functions && npm install');
console.log('  2. npm run build');
console.log('  3. firebase deploy --project', projectId);