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
import * as path from "path";
import * as url from "url";

import {
  ManifestEndpoint,
  ManifestExtension,
  ManifestRequiredAPI,
  ManifestStack,
} from "./manifest";

import * as params from "../params";

/**
 * Dynamically load import function to prevent TypeScript from
 * transpiling into a require.
 *
 * See https://github.com/microsoft/TypeScript/issues/43329.
 *
 */
// eslint-disable-next-line @typescript-eslint/no-implied-eval
const dynamicImport = new Function("modulePath", "return import(modulePath)") as (
  modulePath: string
) => Promise<any>;

async function loadModule(functionsDir: string) {
  const absolutePath = path.resolve(functionsDir);
  try {
    return require(path.resolve(absolutePath));
  } catch (e) {
    if (e.code === "ERR_REQUIRE_ESM" || e.code === "ERR_REQUIRE_ASYNC_MODULE") {
      // This is an ESM package, or one containing top-level awaits!
      const modulePath = require.resolve(absolutePath);
      // Resolve module path to file:// URL. Required for windows support.
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
  extensions: Record<string, ManifestExtension>,
  prefix = "",
  handlers?: Record<string, AnyFunction>
) {
  for (const [name, valAsUnknown] of Object.entries(module)) {
    // We're introspecting untrusted code here. Any is appropraite
    const val: any = valAsUnknown;
    if (typeof val === "function" && val.__endpoint && typeof val.__endpoint === "object") {
      const funcName = prefix + name;
      endpoints[funcName] = {
        ...val.__endpoint,
        entryPoint: funcName.replace(/-/g, "."),
      };
      if (handlers) {
        handlers[funcName] = val as AnyFunction;
      }
      if (val.__requiredAPIs && Array.isArray(val.__requiredAPIs)) {
        requiredAPIs.push(...val.__requiredAPIs);
      }
    } else if (isFirebaseRefExtension(val)) {
      extensions[val.instanceId] = {
        params: convertExtensionParams(val.params),
        ref: val.FIREBASE_EXTENSION_REFERENCE,
        events: val.events || [],
      };
    } else if (isFirebaseLocalExtension(val)) {
      extensions[val.instanceId] = {
        params: convertExtensionParams(val.params),
        localPath: val.FIREBASE_EXTENSION_LOCAL_PATH,
        events: val.events || [],
      };
    } else if (isObject(val)) {
      extractStack(val, endpoints, requiredAPIs, extensions, prefix + name + "-", handlers);
    }
  }
}

function toTitleCase(txt: string): string {
  return txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase();
}

function snakeToCamelCase(txt: string): string {
  let ret = txt.toLowerCase();
  ret = ret.replace(/_/g, " ");
  ret = ret.replace(/\w\S*/g, toTitleCase);
  ret = ret.charAt(0).toLowerCase() + ret.substring(1);
  return ret;
}

function convertExtensionParams(params: object): Record<string, string> {
  const systemPrefixes: Record<string, string> = {
    FUNCTION: "firebaseextensions.v1beta.function",
    V2FUNCTION: "firebaseextensions.v1beta.v2function",
  };
  const converted: Record<string, string> = {};
  for (const [rawKey, paramVal] of Object.entries(params)) {
    let key = rawKey;
    if (rawKey.startsWith("_") && rawKey !== "_EVENT_ARC_REGION") {
      const prefix = rawKey.substring(1).split("_")[0];
      const suffix = rawKey.substring(2 + prefix.length); // 2 for underscores
      key = `${systemPrefixes[prefix]}/${snakeToCamelCase(suffix)}`;
    }
    if (Array.isArray(paramVal)) {
      converted[key] = paramVal.join(",");
    } else {
      converted[key] = paramVal as string;
    }
  }
  return converted;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

type AnyFunction = (...args: unknown[]) => unknown;

interface FirebaseLocalExtension {
  FIREBASE_EXTENSION_LOCAL_PATH: string;
  instanceId: string;
  params: Record<string, unknown>;
  events?: string[];
}

const isFirebaseLocalExtension = (val: unknown): val is FirebaseLocalExtension => {
  return (
    isObject(val) &&
    typeof val.FIREBASE_EXTENSION_LOCAL_PATH === "string" &&
    typeof val.instanceId === "string" &&
    isObject(val.params) &&
    (!val.events || Array.isArray(val.events))
  );
};

interface FirebaseRefExtension {
  FIREBASE_EXTENSION_REFERENCE: string;
  instanceId: string;
  params: Record<string, unknown>;
  events?: string[];
}

const isFirebaseRefExtension = (val: unknown): val is FirebaseRefExtension => {
  return (
    isObject(val) &&
    typeof val.FIREBASE_EXTENSION_REFERENCE === "string" &&
    typeof val.instanceId === "string" &&
    isObject(val.params) &&
    (!val.events || Array.isArray(val.events))
  );
};

/* @internal */
export function mergeRequiredAPIs(requiredAPIs: ManifestRequiredAPI[]): ManifestRequiredAPI[] {
  const apiToReasons: Record<string, Set<string>> = {};
  for (const { api, reason } of requiredAPIs) {
    const reasons = apiToReasons[api] || new Set();
    reasons.add(reason);
    apiToReasons[api] = reasons;
  }

  const merged: ManifestRequiredAPI[] = [];
  for (const [api, reasons] of Object.entries(apiToReasons)) {
    merged.push({ api, reason: Array.from(reasons).join(" ") });
  }
  return merged;
}

export interface LoadedStack {
  stack: ManifestStack;
  handlers: Record<string, AnyFunction>;
}

/* @internal */
export async function loadStack(functionsDir: string): Promise<LoadedStack> {
  const endpoints: Record<string, ManifestEndpoint> = {};
  const requiredAPIs: ManifestRequiredAPI[] = [];
  const extensions: Record<string, ManifestExtension> = {};
  const handlers: Record<string, AnyFunction> = {};
  const mod = await loadModule(functionsDir);

  extractStack(mod, endpoints, requiredAPIs, extensions, "", handlers);

  const stack: ManifestStack = {
    endpoints,
    specVersion: "v1alpha1",
    requiredAPIs: mergeRequiredAPIs(requiredAPIs),
    extensions,
  };
  if (params.declaredParams.length > 0) {
    stack.params = params.declaredParams.map((p) => p.toSpec());
  }
  return { stack, handlers };
}
