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

/*
 * A CEL expression which can be evaluated during function deployment, and
 * resolved to a value of the generic type parameter: i.e, you can pass
 * an Expression<number> as the value of an option that normally accepts numbers.
 */
export abstract class Expression<T extends string | number | boolean | string[]> {
  // Returns the Expression's runtime value, based on the CLI's resolution of params.
  value(): T {
    if (process.env.FIREBASE_DISCOVERY_DIR) {
      logger.warn(
        `${this.toString()}.value() invoked during Function configuration, instead of during runtime.`
      );
      logger.warn(
        `This is usually a mistake. In configs, use Params directly without calling .value().`
      );
      logger.warn(`\texample: { memory: memoryParam } not { memory: memoryParam.value() }`);
    }
    return this.runtimeValue();
  }

  // @internal
  runtimeValue(): T {
    throw new Error("Not implemented");
  }

  // Returns the Expression's representation as a braced CEL expression.
  toCEL(): string {
    return `{{ ${this.toString()} }}`;
  }

  toJSON(): string {
    return this.toString();
  }
}

function quoteIfString<T extends string | number | boolean | string[]>(literal: T): T {
  // TODO(vsfan@): CEL's string escape semantics are slightly different than Javascript's, what do we do here?
  return typeof literal === "string" ? (`"${literal}"` as T) : literal;
}

function valueOf<T extends string | number | boolean | string[]>(arg: T | Expression<T>): T {
  return arg instanceof Expression ? arg.runtimeValue() : arg;
}
function refOf<T extends string | number | boolean | string[]>(arg: T | Expression<T>): string {
  return arg instanceof Expression ? arg.toString() : quoteIfString(arg).toString();
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

  runtimeValue(): boolean {
    const left = this.lhs.runtimeValue();
    const right = valueOf(this.rhs);
    switch (this.cmp) {
      case "==":
        return left === right;
      case "!=":
        return left !== right;
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

  toString() {
    const rhsStr = refOf(this.rhs);
    return `${this.lhs} ${this.cmp} ${rhsStr}`;
  }

  then<retT extends string | number | boolean | string[]>(
    ifTrue: retT | Expression<retT>,
    ifFalse: retT | Expression<retT>
  ) {
    return new TernaryExpression<retT>(this, ifTrue, ifFalse);
  }
}

/** @hidden */
type ParamValueType = "string" | "list" | "boolean" | "int" | "float" | "secret";

type ParamInput<T> =
  | { text: TextInput<T> }
  | { select: SelectInput<T> }
  | { resource: ResourceInput };

/**
 * Specifies that a Param's value should be determined by prompting the user
 * to type it in interactively at deploy-time. Input that does not match the
 * provided validationRegex, if present, will be retried.
 *
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface TextInput<T = unknown> {
  example?: string;
  validationRegex?: string | RegExp;
  validationErrorMessage?: string;
}

/**
 * Specifies that a Param's value should be determined by having the user
 * select from a list containing all the project's resources of a certain
 * type. Currently, only type:"storage.googleapis.com/Bucket" is supported.
 */
export interface ResourceInput {
  resource: {
    type: string;
  };
}

/**
 * Specifies that a Param's value should be determined by having the user select
 * from a list of pre-canned options interactively at deploy-time.
 */
export interface SelectInput<T = unknown> {
  options: Array<SelectOptions<T>>;
}

export interface SelectOptions<T = unknown> {
  label?: string;
  value: T;
}

export type ParamSpec<T extends string | number | boolean | string[]> = {
  name: string;
  default?: T | Expression<T>;
  label?: string;
  description?: string;
  type: ParamValueType;
  input?: ParamInput<T>;
};

// N.B: a WireParamSpec is just a ParamSpec with default expressions converted into a CEL literal
export type WireParamSpec<T extends string | number | boolean | string[]> = {
  name: string;
  default?: T | string;
  label?: string;
  description?: string;
  type: ParamValueType;
  input?: ParamInput<T>;
};

export type ParamOptions<T extends string | number | boolean | string[]> = Omit<
  ParamSpec<T>,
  "name" | "type"
>;

export abstract class Param<T extends string | number | boolean | string[]> extends Expression<T> {
  static type: ParamValueType = "string";

  constructor(readonly name: string, readonly options: ParamOptions<T> = {}) {
    super();
  }

  runtimeValue(): T {
    throw new Error("Not implemented");
  }

  cmp(cmp: "==" | "!=" | ">" | ">=" | "<" | "<=", rhs: T | Expression<T>) {
    return new CompareExpression<T>(cmp, this, rhs);
  }

  equals(rhs: T | Expression<T>) {
    return this.cmp("==", rhs);
  }

  notEquals(rhs: T | Expression<T>) {
    return this.cmp("!=", rhs);
  }

  greaterThan(rhs: T | Expression<T>) {
    return this.cmp(">", rhs);
  }

  greaterThanOrEqualTo(rhs: T | Expression<T>) {
    return this.cmp(">=", rhs);
  }

  lessThan(rhs: T | Expression<T>) {
    return this.cmp("<", rhs);
  }

  lessThanorEqualTo(rhs: T | Expression<T>) {
    return this.cmp("<=", rhs);
  }

  toString(): string {
    return `params.${this.name}`;
  }

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

export class SecretParam {
  static type: ParamValueType = "secret";
  name: string;

  constructor(name: string) {
    this.name = name;
  }

  runtimeValue(): string {
    return process.env[this.name] || "";
  }

  toSpec(): ParamSpec<string> {
    return {
      type: "secret",
      name: this.name,
    };
  }
}

export class StringParam extends Param<string> {
  runtimeValue(): string {
    return process.env[this.name] || "";
  }
}

/**
 * A CEL expression which represents an internal Firebase variable. This class
 * cannot be instantiated by developers, but we provide several canned instances
 * of it to make available params that will never have to be defined at
 * deployment time, and can always be read from process.env.
 * @internal
 */
export class InternalExpression extends Param<string> {
  constructor(name: string, private readonly getter: (env: NodeJS.ProcessEnv) => string) {
    super(name);
  }

  runtimeValue(): string {
    return this.getter(process.env) || "";
  }

  toSpec(): WireParamSpec<string> {
    throw new Error("An InternalExpression should never be marshalled for wire transmission.");
  }
}

export class IntParam extends Param<number> {
  static type: ParamValueType = "int";

  runtimeValue(): number {
    return parseInt(process.env[this.name] || "0", 10) || 0;
  }
}

export class FloatParam extends Param<number> {
  static type: ParamValueType = "float";

  runtimeValue(): number {
    return parseFloat(process.env[this.name] || "0") || 0;
  }
}

export class BooleanParam extends Param<boolean> {
  static type: ParamValueType = "boolean";

  runtimeValue(): boolean {
    return !!process.env[this.name] && process.env[this.name] === "true";
  }

  then<T extends string | number | boolean>(ifTrue: T | Expression<T>, ifFalse: T | Expression<T>) {
    return new TernaryExpression(this, ifTrue, ifFalse);
  }
}

export class ListParam extends Param<string[]> {
  static type: ParamValueType = "list";

  runtimeValue(): string[] {
    throw new Error("Not implemented");
  }

  toSpec(): WireParamSpec<string[]> {
    throw new Error("Not implemented");
  }
}
