// The MIT License (MIT)
//
// Copyright (c) 2017 Firebase
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import * as _ from 'lodash';

export function normalizePath(path: string): string {
  if (!path) {
    return '';
  }
  return path.replace(/^\//,'').replace(/\/$/, '');
}

export function pathParts(path: string): string[] {
  if (!path || path === '' || path === '/') {
    return [];
  }
  return normalizePath(path).split('/');
}

export function joinPath(base: string, child: string) {
  return pathParts(base).concat(pathParts(child)).join('/');
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
