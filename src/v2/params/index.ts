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

export function getString(
  name: string,
  options: ParamOptions<string> = {}
): StringParam {
  const param = new StringParam(name, options);
  declaredParams[name] = param;
  return param;
}

export function getBoolean(
  name: string,
  options: ParamOptions<boolean> = {}
): BooleanParam {
  const param = new BooleanParam(name, options);
  declaredParams[name] = param;
  return param;
}

export function getInt(
  name: string,
  options: ParamOptions<number> = {}
): IntParam {
  const param = new IntParam(name, options);
  declaredParams[name] = param;
  return param;
}

export function getFloat(
  name: string,
  options: ParamOptions<number> = {}
): FloatParam {
  const param = new FloatParam(name, options);
  declaredParams[name] = param;
  return param;
}

export function getList(
  name: string,
  options: ParamOptions<string[]> = {}
): ListParam {
  const param = new ListParam(name, options);
  declaredParams[name] = param;
  return param;
}

export function getSecret(
  name: string,
  options: SecretParamOptions = {}
): SecretParam {
  const param = new SecretParam(name, options);
  declaredParams[name] = param;
  return param;
}

export function getJSON<T = unknown>(
  name: string,
  options: ParamOptions<T> = {}
): JSONParam {
  const param = new JSONParam<T>(name, options);
  declaredParams[name] = param;
  return param;
}
