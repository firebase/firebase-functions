/**
 * @license
 * Copyright 2022 Google LLC
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

/**
 * Forked of https://github.com/firebase/firebase-js-sdk/blob/5ce06766303b92fea969c58172a7c1ab8695e21e/repo-scripts/api-documenter/src/toc.ts.
 */
import { writeFileSync } from 'fs';
import { join, resolve } from 'path';

import yargs from 'yargs';
import * as yaml from 'js-yaml';
import {
  ApiItem,
  ApiItemKind,
  ApiModel,
  ApiPackage,
  ApiParameterListMixin,
} from 'api-extractor-model-me';
import { FileSystem, PackageName } from '@rushstack/node-core-library';
import { ModuleSource } from '@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference';

const badFilenameCharsRegExp: RegExp = /[^a-z0-9_\-\.]/gi;

export interface ITocGenerationOptions {
  apiModel: ApiModel;
  g3Path: string;
  outputFolder: string;
}

interface ITocItem {
  title: string;
  path: string;
  section?: ITocItem[];
}

function getSafeFilenameForName(name: string): string {
  // We will fix that as part of https://github.com/microsoft/rushstack/issues/1308
  return name.replace(badFilenameCharsRegExp, '_').toLowerCase();
}

export function generateToc({
  apiModel,
  g3Path,
  outputFolder,
}: ITocGenerationOptions) {
  const toc = [];
  generateTocRecursively(toc, apiModel, g3Path);

  writeFileSync(
    resolve(outputFolder, 'toc.yaml'),
    yaml.dump(
      { toc },
      {
        quotingType: '"',
      }
    )
  );
}

export function getFilenameForApiItem(
  apiItem: ApiItem,
  addFileNameSuffix: boolean
): string {
  if (apiItem.kind === ApiItemKind.Model) {
    return 'index.md';
  }

  let baseName: string = '';
  let multipleEntryPoints: boolean = false;
  for (const hierarchyItem of apiItem.getHierarchy()) {
    // For overloaded methods, add a suffix such as "MyClass.myMethod_2".
    let qualifiedName: string = getSafeFilenameForName(
      hierarchyItem.displayName
    );
    if (ApiParameterListMixin.isBaseClassOf(hierarchyItem)) {
      if (hierarchyItem.overloadIndex > 1) {
        // Subtract one for compatibility with earlier releases of API Documenter.
        // (This will get revamped when we fix GitHub issue #1308)
        qualifiedName += `_${hierarchyItem.overloadIndex - 1}`;
      }
    }

    switch (hierarchyItem.kind) {
      case ApiItemKind.Model:
        break;
      case ApiItemKind.EntryPoint:
        const packageName: string = hierarchyItem.parent!.displayName;
        let entryPointName: string = PackageName.getUnscopedName(packageName);
        if (multipleEntryPoints) {
          entryPointName = `${PackageName.getUnscopedName(packageName)}/${
            hierarchyItem.displayName
          }`;
        }
        baseName = getSafeFilenameForName(entryPointName);
        break;
      case ApiItemKind.Package:
        baseName = getSafeFilenameForName(
          PackageName.getUnscopedName(hierarchyItem.displayName)
        );
        if ((hierarchyItem as ApiPackage).entryPoints.length > 1) {
          multipleEntryPoints = true;
        }
        break;
      case ApiItemKind.Namespace:
        baseName += '.' + qualifiedName;
        if (addFileNameSuffix) {
          baseName += '_n';
        }
        break;
      case ApiItemKind.Class:
      case ApiItemKind.Interface:
        baseName += '.' + qualifiedName;
        break;
    }
  }
  return baseName + '.md';
}

function generateTocRecursively(
  toc: ITocItem[],
  apiItem: ApiItem,
  g3Path: string
) {
  // Each version of the functions SDK should have 1 entry point made up of many namespaces so recursion is unncessary.
  // We keep the code nonetheless for the future where we run the api-documenter once to generate both v1 and v2 refs.
  if (apiItem.kind === ApiItemKind.EntryPoint) {
    const entryPointName = (apiItem.canonicalReference.source! as ModuleSource).escapedPath;
    const entryPointToc: ITocItem = {
      title: entryPointName,
      path: `${g3Path}/${getFilenameForApiItem(apiItem, false)}`,
      section: [],
    };
    for (const member of apiItem.members) {
      if (member.kind == 'Namespace') {
        entryPointToc.section.push({
          title: member.displayName,
          path: `${g3Path}/${getFilenameForApiItem(member, false)}`,
        });
      }
    }
    toc.push(entryPointToc);
  } else {
    // travel the api tree to find the next entry point
    for (const member of apiItem.members) {
      generateTocRecursively(toc, member, g3Path);
    }
  }
}

const { input, output, path } = yargs(process.argv.slice(2))
  .option('input', {
    alias: 'i',
    describe: 'input folder containing the *.api.json files to be processed.',
    default: './input',
  })
  .option('output', {
    alias: 'o',
    describe: 'destination for the generated toc content.',
    default: './toc',
  })
  .option('path', {
    alias: 'p',
    describe: 'specifies the path where the reference docs resides (e.g. g3)',
    default: '/',
  })
  .help().argv;

const apiModel: ApiModel = new ApiModel();
for (const filename of FileSystem.readFolder(input)) {
  if (filename.match(/\.api\.json$/i)) {
    console.log(`Reading ${filename}`);
    const filenamePath: string = join(input, filename);
    apiModel.loadPackage(filenamePath);
  }
}
FileSystem.ensureFolder(output);
generateToc({ apiModel, g3Path: path, outputFolder: output });
