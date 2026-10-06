import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Read the package.json of the INSTALLED package to verify what was actually packed
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

console.log('\n--- Verifying package.json exports & typesVersions parity ---');

const rootTypes = (pkg.types || '').replace(/^\.\//, '');
const rootExportTypes = (exportsMap['.']?.types || '').replace(/^\.\//, '');
if (rootTypes !== rootExportTypes) {
  console.error(
    `❌ Root "types" (${pkg.types}) does not match exports["."].types (${exportsMap['.']?.types})`
  );
  hasError = true;
}

for (const [exp, targets] of Object.entries(exportsMap)) {
  if (typeof targets === 'object' && targets !== null) {
    for (const [condition, relPath] of Object.entries(targets)) {
      const fullPath = path.resolve(pkgRoot, relPath);
      if (!fs.existsSync(fullPath)) {
        console.error(`❌ Missing packed file for exports["${exp}"].${condition}: ${relPath}`);
        hasError = true;
      }
    }
  }

  if (exp === '.') {
    continue;
  }

  const subpath = exp.replace(/^\.\//, '');
  const expectedTv = (targets.types || '').replace(/^\.\//, '').replace(/\.d\.ts$/, '');
  const actualTv = typesVersionsMap[subpath]?.[0];

  if (!actualTv) {
    console.error(`❌ Missing typesVersions["*"]["${subpath}"] entry (expected "${expectedTv}")`);
    hasError = true;
  } else if (actualTv !== expectedTv) {
    console.error(
      `❌ Mismatched typesVersions["*"]["${subpath}"]: got "${actualTv}", expected "${expectedTv}"`
    );
    hasError = true;
  }
}

for (const tvKey of Object.keys(typesVersionsMap)) {
  if (tvKey === '*') {
    continue;
  }
  if (!exportsMap[`./${tvKey}`]) {
    console.error(`❌ Stale typesVersions["*"]["${tvKey}"] entry has no matching "./${tvKey}" in exports`);
    hasError = true;
  }
}

if (!hasError) {
  console.log('✅ package.json exports and typesVersions are in sync and all target files exist.');
}

// Filter out non-code entrypoints (e.g. package.json if it were exported)
const entryPoints = exportKeys.filter((e) => !e.endsWith('.json'));

const importLines = [];
for (const [i, exp] of entryPoints.entries()) {
  const importPath =
    exp === '.' ? 'firebase-functions' : `firebase-functions/${exp.replace(/^\.\//, '')}`;
  importLines.push(`import * as m${i} from '${importPath}';`);
}

const tscPath = path.resolve(process.cwd(), 'node_modules/typescript/bin/tsc');

const configs = [
  {
    label: 'CJS Legacy (moduleResolution: node / typesVersions)',
    file: 'verify-types.ts',
    args: [
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
    file: 'verify-types.mts',
    args: [
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

console.log(`\n--- Verifying TypeScript Declarations (${importLines.length} entry points) ---`);

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
      '  3. Public signatures leaking types from devDependencies'
  );
  process.exit(1);
}

console.log('\n✨ All TypeScript declarations verified successfully!');
