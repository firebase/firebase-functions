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

/**
 * @hidden
 * @alpha
 */

import {
  BooleanParam,
  Expression,
  FloatParam,
  IntParam,
  Param,
  ParamOptions,
  SecretParam,
  StringParam,
  ListParam,
  InternalExpression,
} from "./types";

export { ParamOptions, Expression, BooleanParam, FloatParam, IntParam, SecretParam, StringParam, ListParam };

type SecretOrExpr = Param<any> | SecretParam;
export const declaredParams: SecretOrExpr[] = [];

/**
 * Use a helper to manage the list such that params are uniquely
 * registered once only but order is preserved.
 * @internal
 */
function registerParam(param: SecretOrExpr) {
  for (let i = 0; i < declaredParams.length; i++) {
    if (declaredParams[i].name === param.name) {
      declaredParams.splice(i, 1);
    }
  }
  declaredParams.push(param);
}

/**
 * For testing.
 * @internal
 */
export function clearParams() {
  declaredParams.splice(0, declaredParams.length);
}

/**
 * A builtin param that resolves to the default RTDB database URL associated
 * with the project, without prompting the deployer. Empty string if none exists.
 */
export const databaseURL: Param<string> = new InternalExpression(
  "DATABASE_URL",
  (env: NodeJS.ProcessEnv) => JSON.parse(env.FIREBASE_CONFIG)?.databaseURL || ""
);
/**
 * A builtin param that resolves to the Cloud project ID associated with
 * the project, without prompting the deployer.
 */
export const projectID: Param<string> = new InternalExpression(
  "PROJECT_ID",
  (env: NodeJS.ProcessEnv) => JSON.parse(env.FIREBASE_CONFIG)?.projectId || ""
);
/**
 * A builtin param that resolves to the Cloud project ID, without prompting
 * the deployer.
 */
export const gcloudProject: Param<string> = new InternalExpression(
  "GCLOUD_PROJECT",
  (env: NodeJS.ProcessEnv) => JSON.parse(env.FIREBASE_CONFIG)?.projectId || ""
);
/**
 * A builtin param that resolves to the Cloud storage bucket associated
 * with the function, without prompting the deployer. Empty string if not
 * defined.
 */
export const storageBucket: Param<string> = new InternalExpression(
  "STORAGE_BUCKET",
  (env: NodeJS.ProcessEnv) => JSON.parse(env.FIREBASE_CONFIG)?.storageBucket || ""
);

/**
 * Declares a secret param, that will persist values only in Cloud Secret Manager.
 * Secrets are stored interally as bytestrings. Use ParamOptions.`as` to provide type
 * hinting during parameter resolution.
 *
 * @param name The name of the environment variable to use to load the param.
 * @param options Configuration options for the param.
 * @returns A Param with a `string` return type for `.value`.
 */
export function defineSecret(name: string): SecretParam {
  const param = new SecretParam(name);
  registerParam(param);
  return param;
}

/**
 * Declare a string param.
 *
 * @param name The name of the environment variable to use to load the param.
 * @param options Configuration options for the param.
 * @returns A Param with a `string` return type for `.value`.
 */
export function defineString(name: string, options: ParamOptions<string> = {}): StringParam {
  const param = new StringParam(name, options);
  registerParam(param);
  return param;
}

/**
 * Declare a boolean param.
 *
 * @param name The name of the environment variable to use to load the param.
 * @param options Configuration options for the param.
 * @returns A Param with a `boolean` return type for `.value`.
 */
export function defineBoolean(name: string, options: ParamOptions<boolean> = {}): BooleanParam {
  const param = new BooleanParam(name, options);
  registerParam(param);
  return param;
}

/**
 * Declare an integer param.
 *
 * @param name The name of the environment variable to use to load the param.
 * @param options Configuration options for the param.
 * @returns A Param with a `number` return type for `.value`.
 */
export function defineInt(name: string, options: ParamOptions<number> = {}): IntParam {
  const param = new IntParam(name, options);
  registerParam(param);
  return param;
}

/**
 * Declare a float param.
 *
 * @param name The name of the environment variable to use to load the param.
 * @param options Configuration options for the param.
 * @returns A Param with a `number` return type for `.value`.
 *
 * @internal
 */
export function defineFloat(name: string, options: ParamOptions<number> = {}): FloatParam {
  const param = new FloatParam(name, options);
  registerParam(param);
  return param;
}

/**
 * Declare a list param.
 *
 * @param name The name of the environment variable to use to load the param.
 * @param options Configuration options for the param.
 * @returns A Param with a `string[]` return type for `.value`.
 */
export function defineList(name: string, options: ParamOptions<string[]> = {}): ListParam {
  const param = new ListParam(name, options);
  registerParam(param);
  return param;
}
