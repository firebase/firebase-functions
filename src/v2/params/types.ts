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

/** @hidden */
type ParamValueType = 'string' | 'list' | 'boolean' | 'int' | 'float' | 'json';

export interface ParamSpec<T = unknown> {
  name: string;
  default?: T;
  label?: string;
  description?: string;
  valueType?: ParamValueType;
}

export type ParamOptions<T = unknown> = Omit<
  ParamSpec<T>,
  'name' | 'valueType'
>;

export class Param<T = unknown> {
  static valueType: ParamValueType = 'string';

  constructor(readonly name: string, readonly options: ParamOptions<T> = {}) {}

  get rawValue(): string | undefined {
    return process.env[this.name];
  }

  get value(): any {
    return this.rawValue || this.options.default || '';
  }

  toString() {
    return `{{params.${this.name}}}`;
  }

  toJSON() {
    return this.toString();
  }

  toSpec(): ParamSpec<string> {
    const out: ParamSpec = {
      name: this.name,
      ...this.options,
      valueType: (this.constructor as typeof Param).valueType,
    };
    if (this.options.default && typeof this.options.default !== 'string') {
      out.default = (this.options.default as
        | { toString?: () => string }
        | undefined)?.toString?.();
    }

    return out as ParamSpec<string>;
  }
}

export class StringParam extends Param<string> {
  // identical to the abstract class, just explicitly a string
}

export class IntParam extends Param<number> {
  static valueType: ParamValueType = 'int';

  get value(): number {
    const intVal = parseInt(
      this.rawValue || this.options.default?.toString() || '0',
      10
    );
    if (Number.isNaN(intVal)) {
      throw new Error(
        `unable to load param "${this.name}", value ${JSON.stringify(
          this.rawValue
        )} could not be parsed as integer`
      );
    }
    return intVal;
  }
}

export class FloatParam extends Param<number> {
  static valueType: ParamValueType = 'float';

  get value(): number {
    const floatVal = parseFloat(
      this.rawValue || this.options.default?.toString() || '0'
    );
    if (Number.isNaN(floatVal)) {
      throw new Error(
        `unable to load param "${this.name}", value ${JSON.stringify(
          this.rawValue
        )} could not be parsed as float`
      );
    }
    return floatVal;
  }
}

export class BooleanParam extends Param {
  static valueType: ParamValueType = 'boolean';

  get value(): boolean {
    const lowerVal = (
      this.rawValue ||
      this.options.default?.toString() ||
      'false'
    ).toLowerCase();
    if (
      !['true', 'y', 'yes', '1', 'false', 'n', 'no', '0'].includes(lowerVal)
    ) {
      throw new Error(
        `unable to load param "${this.name}", value ${JSON.stringify(
          this.rawValue
        )} could not be parsed as boolean`
      );
    }
    return ['true', 'y', 'yes', '1'].includes(lowerVal);
  }
}

export class ListParam extends Param<string[]> {
  static valueType: ParamValueType = 'list';

  get value(): string[] {
    return typeof this.rawValue === 'string'
      ? this.rawValue.split(/, ?/)
      : this.options.default || [];
  }

  toSpec(): ParamSpec<string> {
    const out: ParamSpec = {
      name: this.name,
      valueType: 'list',
      ...this.options,
    };
    if (this.options.default && this.options.default.length > 0) {
      out.default = this.options.default.join(',');
    }

    return out as ParamSpec<string>;
  }
}

export class JSONParam<T = any> extends Param<T> {
  static valueType: ParamValueType = 'json';

  get value(): T {
    if (this.rawValue) {
      try {
        return JSON.parse(this.rawValue!) as T;
      } catch (e) {
        throw new Error(
          `unable to load param "${this.name}", value ${this.rawValue} could not be parsed as JSON: ${e.message}`
        );
      }
    } else if (this.options?.hasOwnProperty('default')) {
      return this.options.default;
    }
    return {} as T;
  }
}
