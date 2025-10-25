#!/usr/bin/env node

/**
 * Adds .js extensions to relative imports in TypeScript files
 * Usage: node scripts/add-js-extensions.js
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all TypeScript files in src/
const files = glob.sync('src/**/*.ts', {
  cwd: path.join(__dirname, '..'),
  absolute: true
});

console.log(`Found ${files.length} TypeScript files`);

let totalChanges = 0;

files.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf8');
  let modified = content;
  let fileChanges = 0;

  // Match relative imports and add .js extension
  // Handles: from './foo', from "../foo", from './foo/bar'
  // Does NOT match: from 'module-name', from '@scope/package'

  // Pattern explanation:
  // from\s*['"](\.\.?\/[^'"]+)['"]
  // - from\s* : 'from' keyword followed by optional whitespace
  // - ['"] : opening quote (single or double)
  // - (\.\.?\/ : capture group starting with ./ or ../
  // - [^'"]+ : one or more characters that aren't quotes
  // - ) : end capture group
  // - ['"] : closing quote

  modified = modified.replace(
    /from\s*(['"])(\.\.?\/[^'"]+)(['"])/g,
    (match, quote1, importPath, quote2) => {
      // Don't add .js if it already has an extension
      if (/\.[a-z]+$/.test(importPath)) {
        return match;
      }

      fileChanges++;
      return `from ${quote1}${importPath}.js${quote2}`;
    }
  );

  if (fileChanges > 0) {
    fs.writeFileSync(filePath, modified, 'utf8');
    console.log(`✓ ${path.relative(process.cwd(), filePath)} - ${fileChanges} change(s)`);
    totalChanges += fileChanges;
  }
});

console.log(`\nTotal: ${totalChanges} imports updated across ${files.length} files`);
