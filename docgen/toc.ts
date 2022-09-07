/**
 * Forked of https://github.com/firebase/firebase-js-sdk/blob/5ce06766303b92fea969c58172a7c1ab8695e21e/repo-scripts/api-documenter/src/toc.ts.
 *
 * Firebase Functions SDK uses namespaces as primary entry points but the theoriginal Firebase api-documenter ignores
 * them when generating toc.yaml. A small modification is made to include namespaces and exclude classes when walking
 * down the api model.
 */
import * as yaml from 'js-yaml';
import {ApiItem, ApiItemKind, ApiModel, ApiPackage, ApiParameterListMixin,} from 'api-extractor-model-me';
import {ModuleSource} from '@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference';
import {FileSystem, PackageName} from '@rushstack/node-core-library';
import yargs from 'yargs';
import {writeFileSync} from 'fs';
import {join, resolve} from 'path';

function getSafeFileName(f: string): string {
  return f.replace(/[^a-z0-9_\-\.]/gi, '_').toLowerCase();
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
    let qualifiedName = getSafeFileName(hierarchyItem.displayName);
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
        baseName = getSafeFileName(entryPointName);
        break;
      case ApiItemKind.Package:
        baseName = getSafeFileName(
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

export interface ITocGenerationOptions {
  inputFolder: string;
  g3Path: string;
  outputFolder: string;
  addFileNameSuffix: boolean;
}

interface ITocItem {
  title: string;
  path: string;
  section?: ITocItem[];
}

export function generateToc({
  inputFolder,
  g3Path,
  outputFolder,
  addFileNameSuffix,
}: ITocGenerationOptions) {
  const apiModel: ApiModel = new ApiModel();

  for (const filename of FileSystem.readFolder(inputFolder)) {
    if (filename.match(/\.api\.json$/i)) {
      const filenamePath = join(inputFolder, filename);
      apiModel.loadPackage(filenamePath);
    }
  }

  // Firebase Functions only have 1 entry point. Let's traverse the tree to find it.
  const apiItems: ApiItem[] = [];
  let cursor = apiModel as ApiItem;
  while (cursor?.kind !== ApiItemKind.EntryPoint) {
    apiItems.push(...cursor.members);
    cursor = apiItems.pop();
  }
  if (!cursor) {
    throw new Error("Couldn't find entry point from api model. Are you sure you've generated the api model?")
  }

  const entryPointName = (
      cursor.canonicalReference.source! as ModuleSource
  ).escapedPath.replace('@firebase/', '');

  const entryPointToc: ITocItem = {
    title: entryPointName,
    path: `${g3Path}/${getFilenameForApiItem(cursor, addFileNameSuffix)}`,
    section: [],
  };

  generateTocRecursively(cursor, g3Path, addFileNameSuffix, entryPointToc);

  writeFileSync(
    resolve(outputFolder, 'toc.yaml'),
    yaml.dump(
      { toc: entryPointToc },
      {
        quotingType: '"',
      }
    )
  );
}

function generateTocRecursively(
  apiItem: ApiItem,
  g3Path: string,
  addFileNameSuffix: boolean,
  toc: ITocItem
) {
    for (const member of apiItem.members) {
      // only namespaces/classes gets included in ToC.
      if (
          [
              ApiItemKind.Class,
              ApiItemKind.Namespace,
              ApiItemKind.Interface,
          ].includes(member.kind)
      ) {
        const fileName = getFilenameForApiItem(member, addFileNameSuffix);
        const title =
          member.displayName[0].toUpperCase() + member.displayName.slice(1);
        const section: ITocItem = {
          title,
          path: `${g3Path}/${fileName}`,
        }
        if (!toc.section) {
          toc.section = [];
        }
        toc.section.push(section);
        generateTocRecursively(member, g3Path, addFileNameSuffix, section);
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

FileSystem.ensureFolder(output);
generateToc({
  inputFolder: input,
  g3Path: path,
  outputFolder: output,
  addFileNameSuffix: false,
});
