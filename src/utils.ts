/// <reference path="../typings/index.d.ts" />

import * as _ from 'lodash';

export function normalizePath(path: string): string {
  path = path.replace(/\/$/, '');
  if (path.indexOf('/') !== 0) {
    path = '/' + path;
  }
  return path;
}

export function pathParts(path: string): string[] {
  if (!path || path === '' || path === '/') {
    return [];
  }
  return normalizePath(path).substring(1).split('/');
}

export function applyChange(src: any, dest: any) {
  // if not mergeable, don't merge
  if (!_.isPlainObject(dest) || !_.isPlainObject(src)) {
    return dest;
  }

  return pruneNulls(_.merge({}, src, dest));
}

export function pruneNulls(obj: Object) {
  for (let key in obj) {
    if (obj[key] === null) {
      delete obj[key];
    } else if (_.isPlainObject(obj[key])) {
      pruneNulls(obj[key]);
    }
  }
  return obj;
}

export function valAt(source: any, path?: string) {
  if (source === null) {
    return null;
  } else if (typeof source !== 'object') {
    return path ? null : source;
  }

  let parts = pathParts(path);
  if (!parts.length) {
    return source;
  }

  let cur = source;
  let leaf;
  while (parts.length) {
    let key = parts.shift();
    if (cur[key] === null || leaf) {
      return null;
    } else if (typeof cur[key] === 'object') {
      if (parts.length) {
        cur = cur[key];
      } else {
        return cur[key];
      }
    } else {
      leaf = cur[key];
    }
  }
  return leaf;
}
