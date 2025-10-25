#!/usr/bin/env node

/**
 * Updates package.json exports to use dual CJS/ESM format
 */

const fs = require('fs');
const path = require('path');

const pkgPath = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

// Update main fields
pkg.main = 'lib/cjs/v2/index.js';
pkg.bin['firebase-functions'] = './lib/cjs/bin/firebase-functions.js';
pkg.types = 'lib/cjs/v2/index.d.ts';

// Convert exports to conditional exports
const newExports = {};

for (const [key, value] of Object.entries(pkg.exports)) {
  // Extract the path after lib/
  const relativePath = value.replace('./lib/', '');

  newExports[key] = {
    "import": {
      "types": `./lib/cjs/${relativePath.replace('.js', '.d.ts')}`,
      "default": `./lib/esm/${relativePath.replace('.js', '.mjs')}`
    },
    "require": {
      "types": `./lib/cjs/${relativePath.replace('.js', '.d.ts')}`,
      "default": `./lib/cjs/${relativePath}`
    }
  };
}

pkg.exports = newExports;

// Write back
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
console.log('✓ Updated package.json exports for dual CJS/ESM');
