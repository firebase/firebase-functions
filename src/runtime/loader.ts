// The MIT License (MIT)
//
// Copyright (c) 2021 Firebase
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
import * as url from 'url';
import * as path from 'path';

import {
  ManifestStack,
  ManifestEndpoint,
  ManifestRequiredAPI,
} from './manifest';

/**
 * Dynamically load import function to prevent TypeScript from
 * transpiling into a require.
 *
 * See https://github.com/microsoft/TypeScript/issues/43329.
 */
const dynamicImport = new Function(
  'modulePath',
  'return import(modulePath)'
) as (modulePath: string) => Promise<any>;

async function loadModule(functionsDir: string) {
  const absolutePath = path.resolve(functionsDir);
  try {
    return require(path.resolve(absolutePath));
  } catch (e) {
    if (e.code === 'ERR_REQUIRE_ESM') {
      // This is an ESM package!
      const modulePath = require.resolve(absolutePath);
      // Resolve module path to file:// URL. Required for windows support.
      // @ts-ignore pathToFileURL exists for Node.js v10 and up. Since ESM support exists for Node.js v13 and up, we
      // can be sure that this function exists here.
      const moduleURL = url.pathToFileURL(modulePath).href;
      return await dynamicImport(moduleURL);
    }
    throw e;
  }
}

/* @internal */
export function extractStack(
  module,
  endpoints: Record<string, ManifestEndpoint>,
  requiredAPIs: ManifestRequiredAPI[],
  prefix = ''
) {
  for (const [name, val] of Object.entries(module)) {
    if (
      typeof val === 'function' &&
      val['__endpoint'] &&
      typeof val['__endpoint'] === 'object'
    ) {
      const funcName = prefix + name;
      endpoints[funcName] = {
        ...val['__endpoint'],
        entryPoint: funcName.replace(/-/g, '.'),
      };
      if (val['__requiredAPIs'] && Array.isArray(val['__requiredAPIs'])) {
        requiredAPIs.push(...val['__requiredAPIs']);
      }
    } else if (typeof val === 'object' && val !== null) {
      extractStack(val, endpoints, requiredAPIs, prefix + name + '-');
    }
  }
}

/* @internal */
export function mergeRequiredAPIs(
  requiredAPIs: ManifestRequiredAPI[]
): ManifestRequiredAPI[] {
  const apiToReasons: Record<string, Set<string>> = {};
  for (const { api, reason } of requiredAPIs) {
    const reasons = apiToReasons[api] || new Set();
    reasons.add(reason);
    apiToReasons[api] = reasons;
  }

  const merged: ManifestRequiredAPI[] = [];
  for (const [api, reasons] of Object.entries(apiToReasons)) {
    merged.push({ api, reason: Array.from(reasons).join(' ') });
  }
  return merged;
}

/* @internal */
export async function loadStack(functionsDir: string): Promise<ManifestStack> {
  const endpoints: Record<string, ManifestEndpoint> = {};
  const requiredAPIs: ManifestRequiredAPI[] = [];
  const mod = await loadModule(functionsDir);

  extractStack(mod, endpoints, requiredAPIs);

  return {
    endpoints,
    specVersion: 'v1alpha1',
    requiredAPIs: mergeRequiredAPIs(requiredAPIs),
  };
}
