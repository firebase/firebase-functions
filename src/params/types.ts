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

import * as logger from "../logger";

const EXPRESSION_TAG = Symbol.for("firebase-functions:Expression:Tag");

/*
 * A CEL expression which can be evaluated during function deployment, and
 * resolved to a value of the generic type parameter: i.e, you can pass
 * an Expression<number> as the value of an option that normally accepts numbers.
 */
export abstract class Expression<T extends string | number | boolean | string[]> {
  /**
   * Handle the "Dual-Package Hazard" .
   *
   * We implement custom `Symbol.hasInstance` to so CJS/ESM Expression instances
   * are recognized as the same type.
   */
  static [Symbol.hasInstance](instance: unknown): boolean {
    return (instance as { [EXPRESSION_TAG]?: boolean })?.[EXPRESSION_TAG] === true;
  }

  get [EXPRESSION_TAG](): boolean {
    return true;
  }
  /** Returns the expression's runtime value, based on the CLI's resolution of parameters. */
  value(): T {
    if (process.env.FUNCTIONS_CONTROL_API === "true") {
      logger.warn(
        `${this.toString()}.value() invoked during function deployment, instead of during runtime.`
      );
      logger.warn(
        `This is usually a mistake. In configs, use Params directly without calling .value().`
      );
      logger.warn(`example: { memory: memoryParam } not { memory: memoryParam.value() }`);
    }
    return this.runtimeValue();
  }

  /** @internal */
  runtimeValue(): T {
    throw new Error("Not implemented");
  }

  /** Returns the expression's representation as a braced CEL expression. */
  toCEL(): string {
    return `{{ ${this.toString()} }}`;
  }

  /** Returns the expression's representation as JSON. */
  toJSON(): string {
    return this.toString();
  }
}

function valueOf<T extends string | number | boolean | string[]>(arg: T | Expression<T>): T {
  return arg instanceof Expression ? arg.runtimeValue() : arg;
}
/**
 * Returns how an entity (either an `Expression` or a literal value) should be represented in CEL.
 * - Expressions delegate to the `.toString()` method, which is used by the WireManifest
 * - Strings have to be quoted explicitly
 * - Arrays are represented as []-delimited, parsable JSON
 * - Numbers and booleans are not quoted explicitly
 */
function refOf<T extends string | number | boolean | string[]>(arg: T | Expression<T>): string {
  if (arg instanceof Expression) {
    return arg.toString();
  } else if (typeof arg === "string") {
    return `"${arg}"`;
  } else if (Array.isArray(arg)) {
    return JSON.stringify(arg);
  } else {
    return arg.toString();
  }
}

/**
 * A CEL expression corresponding to a ternary operator, e.g {{ cond ? ifTrue : ifFalse }}
 */
export class TernaryExpression<
  T extends string | number | boolean | string[]
> extends Expression<T> {
  constructor(
    private readonly test: Expression<boolean>,
    private readonly ifTrue: T | Expression<T>,
    private readonly ifFalse: T | Expression<T>
  ) {
    super();
    this.ifTrue = ifTrue;
    this.ifFalse = ifFalse;
  }

  /** @internal */
  runtimeValue(): T {
    return this.test.runtimeValue() ? valueOf(this.ifTrue) : valueOf(this.ifFalse);
  }

  toString() {
    return `${this.test} ? ${refOf(this.ifTrue)} : ${refOf(this.ifFalse)}`;
  }
}

/**
 * A CEL expression that evaluates to boolean true or false based on a comparison
 * between the value of another expression and a literal of that same type.
 */
export class CompareExpression<
  T extends string | number | boolean | string[]
> extends Expression<boolean> {
  cmp: "==" | "!=" | ">" | ">=" | "<" | "<=";
  lhs: Expression<T>;
  rhs: T | Expression<T>;

  constructor(
    cmp: "==" | "!=" | ">" | ">=" | "<" | "<=",
    lhs: Expression<T>,
    rhs: T | Expression<T>
  ) {
    super();
    this.cmp = cmp;
    this.lhs = lhs;
    this.rhs = rhs;
  }

  /** @internal */
  runtimeValue(): boolean {
    const left = this.lhs.runtimeValue();
    const right = valueOf(this.rhs);
    switch (this.cmp) {
      case "==":
        return Array.isArray(left) ? this.arrayEquals(left, right as string[]) : left === right;
      case "!=":
        return Array.isArray(left) ? !this.arrayEquals(left, right as string[]) : left !== right;
      case ">":
        return left > right;
      case ">=":
        return left >= right;
      case "<":
        return left < right;
      case "<=":
        return left <= right;
      default:
        throw new Error(`Unknown comparator ${this.cmp}`);
    }
  }

  /** @internal */
  arrayEquals(a: string[], b: string[]): boolean {
    return a.every((item) => b.includes(item)) && b.every((item) => a.includes(item));
  }

  toString() {
    const rhsStr = refOf(this.rhs);
    return `${this.lhs} ${this.cmp} ${rhsStr}`;
  }

  /** Returns a `TernaryExpression` which can resolve to one of two values, based on the resolution of this comparison. */
  thenElse<retT extends string | number | boolean | string[]>(
    ifTrue: retT | Expression<retT>,
    ifFalse: retT | Expression<retT>
  ) {
    return new TernaryExpression<retT>(this, ifTrue, ifFalse);
  }
}

/** @hidden */
type ParamValueType = "string" | "list" | "boolean" | "int" | "float" | "secret";

/** Create a select input from a series of values. */
export function select<T>(options: T[]): SelectInput<T>;

/** Create a select input from a map of labels to values. */
export function select<T>(optionsWithLabels: Record<string, T>): SelectInput<T>;

/** Create a select input from a series of values or a map of labels to values */
export function select<T>(options: T[] | Record<string, T>): SelectInput<T> {
  let wireOpts: SelectOptions<T>[];
  if (Array.isArray(options)) {
    wireOpts = options.map((opt) => ({ value: opt }));
  } else {
    wireOpts = Object.entries(options).map(([label, value]) => ({ label, value }));
  }
  return {
    select: {
      options: wireOpts,
    },
  };
}

/** Create a multi-select input from a series of values. */
export function multiSelect(options: string[]): MultiSelectInput;

/** Create a multi-select input from map of labels to values. */
export function multiSelect(options: Record<string, string>): MultiSelectInput;

/** Create a multi-select input from a series of values or map of labels to values. */
export function multiSelect(options: string[] | Record<string, string>): MultiSelectInput {
  let wireOpts: SelectOptions<string>[];
  if (Array.isArray(options)) {
    wireOpts = options.map((opt) => ({ value: opt }));
  } else {
    wireOpts = Object.entries(options).map(([label, value]) => ({ label, value }));
  }
  return {
    multiSelect: {
      options: wireOpts,
    },
  };
}

type ParamInput<T> =
  | TextInput<T>
  | SelectInput<T>
  | (T extends string[] ? MultiSelectInput : never)
  | (T extends string ? ResourceInput : never);

/**
 * Specifies that a parameter's value should be determined by prompting the user
 * to type it in interactively at deploy time. Input that does not match the
 * provided validationRegex, if present, will be retried.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface TextInput<T = unknown> {
  text: {
    example?: string;
    /**
     * A regular expression (or an escaped string to compile into a regular
     * expression) which the prompted text must satisfy; the prompt will retry
     * until input matching the regex is provided.
     */
    validationRegex?: string | RegExp;
    /**
     * A custom error message to display when retrying the prompt based on input
     * failing to conform to the validationRegex,
     */
    validationErrorMessage?: string;
  };
}

/**
 * Specifies that a parameter's value should be determined by having the user
 * select from a list containing all the project's resources of a certain
 * type. Currently, only type:"storage.googleapis.com/Bucket" is supported.
 */
export interface ResourceInput {
  resource: {
    type: "storage.googleapis.com/Bucket";
  };
}

/**
 * Autogenerate a list of buckets in a project that a user can select from.
 */
export const BUCKET_PICKER: ResourceInput = {
  resource: {
    type: "storage.googleapis.com/Bucket",
  },
};

/**
 * Specifies that a parameter's value should be determined by having the user select
 * from a list of pre-canned options interactively at deploy time.
 */
export interface SelectInput<T = unknown> {
  select: {
    options: Array<SelectOptions<T>>;
  };
}

/**
 * Specifies that a parameter's value should be determined by having the user select
 * a subset from a list of pre-canned options interactively at deploy time.
 * Will result in errors if used on parameters of type other than `string[]`.
 */
export interface MultiSelectInput {
  multiSelect: {
    options: Array<SelectOptions<string>>;
  };
}

/**
 * One of the options provided to a `SelectInput`, containing a value and
 * optionally a human-readable label to display in the selection interface.
 */
export interface SelectOptions<T = unknown> {
  label?: string;
  value: T;
}

/** The wire representation of a parameter when it's sent to the CLI. A superset of `ParamOptions`. */
export type ParamSpec<T extends string | number | boolean | string[]> = {
  /** The name of the parameter which will be stored in .env files. Use UPPERCASE. */
  name: string;
  /** An optional default value to be used while prompting for input. Can be a literal or another parametrized expression. */
  default?: T | Expression<T>;
  /** An optional human-readable string to be used as a replacement for the parameter's name when prompting. */
  label?: string;
  /** An optional long-form description of the parameter to be displayed while prompting. */
  description?: string;
  /** @internal */
  type: ParamValueType;
  /** The way in which the Firebase CLI will prompt for the value of this parameter. Defaults to a TextInput. */
  input?: ParamInput<T>;
  /** Optional format annotation for additional type information (e.g., "json" for JSON-encoded secrets). */
  format?: string;
};

/**
 * Representation of parameters for the stack over the wire.
 *
 * @remarks
 * N.B: a WireParamSpec is just a ParamSpec with default expressions converted into a CEL literal
 *
 * @alpha
 */
export type WireParamSpec<T extends string | number | boolean | string[]> = {
  name: string;
  default?: T | string;
  label?: string;
  description?: string;
  type: ParamValueType;
  input?: ParamInput<T>;
  format?: string;
};

/** Configuration options which can be used to customize the prompting behavior of a parameter. */
export type ParamOptions<T extends string | number | boolean | string[]> = Omit<
  ParamSpec<T>,
  "name" | "type"
>;

/**
 * Represents a parametrized value that will be read from .env files if present,
 * or prompted for by the CLI if missing. Instantiate these with the defineX
 * methods exported by the firebase-functions/params namespace.
 */
export abstract class Param<T extends string | number | boolean | string[]> extends Expression<T> {
  static type: ParamValueType = "string";

  constructor(readonly name: string, readonly options: ParamOptions<T> = {}) {
    super();
  }

  /** @internal */
  runtimeValue(): T {
    throw new Error("Not implemented");
  }

  /** Returns a parametrized expression of Boolean type, based on comparing the value of this parameter to a literal or a different expression. */
  cmp(cmp: "==" | "!=" | ">" | ">=" | "<" | "<=", rhs: T | Expression<T>) {
    return new CompareExpression<T>(cmp, this, rhs);
  }

  /** Returns a parametrized expression of Boolean type, based on comparing the value of this parameter to a literal or a different expression. */
  equals(rhs: T | Expression<T>) {
    return this.cmp("==", rhs);
  }

  /** Returns a parametrized expression of Boolean type, based on comparing the value of this parameter to a literal or a different expression. */
  notEquals(rhs: T | Expression<T>) {
    return this.cmp("!=", rhs);
  }

  /** Returns a parametrized expression of Boolean type, based on comparing the value of this parameter to a literal or a different expression. */
  greaterThan(rhs: T | Expression<T>) {
    return this.cmp(">", rhs);
  }

  /** Returns a parametrized expression of Boolean type, based on comparing the value of this parameter to a literal or a different expression. */
  greaterThanOrEqualTo(rhs: T | Expression<T>) {
    return this.cmp(">=", rhs);
  }

  /** Returns a parametrized expression of Boolean type, based on comparing the value of this parameter to a literal or a different expression. */
  lessThan(rhs: T | Expression<T>) {
    return this.cmp("<", rhs);
  }

  /** Returns a parametrized expression of Boolean type, based on comparing the value of this parameter to a literal or a different expression. */
  lessThanOrEqualTo(rhs: T | Expression<T>) {
    return this.cmp("<=", rhs);
  }

  /**
   * Returns a parametrized expression of Boolean type, based on comparing the value of this parameter to a literal or a different expression.
   * @deprecated A typo. Use lessThanOrEqualTo instead.
   */
  lessThanorEqualTo(rhs: T | Expression<T>) {
    return this.lessThanOrEqualTo(rhs);
  }

  toString(): string {
    return `params.${this.name}`;
  }

  /** @internal */
  toSpec(): WireParamSpec<T> {
    const { default: paramDefault, ...otherOptions } = this.options;

    const out: WireParamSpec<T> = {
      name: this.name,
      ...otherOptions,
      type: (this.constructor as typeof Param).type,
    };

    if (paramDefault instanceof Expression) {
      out.default = paramDefault.toCEL();
    } else if (paramDefault !== undefined) {
      out.default = paramDefault;
    }

    if (out.input && "text" in out.input && out.input.text.validationRegex instanceof RegExp) {
      out.input.text.validationRegex = out.input.text.validationRegex.source;
    }

    return out;
  }
}

/**
 * A parametrized string whose value is stored in Cloud Secret Manager
 * instead of the local filesystem. Supply instances of SecretParams to
 * the secrets array while defining a Function to make their values accessible
 * during execution of that Function.
 */
export class SecretParam {
  static type: ParamValueType = "secret";
  name: string;

  constructor(name: string) {
    this.name = name;
  }

  /** @internal */
  runtimeValue(): string {
    const val = process.env[this.name];
    if (val === undefined) {
      logger.warn(
        `No value found for secret parameter "${this.name}". A function can only access a secret if you include the secret in the function's dependency array.`
      );
    }
    return val || "";
  }

  /** @internal */
  toSpec(): ParamSpec<string> {
    return {
      type: "secret",
      name: this.name,
    };
  }

  /** Returns the secret's value at runtime. Throws an error if accessed during deployment. */
  value(): string {
    if (process.env.FUNCTIONS_CONTROL_API === "true") {
      throw new Error(
        `Cannot access the value of secret "${this.name}" during function deployment. Secret values are only available at runtime.`
      );
    }
    return this.runtimeValue();
  }
}

/**
 * A parametrized object whose value is stored as a JSON string in Cloud Secret Manager.
 * This is useful for managing groups of related configuration values, such as all settings
 * for a third-party API, as a single unit. Supply instances of JsonSecretParam to the
 * secrets array while defining a Function to make their values accessible during execution
 * of that Function.
 */
export class JsonSecretParam<T = any> {
  static type: ParamValueType = "secret";
  name: string;

  constructor(name: string) {
    this.name = name;
  }

  /** @internal */
  runtimeValue(): T {
    const val = process.env[this.name];
    if (val === undefined) {
      throw new Error(
        `No value found for secret parameter "${this.name}". A function can only access a secret if you include the secret in the function's dependency array.`
      );
    }

    try {
      return JSON.parse(val) as T;
    } catch (error) {
      throw new Error(
        `"${this.name}" could not be parsed as JSON. Please verify its value in Secret Manager. Details: ${error}`
      );
    }
  }

  /** @internal */
  toSpec(): ParamSpec<string> {
    return {
      type: "secret",
      name: this.name,
      format: "json",
    };
  }

  /** Returns the secret's parsed JSON value at runtime. Throws an error if accessed during deployment, if the secret is not set, or if the value is not valid JSON. */
  value(): T {
    if (process.env.FUNCTIONS_CONTROL_API === "true") {
      throw new Error(
        `Cannot access the value of secret "${this.name}" during function deployment. Secret values are only available at runtime.`
      );
    }
    return this.runtimeValue();
  }
}

/**
 *  A parametrized value of String type that will be read from .env files
 *  if present, or prompted for by the CLI if missing.
 */
export class StringParam extends Param<string> {
  /** @internal */
  runtimeValue(): string {
    return process.env[this.name] || "";
  }
}

/**
 * A CEL expression which represents an internal Firebase variable. This class
 * cannot be instantiated by developers, but we provide several canned instances
 * of it to make available parameters that will never have to be defined at
 * deployment time, and can always be read from process.env.
 * @internal
 */
export class InternalExpression extends Param<string> {
  constructor(name: string, private readonly getter: (env: NodeJS.ProcessEnv) => string) {
    super(name);
  }

  /** @internal */
  runtimeValue(): string {
    return this.getter(process.env) || "";
  }

  toSpec(): WireParamSpec<string> {
    throw new Error("An InternalExpression should never be marshalled for wire transmission.");
  }
}

/**
 *  A parametrized value of Integer type that will be read from .env files
 *  if present, or prompted for by the CLI if missing.
 */
export class IntParam extends Param<number> {
  static type: ParamValueType = "int";

  /** @internal */
  runtimeValue(): number {
    return parseInt(process.env[this.name] || "0", 10) || 0;
  }
}

/**
 *  A parametrized value of Float type that will be read from .env files
 *  if present, or prompted for by the CLI if missing.
 */
export class FloatParam extends Param<number> {
  static type: ParamValueType = "float";

  /** @internal */
  runtimeValue(): number {
    return parseFloat(process.env[this.name] || "0") || 0;
  }
}

/**
 *  A parametrized value of Boolean type that will be read from .env files
 *  if present, or prompted for by the CLI if missing.
 */
export class BooleanParam extends Param<boolean> {
  static type: ParamValueType = "boolean";

  /** @internal */
  runtimeValue(): boolean {
    return !!process.env[this.name] && process.env[this.name] === "true";
  }

  /** @deprecated */
  then<T extends string | number | boolean>(ifTrue: T | Expression<T>, ifFalse: T | Expression<T>) {
    return this.thenElse(ifTrue, ifFalse);
  }

  thenElse<T extends string | number | boolean>(
    ifTrue: T | Expression<T>,
    ifFalse: T | Expression<T>
  ) {
    return new TernaryExpression(this, ifTrue, ifFalse);
  }
}

/**
 *  A parametrized value of String[] type that will be read from .env files
 *  if present, or prompted for by the CLI if missing.
 */
export class ListParam extends Param<string[]> {
  static type: ParamValueType = "list";

  /** @internal */
  runtimeValue(): string[] {
    const val = JSON.parse(process.env[this.name]);
    if (!Array.isArray(val) || !(val as string[]).every((v) => typeof v === "string")) {
      return [];
    }
    return val as string[];
  }

  /** @hidden */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  greaterThan(rhs: string[] | Expression<string[]>): CompareExpression<string[]> {
    throw new Error(">/< comparison operators not supported on params of type List");
  }

  /** @hidden */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  greaterThanOrEqualTo(rhs: string[] | Expression<string[]>): CompareExpression<string[]> {
    throw new Error(">/< comparison operators not supported on params of type List");
  }

  /** @hidden */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  lessThan(rhs: string[] | Expression<string[]>): CompareExpression<string[]> {
    throw new Error(">/< comparison operators not supported on params of type List");
  }

  /** @hidden */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  lessThanorEqualTo(rhs: string[] | Expression<string[]>): CompareExpression<string[]> {
    throw new Error(">/< comparison operators not supported on params of type List");
  }
}
