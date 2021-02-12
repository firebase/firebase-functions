import * as fs from 'fs';
import * as path from 'path';

/**
 * Like fs.existsSync, but fails softly.
 * @param path A path to check exists.
 */
export function existsSync(path): boolean | void {
  try {
    return fs.existsSync(path);
  } catch (err) {
    return undefined;
  }
}

type PathType = 'file' | 'directory';

interface LocatePathOptions {
  cwd?: string;
  allowSymlinks?: boolean;
  type?: PathType;
}

const stop = Symbol('findUp.stop');

const pathTypeMap: { [K in PathType]: string } = {
  directory: 'isDirectory',
  file: 'isFile',
};

function locatePathSync(paths, options: LocatePathOptions) {
  options = {
    cwd: process.cwd(),
    allowSymlinks: true,
    type: 'file',
    ...options,
  };

  if (!(options.type in pathTypeMap)) {
    throw new Error(`Invalid type specified: ${options.type}`);
  }

  const statFn = options.allowSymlinks ? fs.statSync : fs.lstatSync;

  for (const currentPath of paths) {
    try {
      const stat = statFn(path.resolve(options.cwd, currentPath));

      if (options.type === undefined || stat[pathTypeMap[options.type]]()) {
        return currentPath;
      }
    } catch {}
  }
}

/**
 * Finds the closest file matching the given file name, traversing up.
 * @param fileName The filename to look up, starting from cwd.
 * @param options The options change findUp behaviour.
 */
export function findUpSync(
  fileName,
  options: LocatePathOptions = {}
): string | void {
  let directory = path.resolve(options.cwd || '');
  const { root } = path.parse(directory);
  const paths = [].concat(fileName);

  const runMatcher = (locateOptions) => {
    if (typeof fileName !== 'function') {
      return locatePathSync(paths, locateOptions);
    }

    const foundPath = fileName(locateOptions.cwd);
    if (typeof foundPath === 'string') {
      return locatePathSync([foundPath], locateOptions);
    }

    return foundPath;
  };

  while (true) {
    const foundPath = runMatcher({ ...options, cwd: directory });

    if (foundPath === stop) {
      return;
    }
    if (foundPath) {
      return path.resolve(directory, foundPath);
    }
    if (directory === root) {
      return;
    }

    directory = path.dirname(directory);
  }
}
