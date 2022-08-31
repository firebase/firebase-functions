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
  FloatParam,
  IntParam,
  ListParam,
  Param,
  ParamOptions,
  StringParam,
  SecretParam,
  Expression,
} from "./types";

export { ParamOptions, Expression };

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
 */
export function defineFloat(name: string, options: ParamOptions<number> = {}): FloatParam {
  const param = new FloatParam(name, options);
  registerParam(param);
  return param;
}

/**
 * Declare a list param (array of strings).
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
