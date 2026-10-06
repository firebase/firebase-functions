import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const CONSUMER_TEST_FILE = 'verify-types.ts';
const OPTIONAL_PEER_ENTRYPOINTS = new Set([
  'firebase-functions/dataconnect/graphql',
  'firebase-functions/v2/dataconnect/graphql',
]);

// Read the package.json of the INSTALLED package to verify what was actually packed
const pkgPath = path.resolve(process.cwd(), 'node_modules/firebase-functions/package.json');
if (!fs.existsSync(pkgPath)) {
  console.error(`❌ Could not find installed package at ${pkgPath}`);
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const exports = Object.keys(pkg.exports || {});

// Filter out non-code entrypoints (e.g. package.json if it were exported)
const entryPoints = exports.filter(e => !e.endsWith('.json'));

const importLines = [];
for (const [i, exp] of entryPoints.entries()) {
  const importPath = exp === '.' ? 'firebase-functions' : `firebase-functions/${exp.replace(/^\.\//, '')}`;
  if (OPTIONAL_PEER_ENTRYPOINTS.has(importPath)) {
    continue;
  }
  importLines.push(`import * as m${i} from '${importPath}';`);
}

const consumerFile = path.resolve(process.cwd(), CONSUMER_TEST_FILE);
const tscPath = path.resolve(process.cwd(), 'node_modules/typescript/bin/tsc');

const configs = [
  {
    label: 'CJS (moduleResolution: node / typesVersions)',
    args: [
      CONSUMER_TEST_FILE,
      '--noEmit',
      '--skipLibCheck',
      'false',
      '--esModuleInterop',
      '--module',
      'commonjs',
      '--moduleResolution',
      'node',
      '--target',
      'es2022',
    ],
  },
  {
    label: 'ESM/Dual (moduleResolution: nodenext / exports.types)',
    args: [
      CONSUMER_TEST_FILE,
      '--noEmit',
      '--skipLibCheck',
      'false',
      '--module',
      'nodenext',
      '--moduleResolution',
      'nodenext',
      '--target',
      'es2022',
    ],
  },
];

let hasError = false;

fs.writeFileSync(consumerFile, `${importLines.join('\n')}\n`);
try {
  console.log(`\n--- Verifying TypeScript Declarations (${importLines.length} entry points) ---`);

  for (const { label, args } of configs) {
    try {
      execFileSync(process.execPath, [tscPath, ...args], { stdio: 'inherit' });
      console.log(`✅ TypeScript check passed: ${label}`);
    } catch (_err) {
      console.error(`❌ TypeScript check failed: ${label}`);
      hasError = true;
    }
  }
} finally {
  if (fs.existsSync(consumerFile)) {
    fs.unlinkSync(consumerFile);
  }
}

if (hasError) {
  console.error(
    '\n❌ TypeScript declaration verification failed.\n' +
      'Check for:\n' +
      '  1. Public .d.ts files importing types marked @internal (stripped by tsconfig.release.json)\n' +
      '  2. Missing or mismatched "types" / "typesVersions" paths in package.json\n' +
      '  3. Public signatures leaking types from devDependencies'
  );
  process.exit(1);
}

console.log('\n✨ All TypeScript declarations verified successfully!');
