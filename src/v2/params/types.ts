/** @hidden */
type ParamValueType = 'string' | 'list' | 'boolean' | 'int' | 'float' | 'json';

export interface ParamSpec<T = unknown> {
  default?: T;
  label?: string;
  description?: string;
  valueType?: ParamValueType;
}

export type ParamOptions<T = unknown> = Omit<ParamSpec<T>, 'valueType'>;

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
