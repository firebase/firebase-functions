import {
  BooleanParam,
  FloatParam,
  IntParam,
  JSONParam,
  ListParam,
  Param,
  ParamOptions,
  SecretParam,
  SecretParamOptions,
  StringParam,
} from './types';

export { ParamOptions, SecretParamOptions };

export const declaredParams: { [name: string]: Param } = {};

/**
 * Declare a string param.
 *
 * @param name The name of the environment variable to use to load the param.
 * @param options Configuration options for the param.
 * @returns A Param with a `string` return type for `.value`.
 */
export function getString(
  name: string,
  options: ParamOptions<string> = {}
): StringParam {
  const param = new StringParam(name, options);
  declaredParams[name] = param;
  return param;
}

/**
 * Declare a boolean param.
 *
 * @param name The name of the environment variable to use to load the param.
 * @param options Configuration options for the param.
 * @returns A Param with a `boolean` return type for `.value`.
 */
export function getBoolean(
  name: string,
  options: ParamOptions<boolean> = {}
): BooleanParam {
  const param = new BooleanParam(name, options);
  declaredParams[name] = param;
  return param;
}

/**
 * Declare an integer param.
 *
 * @param name The name of the environment variable to use to load the param.
 * @param options Configuration options for the param.
 * @returns A Param with a `number` return type for `.value`.
 */
export function getInt(
  name: string,
  options: ParamOptions<number> = {}
): IntParam {
  const param = new IntParam(name, options);
  declaredParams[name] = param;
  return param;
}

/**
 * Declare a float param.
 *
 * @param name The name of the environment variable to use to load the param.
 * @param options Configuration options for the param.
 * @returns A Param with a `number` return type for `.value`.
 */
export function getFloat(
  name: string,
  options: ParamOptions<number> = {}
): FloatParam {
  const param = new FloatParam(name, options);
  declaredParams[name] = param;
  return param;
}

/**
 * Declare a list param (array of strings).
 *
 * @param name The name of the environment variable to use to load the param.
 * @param options Configuration options for the param.
 * @returns A Param with a `string[]` return type for `.value`.
 */
export function getList(
  name: string,
  options: ParamOptions<string[]> = {}
): ListParam {
  const param = new ListParam(name, options);
  declaredParams[name] = param;
  return param;
}

/**
 * Declare a secret.
 *
 * @param name The name of the environment variable the secret is assigned to.
 * @param options Configuration options for the secret param.
 * @returns A SecretParam with a `string` return type for `.value`.
 */
export function getSecret(
  name: string,
  options: SecretParamOptions = {}
): SecretParam {
  const param = new SecretParam(name, options);
  declaredParams[name] = param;
  return param;
}

/**
 * Declare a JSON param. The associated environment variable will be treated
 * as a JSON string when loading its value.
 *
 * @param name The name of the environment variable to use to load the param.
 * @param options Configuration options for the param.
 * @returns A Param with a specifiable return type for `.value`.
 */
export function getJSON<T = unknown>(
  name: string,
  options: ParamOptions<T> = {}
): JSONParam {
  const param = new JSONParam<T>(name, options);
  declaredParams[name] = param;
  return param;
}
