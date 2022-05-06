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
import { resolve } from 'path';

import yargs from 'yargs';
import * as yaml from 'js-yaml';
import { FileSystem } from '@rushstack/node-core-library';

export interface TocGenerationOptions {
  inputFolder: string;
  outputFolder: string;
  g3Path: string;
}

interface TocItem {
  title: string;
  path: string;
  section?: TocItem[];
}

function fileExt(f: string) {
  const parts = f.split('.');
  if (parts.length < 2) {
    return '';
  }
  return parts.pop();
}

export function generateToc({
  inputFolder,
  g3Path,
  outputFolder,
}: TocGenerationOptions) {
  const asObj = FileSystem.readFolder(inputFolder)
    .filter((f) => fileExt(f) === 'md')
    .reduce((acc, f) => {
      const parts = f.split('.');
      parts.pop(); // Get rid of file extenion (.md)

      let cursor = acc;
      for (const p of parts) {
        cursor[p] = cursor[p] || {};
        cursor = cursor[p];
      }
      return acc;
    }, {} as any);

  function toToc(obj, prefix = ''): TocItem[] {
    const toc: TocItem[] = [];
    for (const key of Object.keys(obj)) {
      const item = prefix?.length ? `${prefix}.${key}` : key;
      const section = toToc(obj[key], item);
      const tic: TocItem = {
        title: item.replace(/\./g, '/'),
        path: `${g3Path}/${item}.md`,
      };
      if (section.length > 0) {
        tic.section = section;
      }
      toc.push(tic);
    }
    return toc;
  }

  const toc: TocItem[] = [
    {
      title: 'firebase-functions',
      path: `${g3Path}/firebase-functions.md`,
    },
    ...toToc(asObj['firebase-functions'], 'firebase-functions'),
  ];

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

FileSystem.ensureFolder(output);
generateToc({ inputFolder: input, g3Path: path, outputFolder: output });
