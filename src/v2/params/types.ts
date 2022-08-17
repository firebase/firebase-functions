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

import {
  Expression,
  CompareExpression,
  TernaryExpression,
} from '../expressions';

/** @hidden */
type ParamValueType =
  | 'string'
  | 'list'
  | 'boolean'
  | 'int'
  | 'float'
  | 'secret';

type HasAtMostOneInput<T> =
  | {}
  | { textInput: TextInput<T> }
  | { selectInput: SelectInput<T> }
  | { resourceInput: ResourceInput };

/**
 * Specifies that a Param's value should be determined by prompting the user
 * to type it in interactively at deploy-time. Input that does not match the
 * provided validationRegex, if present, will be retried.
 */
export interface TextInput<T = unknown> {
  example?: string;
  validationRegex?: string;
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
  select: Array<SelectOptions<T>>;
}

export interface SelectOptions<T = unknown> {
  label?: string;
  value: T;
}

export type ParamSpec<T = unknown> = {
  name: string;
  default?: T;
  label?: string;
  description?: string;
  type: ParamValueType;
} & HasAtMostOneInput<T>;

export type ParamOptions<T = unknown> = Omit<ParamSpec<T>, 'name' | 'type'>;

export abstract class Param<
  T extends string | number | boolean | string[]
> extends Expression<T> {
  static type: ParamValueType = 'string';

  constructor(readonly name: string, readonly options: ParamOptions<T> = {}) {
    super();
  }

  value(): T {
    throw new Error('Not implemented');
  }

  cmp(cmp: '==' | '>' | '>=' | '<' | '<=', rhs: T) {
    return new CompareExpression<T>(cmp, this, rhs);
  }

  equals(rhs: T) {
    return this.cmp('==', rhs);
  }

  toString(): string {
    return `params.${this.name}`;
  }

  toSpec(): ParamSpec<T> {
    const out: ParamSpec = {
      name: this.name,
      ...this.options,
      type: (this.constructor as typeof Param).type,
    };

    return out as ParamSpec<T>;
  }
}

export class SecretParam {
  name: string;
  static type: ParamValueType = 'secret';

  constructor(name: string) {
    this.name = name;
  }

  value(): string {
    return process.env[this.name] || '';
  }

  toSpec(): ParamSpec<string> {
    return {
      type: 'secret',
      name: this.name,
    };
  }
}

export class StringParam extends Param<string> {
  value(): string {
    return process.env[this.name] || '';
  }
}

export class IntParam extends Param<number> {
  static type: ParamValueType = 'int';

  value(): number {
    return parseInt(process.env[this.name] || '0', 10) || 0;
  }
}

export class FloatParam extends Param<number> {
  static type: ParamValueType = 'float';

  value(): number {
    return parseFloat(process.env[this.name] || '0') || 0;
  }
}

export class BooleanParam extends Param<boolean> {
  static type: ParamValueType = 'boolean';

  value(): boolean {
    return !!process.env[this.name];
  }

  then<T extends string | number | boolean>(ifTrue: T, ifFalse: T) {
    return new TernaryExpression(this, ifTrue, ifFalse);
  }
}

export class ListParam extends Param<string[]> {
  static type: ParamValueType = 'list';

  value(): string[] {
    throw new Error('Not implemented');
  }

  toSpec(): ParamSpec<string[]> {
    const out: ParamSpec = {
      name: this.name,
      type: 'list',
      ...this.options,
    };
    if (this.options.default && this.options.default.length > 0) {
      out.default = this.options.default.join(',');
    }

    return out as ParamSpec<string[]>;
  }
}
