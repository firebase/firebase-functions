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

function isObject(obj: any): boolean {
  return typeof obj === "object" && !!obj;
}

/** @hidden */
export function applyChange(src: any, dest: any) {
  // if not mergeable, don't merge
  if (!isObject(dest) || !isObject(src)) {
    return dest;
  }

  return merge(src, dest);
}

function merge(src: Record<string, any>, dest: Record<string, any>): Record<string, any> {
  const res: Record<string, any> = {};
  const keys = new Set([...Object.keys(src), ...Object.keys(dest)]);

  for (const key of keys.values()) {
    if (key in dest) {
      if (dest[key] === null) {
        continue;
      }
      res[key] = applyChange(src[key], dest[key]);
    } else if (src[key] !== null) {
      res[key] = src[key];
    }
  }
  return res;
}
