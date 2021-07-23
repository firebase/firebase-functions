type ParamValueType = 'string' | 'list' | 'boolean' | 'int' | 'float' | 'json';

export interface ParamSpec<T = unknown> {
  source: 'env' | 'secret';
  secret?: string;
  required?: boolean;
  default?: T;
  label?: string;
  description?: string;
  valueType?: ParamValueType;
}

export type ParamOptions<T = unknown> = Omit<
  ParamSpec<T>,
  'valueType' | 'source' | 'secretRef'
>;
export type SecretParamOptions = Omit<
  ParamSpec<string>,
  'valueType' | 'source'
>;

export class Param<T = unknown> {
  name: string;
  options: ParamOptions<T>;

  static valueType: ParamValueType = 'string';

  constructor(name: string, options: ParamOptions<T> = {}) {
    this.name = name;
    this.options = options;
  }

  get rawValue(): string | undefined {
    return process.env[this.name];
  }

  get value(): any {
    const valueType = (this.constructor as typeof Param).valueType;
    switch (valueType) {
      case 'string':
        return process.env[this.name] || this.options.default || '';
      case 'int':
        return parseInt(
          process.env[this.name] || this.options.default?.toString() || '0',
          10
        );
      case 'float':
        return parseFloat(
          process.env[this.name] || this.options.default?.toString() || '0'
        );
      case 'boolean':
        return ['true', 'y', 'yes', '1'].includes(
          (
            process.env[this.name] ||
            this.options.default?.toString() ||
            ''
          ).toLowerCase()
        );
      case 'list':
        return typeof process.env[this.name] === 'string'
          ? process.env[this.name]!.split(/, ?/)
          : this.options.default || [];
      case 'json':
        if (process.env[this.name]) {
          return JSON.parse(process.env[this.name]!) as T;
        } else if (this.options?.hasOwnProperty('default')) {
          return this.options.default;
        }
        return null;
      default:
        throw new Error(`unrecognized param value type '${valueType}'`);
    }
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
      source: this.options.secret ? 'secret' : 'env',
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
}

export class FloatParam extends Param<number> {
  static valueType: ParamValueType = 'float';
}

export class BooleanParam extends Param {
  static valueType: ParamValueType = 'boolean';
}

export class ListParam extends Param<string[]> {
  static valueType: ParamValueType = 'list';

  toSpec(): ParamSpec<string> {
    const out: ParamSpec = {
      source: 'env',
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
}

export class SecretParam extends StringParam {
  toSpec(): ParamSpec<string> {
    return { ...super.toSpec(), source: 'secret' };
  }
}
