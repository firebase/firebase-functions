/**
 * @license
 * Copyright 2019 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const { exec } = require('child-process-promise');
const fs = require('mz/fs');
const path = require('path');
const yargs = require('yargs');
const yaml = require('js-yaml');
const _ = require('lodash');

const repoPath = path.resolve(`${__dirname}/..`);

// Command-line options.
const { source: sourceFile } = yargs
  .option('source', {
    default: `${repoPath}/src`,
    describe: 'Typescript source file(s)',
    type: 'string'
  })
  .version(false)
  .help().argv;

const docPath = path.resolve(`${__dirname}/html`);
const contentPath = path.resolve(`${__dirname}/content-sources`);
const tempHomePath = path.resolve(`${contentPath}/HOME_TEMP.md`);
const devsitePath = `/docs/reference/functions/`;

const { JSDOM } = require("jsdom");

const typeMap = require('./type-aliases.json');

/**
 * Strips path prefix and returns only filename.
 * @param {string} path
 */
function stripPath(path) {
  const parts = path.split('/');
  return parts[parts.length - 1];
}

/**
 * Runs Typedoc command.
 *
 * Additional config options come from ./typedoc.js
 */
function runTypedoc() {
  const command = `${repoPath}/node_modules/.bin/typedoc ${sourceFile} \
  --out ${docPath} \
  --readme ${tempHomePath} \
  --options ${__dirname}/typedoc.js \
  --theme ${__dirname}/theme`;

  console.log('Running command:\n', command);
  return exec(command);
}

/**
 * Moves files from subdir to root.
 * @param {string} subdir Subdir to move files out of.
 */
function moveFilesToRoot(subdir) {
  return exec(`mv ${docPath}/${subdir}/* ${docPath}`)
    .then(() => {
      exec(`rmdir ${docPath}/${subdir}`);
    })
    .catch(e => console.error(e));
}

/**
 * Renames files to remove the leading underscores.
 * We need to do this because devsite hides these files.
 * Example: 
 * _cloud_functions_.resource.html => cloud_functions_.resource.html
 */
function renameFiles() {
  return fs.readdir(docPath).then(files => {
    console.log(files);
    files.forEach(file => {
      let newFileName = file;
      if (_.startsWith(file, "_") && _.endsWith(file, "html")) {
        newFileName = _.trimStart(file, "_");
        fs.rename(`${docPath}/${file}`, `${docPath}/${newFileName}`, (err) => {
          if (err) console.log(err)
        });
      }
    })
  })
}

/**
 * Reformat links to match flat structure.
 * @param {string} file File to fix links in.
 */
function fixLinks(file) {
  return fs.readFile(file, 'utf8').then(data => {
    data = addTypeAliasLinks(data);
    const flattenedLinks = data
      .replace(/\.\.\//g, '')
      .replace(/(modules|interfaces|classes)\//g, '')
      .replace(/\"_/g, '"');
    let caseFixedLinks = flattenedLinks;
    for (const lower in lowerToUpperLookup) {
      const re = new RegExp(lower, 'g');
      caseFixedLinks = caseFixedLinks.replace(re, lowerToUpperLookup[lower]);
    }
    return fs.writeFile(file, caseFixedLinks);
  });
}

/** 
 * Adds links to external documentation for type aliases that
 * reference an external library.
 * 
 * @param data File data to add external library links to.
 */
function addTypeAliasLinks(data) {
  const htmlDom = new JSDOM(data);
  /**
   * Select .tsd-signature-type because all potential external
   * links will have this identifier.
   */
  const fileTags = htmlDom.window.document.querySelectorAll(".tsd-signature-type");
  fileTags.forEach(tag => {
    const mapping = typeMap[tag.textContent];
      if (mapping) {
        console.log('Adding link to '+tag.textContent+" documentation.");
        
        // Add the corresponding document link to this type
        const linkChild = htmlDom.window.document.createElement('a');
        linkChild.setAttribute('href', mapping);
        linkChild.textContent = tag.textContent;
        tag.textContent = null;
        tag.appendChild(linkChild);
      }
    });
  return htmlDom.serialize();
}

let tocText = '';

/**
 * Generates temporary markdown file that will be sourced by Typedoc to
 * create index.html.
 *
 * @param {string} tocRaw
 * @param {string} homeRaw
 */
function generateTempHomeMdFile(tocRaw, homeRaw) {
  const { toc } = yaml.safeLoad(tocRaw);
  let tocPageLines = [homeRaw, '# API Reference'];
  toc.forEach(group => {
    tocPageLines.push(`\n## [${group.title}](${stripPath(group.path)})`);
    const section = group.section || [];
    section.forEach(item => {
      tocPageLines.push(`- [${item.title}](${stripPath(item.path)})`);
    });
  });
  return fs.writeFile(tempHomePath, tocPageLines.join('\n'));
}

/**
 * Mapping between lowercase file name and correctly cased name.
 * Used to update links when filenames are capitalized.
 */
const lowerToUpperLookup = {};

/**
 * Checks to see if any files listed in toc.yaml were not generated.
 * If files exist, fixes filename case to match toc.yaml version.
 */
function checkForMissingFilesAndFixFilenameCase() {
  // Get filenames from toc.yaml.
  const filenames = tocText
    .split('\n')
    .filter(line => line.includes('path:'))
    .map(line => line.split(devsitePath)[1]);
  // Logs warning to console if a file from TOC is not found.
  // console.log(filenames);
  const fileCheckPromises = filenames.map(filename => {
    // Warns if file does not exist, fixes filename case if it does.
    // Preferred filename for devsite should be capitalized and taken from
    // toc.yaml.
    const tocFilePath = `${docPath}/${filename}`;
    // Generated filename from Typedoc will be lowercase.
    const generatedFilePath = `${docPath}/${filename.toLowerCase()}`;
    return fs.exists(generatedFilePath).then(exists => {
      if (exists) {
        // Store in a lookup table for link fixing.
        lowerToUpperLookup[
          `${filename.toLowerCase()}`
        ] = `${filename}`;
        return fs.rename(generatedFilePath, tocFilePath);
      } else {
        console.warn(
          `Missing file: ${filename} requested ` +
            `in toc.yaml but not found in ${docPath}`
        );
      }
    });
  });
  return Promise.all(fileCheckPromises).then(() => filenames);
}

/**
 * Gets a list of html files in generated dir and checks if any are not
 * found in toc.yaml.
 * Option to remove the file if not found (used for node docs).
 *
 * @param {Array} filenamesFromToc Filenames pulled from toc.yaml
 * @param {boolean} shouldRemove Should just remove the file
 */
function checkForUnlistedFiles(filenamesFromToc, shouldRemove) {
  return fs.readdir(docPath).then(files => {
    const htmlFiles = files
      .filter(filename => filename.slice(-4) === 'html');
    const removePromises = [];
    htmlFiles.forEach(filename => {
      if (
        !filenamesFromToc.includes(filename) &&
        filename !== 'index' &&
        filename !== 'globals'
      ) {
        if (shouldRemove) {
          console.log(
            `REMOVING ${docPath}/${filename} - not listed in toc.yaml.`
          );
          removePromises.push(fs.unlink(`${docPath}/${filename}`));
        } else {
          // This is just a warning, it doesn't need to finish before
          // the process continues.
          console.warn(
            `Unlisted file: ${filename} generated ` +
              `but not listed in toc.yaml.`
          );
        }
      }
    });
    if (shouldRemove) {
      return Promise.all(removePromises).then(() =>
        htmlFiles.filter(filename => filenamesFromToc.includes(filename))
      );
    } else {
      return htmlFiles;
    }
  });
}

/**
 * Writes a _toc_autogenerated.yaml as a record of all files that were
 * autogenerated.  Helpful to tech writers.
 *
 * @param {Array} htmlFiles List of html files found in generated dir.
 */
function writeGeneratedFileList(htmlFiles) {
  const fileList = htmlFiles.map(filename => {
    return {
      title: filename,
      path: `${devsitePath}${filename}`
    };
  });
  const generatedTocYAML = yaml.safeDump({ toc: fileList });
  return fs
    .writeFile(`${docPath}/_toc_autogenerated.yaml`, generatedTocYAML)
    .then(() => htmlFiles);
}

/**
 * Fix all links in generated files to other generated files to point to top
 * level of generated docs dir.
 *
 * @param {Array} htmlFiles List of html files found in generated dir.
 */
function fixAllLinks(htmlFiles) {
  const writePromises = [];
  htmlFiles.forEach(file => {
    // Update links in each html file to match flattened file structure.
    writePromises.push(fixLinks(`${docPath}/${file}`));
  });
  return Promise.all(writePromises);
}

/**
 * Main document generation process.
 *
 * Steps for generating documentation:
 * 1) Create temporary md file as source of homepage.
 * 2) Run Typedoc, sourcing index.d.ts for API content and temporary md file
 *    for index.html content.
 * 3) Write table of contents file.
 * 4) Flatten file structure by moving all items up to root dir and fixing
 *    links as needed.
 * 5) Check for mismatches between TOC list and generated file list.
 */
Promise.all([
  fs.readFile(`${contentPath}/toc.yaml`, 'utf8'),
  fs.readFile(`${contentPath}/HOME.md`, 'utf8')
])
  // Read TOC and homepage text and assemble a homepage markdown file.
  // This file will be sourced by Typedoc to generate index.html.
  .then(([tocRaw, homeRaw]) => {
    tocText = tocRaw;
    return generateTempHomeMdFile(tocRaw, homeRaw);
  })
  // Run main Typedoc process (uses index.d.ts and generated temp file above).
  .then(runTypedoc)
  .then(output => {
    // Typedoc output.
    console.log(output.stdout);
    // Clean up temp home markdown file. (Nothing needs to wait for this.)
    fs.unlink(tempHomePath);
    // Devsite doesn't like css.map files.
    return fs.unlink(`${docPath}/assets/css/main.css.map`);
  })
  // Write out TOC file.  Do this after Typedoc step to prevent Typedoc
  // erroring when it finds an unexpected file in the target dir.
  .then(() => fs.writeFile(`${docPath}/_toc.yaml`, tocText))
  // Flatten file structure. These categories don't matter to us and it makes
  // it easier to manage the docs directory.
  .then(() => {
    return Promise.all([
      moveFilesToRoot('classes'),
      moveFilesToRoot('modules'),
      moveFilesToRoot('interfaces'),
    ]);
  })
  // Rename files to remove the underscores since devsite hides those.
  .then(renameFiles)
  // Check for files listed in TOC that are missing and warn if so.
  // Not blocking.
  .then(checkForMissingFilesAndFixFilenameCase)
  // Check for files that exist but aren't listed in the TOC and warn.
  // (If API is node, actually remove the file.)
  // Removal is blocking, warnings aren't.
  .then(filenamesFromToc =>
    checkForUnlistedFiles(filenamesFromToc, false)
  )
  // Write a _toc_autogenerated.yaml to record what files were created.
  .then(htmlFiles => writeGeneratedFileList(htmlFiles))
  // Correct the links in all the generated html files now that files have
  // all been moved to top level.
  // .then(removeUnderscores)
  .then(fixAllLinks)
  .then(() => {
    fs.readFile(`${docPath}/index.html`, 'utf8').then(data => {
      // String to include devsite local variables.
      const localVariablesIncludeString = `{% include "docs/web/_local_variables.html" %}\n`;
      return fs.writeFile(
        `${docPath}/index.html`,
        localVariablesIncludeString + data
      );
    });
  })
  .catch(e => {
    if (e.stdout) {
      console.error(e.stdout);
    } else {
      console.error(e);
    }
  });
