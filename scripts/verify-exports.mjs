import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

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

console.log(`Found ${entryPoints.length} entry points to verify.`);

let hasError = false;

async function verify() {
  console.log('\n--- Verifying Entry Points (CJS & ESM) ---');
  for (const exp of entryPoints) {
    const importPath = exp === '.' ? 'firebase-functions' : `firebase-functions/${exp.replace('./', '')}`;

    try {
      require(importPath);
      console.log(`✅ CJS: ${importPath}`);
    } catch (e) {
      console.error(`❌ CJS Failed: ${importPath}`, e.message);
      hasError = true;
    }

    try {
      await import(importPath);
      console.log(`✅ ESM: ${importPath}`);
    } catch (e) {
      console.error(`❌ ESM Failed: ${importPath}`, e.message);
      hasError = true;
    }
  }

  if (hasError) {
    console.error('\n❌ Verification failed with errors.');
    process.exit(1);
  } else {
    console.log('\n✨ All entry points verified successfully!');
  }
}

verify();
