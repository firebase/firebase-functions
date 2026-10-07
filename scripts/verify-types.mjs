import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Verifies that the packed `firebase-functions` npm package provides valid,
 * complete TypeScript declaration (`.d.ts`) files for downstream consumers.
 *
 * This script runs in two passes from `scripts/test-packaging.sh`:
 *   - Pass 1 (`node verify-types.mjs`):
 *     1. Validates `package.json` metadata (`exports` vs `typesVersions` parity and file existence).
 *     2. Compiles all core entrypoints when optional peer dependencies (`graphql`) are absent.
 *   - Pass 2 (`node verify-types.mjs --only-optional-peers`):
 *     Compiles entrypoints that require optional peer dependencies (`dataconnect/graphql`)
 *     after `graphql` is installed.
 */

const OPTIONAL_PEER_ENTRYPOINTS = new Set([
  'firebase-functions/dataconnect/graphql',
  'firebase-functions/v2/dataconnect/graphql',
]);

const onlyOptionalPeers = process.argv.includes('--only-optional-peers');

// Read the package.json of the INSTALLED package inside node_modules to verify what was packed
const pkgRoot = path.resolve(process.cwd(), 'node_modules/firebase-functions');
const pkgPath = path.join(pkgRoot, 'package.json');
if (!fs.existsSync(pkgPath)) {
  console.error(`❌ Could not find installed package at ${pkgPath}`);
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const exportsMap = pkg.exports || {};
const typesVersionsMap = pkg.typesVersions?.['*'] || {};
const exportKeys = Object.keys(exportsMap);

let hasError = false;

// Step 1: Verify `package.json` metadata parity between `exports` (used by modern Node/ESM
// resolvers) and `typesVersions` (used by legacy CommonJS `--moduleResolution node` projects).
if (!onlyOptionalPeers) {
  console.log('\n--- Verifying package.json exports & typesVersions parity ---');

  const rootTypes = (pkg.types || '').replace(/^\.\//, '');
  const rootExportTypes = (exportsMap['.']?.types || '').replace(/^\.\//, '');
  if (!rootTypes || rootTypes !== rootExportTypes) {
    console.error(
      `❌ Root "types" (${pkg.types}) does not match exports["."].types (${exportsMap['.']?.types})`
    );
    hasError = true;
  }

  for (const [exportSubpath, targets] of Object.entries(exportsMap)) {
    if (exportSubpath.endsWith('.json')) {
      continue;
    }

    if (typeof targets === 'object' && targets !== null) {
      // Node.js and TypeScript require "types" to be the first key in each export target object.
      const conditionKeys = Object.keys(targets);
      if (conditionKeys[0] !== 'types') {
        console.error(
          `❌ exports["${exportSubpath}"] must list "types" as its first condition (got "${conditionKeys[0]}")`
        );
        hasError = true;
      }

      // Ensure every file path referenced by `exports` was actually included in the packed tarball.
      for (const [condition, relPath] of Object.entries(targets)) {
        const fullPath = path.resolve(pkgRoot, relPath);
        if (!fs.existsSync(fullPath)) {
          console.error(
            `❌ Missing packed file for exports["${exportSubpath}"].${condition}: ${relPath}`
          );
          hasError = true;
        }
      }
    }

    if (exportSubpath === '.') {
      continue;
    }

    const subpath = exportSubpath.replace(/^\.\//, '');
    const expectedTypesVersion = (targets.types || '').replace(/^\.\//, '').replace(/\.d\.ts$/, '');
    const actualTypesVersion = typesVersionsMap[subpath]?.[0];

    if (!actualTypesVersion) {
      console.error(
        `❌ Missing typesVersions["*"]["${subpath}"] entry (expected "${expectedTypesVersion}")`
      );
      hasError = true;
    } else if (actualTypesVersion !== expectedTypesVersion) {
      console.error(
        `❌ Mismatched typesVersions["*"]["${subpath}"]: got "${actualTypesVersion}", expected "${expectedTypesVersion}"`
      );
      hasError = true;
    }
  }

  // Ensure `typesVersions` does not retain dead/stale entries that no longer exist in `exports`.
  for (const typesVersionKey of Object.keys(typesVersionsMap)) {
    if (typesVersionKey === '*') {
      continue;
    }
    if (!exportsMap[`./${typesVersionKey}`]) {
      console.error(
        `❌ Stale typesVersions["*"]["${typesVersionKey}"] entry has no matching "./${typesVersionKey}" in exports`
      );
      hasError = true;
    }
  }

  if (!hasError) {
    console.log('✅ package.json exports and typesVersions are in sync and all target files exist.');
  } else {
    console.error('❌ package.json exports and typesVersions parity check failed.');
  }
}

// Step 2: Generate a synthetic consumer source file importing the target public entrypoints.
const entryPoints = exportKeys.filter((key) => !key.endsWith('.json'));

const importLines = [];
for (const [i, exportSubpath] of entryPoints.entries()) {
  const importPath =
    exportSubpath === '.'
      ? 'firebase-functions'
      : `firebase-functions/${exportSubpath.replace(/^\.\//, '')}`;
  const isOptionalPeer = OPTIONAL_PEER_ENTRYPOINTS.has(importPath);
  if (onlyOptionalPeers ? !isOptionalPeer : isOptionalPeer) {
    continue;
  }
  importLines.push(`import * as m${i} from '${importPath}';`);
}

const tscPath = path.resolve(process.cwd(), 'node_modules/typescript/bin/tsc');

// Step 3: Run `tsc --noEmit --skipLibCheck false --strict` across all 3 real-world module
// resolution modes so every `.d.ts` file and internal import is type-checked:
//   - `.ts` with `--moduleResolution node`: exercises `typesVersions` (legacy CJS projects)
//   - `.mts` with `--moduleResolution nodenext`: exercises `exports[...].import` (ESM projects)
//   - `.cts` with `--moduleResolution nodenext`: exercises `exports[...].require` (modern CJS projects)
const configs = [
  {
    label: 'CJS Legacy (moduleResolution: node / typesVersions)',
    file: 'verify-types.ts',
    args: [
      '--noEmit',
      '--skipLibCheck',
      'false',
      '--strict',
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
    label: 'ESM (moduleResolution: nodenext / exports.import)',
    file: 'verify-types.mts',
    args: [
      '--noEmit',
      '--skipLibCheck',
      'false',
      '--strict',
      '--module',
      'nodenext',
      '--moduleResolution',
      'nodenext',
      '--target',
      'es2022',
    ],
  },
  {
    label: 'CJS Modern (moduleResolution: nodenext / exports.require)',
    file: 'verify-types.cts',
    args: [
      '--noEmit',
      '--skipLibCheck',
      'false',
      '--strict',
      '--module',
      'nodenext',
      '--moduleResolution',
      'nodenext',
      '--target',
      'es2022',
    ],
  },
];

const scopeLabel = onlyOptionalPeers ? 'optional-peer entry points' : 'core entry points';
console.log(`\n--- Verifying TypeScript Declarations (${importLines.length} ${scopeLabel}) ---`);

for (const { label, file, args } of configs) {
  const consumerFile = path.resolve(process.cwd(), file);
  fs.writeFileSync(consumerFile, `${importLines.join('\n')}\n`);
  try {
    execFileSync(process.execPath, [tscPath, file, ...args], { stdio: 'inherit' });
    console.log(`✅ TypeScript check passed: ${label}`);
  } catch (_err) {
    console.error(`❌ TypeScript check failed: ${label}`);
    hasError = true;
  } finally {
    if (fs.existsSync(consumerFile)) {
      fs.unlinkSync(consumerFile);
    }
  }
}

if (hasError) {
  console.error(
    '\n❌ TypeScript declaration verification failed.\n' +
      'Check for:\n' +
      '  1. Public .d.ts files importing types marked @internal (stripped by tsconfig.release.json)\n' +
      '  2. Missing, stale, or mismatched "types" / "typesVersions" paths in package.json\n' +
      '  3. Public signatures leaking types from devDependencies or unguarded optional peerDependencies'
  );
  process.exit(1);
}

console.log(`\n✨ All ${scopeLabel} verified successfully!`);
