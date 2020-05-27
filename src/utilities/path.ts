/** @hidden
 * Removes leading and trailing slashes from a path.
 *
 * @param path A path to normalize, in POSIX format.
 */
export function normalizePath(path: string): string {
  if (!path) {
    return '';
  }
  return path.replace(/^\//, '').replace(/\/$/, '');
}

/**
 * Normalizes a given path and splits it into an array of segments.
 *
 * @param path A path to split, in POSIX format.
 */
export function pathParts(path: string): string[] {
  if (!path || path === '' || path === '/') {
    return [];
  }
  return normalizePath(path).split('/');
}

/**
 * Normalizes given paths and joins these together using a POSIX separator.
 *
 * @param base A first path segment, in POSIX format.
 * @param child A second path segment, in POSIX format.
 */
export function joinPath(base: string, child: string) {
  return pathParts(base)
    .concat(pathParts(child))
    .join('/');
}
